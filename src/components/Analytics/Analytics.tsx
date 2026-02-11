import { useState, useMemo } from 'react';
import { BarChart3, TrendingUp, Clock, Activity, Zap, Calendar } from 'lucide-react';
import Card from '@/components/UI/Card';
import { useFlowStateStore } from '@/stores/flowstate-store';
import { getEnergyColor, ENERGY_COLORS } from '@/utils/constants';
import { formatDuration } from '@/utils/formatters';

// Simple bar chart component (no external dep needed for this view)
function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
    const pct = max > 0 ? (value / max) * 100 : 0;
    return (
        <div className="h-16 flex items-end">
            <div
                className="w-full rounded-t-sm transition-all duration-500"
                style={{ height: `${pct}%`, backgroundColor: color, minHeight: value > 0 ? '4px' : 0 }}
            />
        </div>
    );
}

export default function Analytics() {
    const cogState = useFlowStateStore((s) => s.cognitiveState);
    const tasks = useFlowStateStore((s) => s.tasks);
    const baseline = useFlowStateStore((s) => s.baseline);
    const [view, setView] = useState<'today' | 'week'>('today');

    // Generate mock hourly data based on circadian rhythm for demo
    const hourlyData = useMemo(() => {
        const now = new Date().getHours();
        return Array.from({ length: 24 }, (_, h) => {
            const circadian = Math.sin((h - 6) * Math.PI / 12) * 30 + 60;
            const noise = Math.random() * 10 - 5;
            const energy = h <= now ? Math.max(0, Math.min(100, circadian + noise)) : 0;
            return { hour: h, energy: Math.round(energy) };
        });
    }, []);

    // Generate mock weekly data
    const weeklyData = useMemo(() => {
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const today = new Date().getDay();
        return days.map((day, i) => ({
            day,
            energy: i < today ? Math.round(55 + Math.random() * 30) : 0,
            tasks: i < today ? Math.round(3 + Math.random() * 5) : 0,
        }));
    }, []);

    const maxEnergy = Math.max(...hourlyData.map((d) => d.energy), 1);
    const maxWeeklyEnergy = Math.max(...weeklyData.map((d) => d.energy), 1);

    const completedTasks = tasks.filter((t) => t.status === 'completed').length;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-dark-100">Analytics</h2>
                    <p className="text-sm text-dark-400 mt-1">Track your productivity patterns and energy trends</p>
                </div>
                <div className="flex gap-1 bg-dark-800 rounded-lg p-0.5">
                    {(['today', 'week'] as const).map((v) => (
                        <button
                            key={v}
                            onClick={() => setView(v)}
                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${view === v ? 'bg-dark-700 text-dark-100 shadow-sm' : 'text-dark-400 hover:text-dark-200'
                                }`}
                        >
                            {v === 'today' ? 'Today' : 'This Week'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <Card padding="sm">
                    <div className="flex items-center gap-2 mb-1">
                        <Zap size={14} className="text-blue-400" />
                        <span className="text-xs text-dark-400">Avg Energy</span>
                    </div>
                    <p className="text-2xl font-bold text-dark-100">
                        {Math.round(cogState.energyScore)}
                    </p>
                </Card>
                <Card padding="sm">
                    <div className="flex items-center gap-2 mb-1">
                        <Activity size={14} className="text-green-400" />
                        <span className="text-xs text-dark-400">Tasks Done</span>
                    </div>
                    <p className="text-2xl font-bold text-dark-100">{completedTasks}</p>
                </Card>
                <Card padding="sm">
                    <div className="flex items-center gap-2 mb-1">
                        <Clock size={14} className="text-amber-400" />
                        <span className="text-xs text-dark-400">Focus Time</span>
                    </div>
                    <p className="text-2xl font-bold text-dark-100">{formatDuration(cogState.sessionDuration)}</p>
                </Card>
                <Card padding="sm">
                    <div className="flex items-center gap-2 mb-1">
                        <TrendingUp size={14} className="text-purple-400" />
                        <span className="text-xs text-dark-400">Velocity</span>
                    </div>
                    <p className="text-2xl font-bold text-dark-100">{(cogState.workVelocity * 100).toFixed(0)}%</p>
                </Card>
            </div>

            {/* Energy Chart */}
            <Card>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-dark-100 flex items-center gap-2">
                        <BarChart3 size={16} className="text-blue-400" />
                        {view === 'today' ? 'Hourly Energy' : 'Daily Energy'}
                    </h3>
                    <div className="flex items-center gap-3 text-xs text-dark-500">
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: ENERGY_COLORS.peak }} /> Peak</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: ENERGY_COLORS.good }} /> Good</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: ENERGY_COLORS.low }} /> Low</span>
                    </div>
                </div>

                {view === 'today' ? (
                    <div>
                        <div className="grid grid-cols-24 gap-0.5" style={{ gridTemplateColumns: 'repeat(24, 1fr)' }}>
                            {hourlyData.map((d) => (
                                <MiniBar key={d.hour} value={d.energy} max={maxEnergy} color={getEnergyColor(d.energy)} />
                            ))}
                        </div>
                        <div className="grid grid-cols-24 gap-0.5 mt-1" style={{ gridTemplateColumns: 'repeat(24, 1fr)' }}>
                            {hourlyData.map((d) => (
                                <span key={d.hour} className="text-[8px] text-dark-600 text-center">
                                    {d.hour % 4 === 0 ? `${d.hour}` : ''}
                                </span>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div>
                        <div className="grid grid-cols-7 gap-2">
                            {weeklyData.map((d) => (
                                <div key={d.day} className="text-center">
                                    <MiniBar value={d.energy} max={maxWeeklyEnergy} color={getEnergyColor(d.energy)} />
                                    <span className="text-xs text-dark-500 mt-1 block">{d.day}</span>
                                    <span className="text-[10px] text-dark-600">{d.energy || '—'}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </Card>

            {/* Peak Hours */}
            <Card>
                <h3 className="font-semibold text-dark-100 flex items-center gap-2 mb-4">
                    <Calendar size={16} className="text-amber-400" />
                    Your Peak Hours
                </h3>
                {baseline.peakHours && baseline.peakHours.length > 0 ? (
                    <div className="grid grid-cols-24 gap-0.5" style={{ gridTemplateColumns: 'repeat(24, 1fr)' }}>
                        {Array.from({ length: 24 }, (_, h) => {
                            const isPeak = baseline.peakHours.includes(h);
                            return (
                                <div key={h} className="text-center">
                                    <div
                                        className={`h-8 rounded-sm transition-all ${isPeak ? 'bg-amber-500/30 border border-amber-500/40' : 'bg-dark-800'}`}
                                    />
                                    <span className="text-[8px] text-dark-600 mt-0.5 block">
                                        {h % 4 === 0 ? `${h}` : ''}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <p className="text-sm text-dark-500">Peak hours will be calculated after calibration week.</p>
                )}
            </Card>
        </div>
    );
}
