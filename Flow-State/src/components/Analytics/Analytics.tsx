import { useState, useMemo, useEffect } from 'react';
import { BarChart3, TrendingUp, Clock, Activity, Zap, Calendar } from 'lucide-react';
import Card from '@/components/UI/Card';
import { useFlowStateStore } from '@/stores/flowstate-store';
import { getEnergyColor, ENERGY_COLORS } from '@/utils/constants';
import { formatDuration } from '@/utils/formatters';
import BurnoutRisk from './BurnoutRisk';

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
    const [weeklyFocusData, setWeeklyFocusData] = useState<any[]>([]);
    const [burnoutHeatmapData, setBurnoutHeatmapData] = useState<any[]>([]);

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

    // Load weekly focus hours heatmap data
    useEffect(() => {
        if (window.electron?.getWeeklyFocusHours) {
            window.electron.getWeeklyFocusHours().then((data: any) => {
                setWeeklyFocusData(data || []);
            }).catch((err: any) => {
                console.error('[Analytics] Failed to load weekly focus hours:', err);
            });
        }

        // Load burnout heatmap data
        if (window.electron?.getWeeklyBurnoutHeatmap) {
            window.electron.getWeeklyBurnoutHeatmap().then((data: any) => {
                setBurnoutHeatmapData(data || []);
            }).catch((err: any) => {
                console.error('[Analytics] Failed to load burnout heatmap:', err);
            });
        }
    }, []);

    // Get color intensity for heatmap based on focus minutes
    const getHeatmapColor = (minutes: number) => {
        if (minutes === 0) return 'rgb(30, 41, 59)'; // dark-800 - no activity
        if (minutes <= 15) return 'rgba(59, 130, 246, 0.25)'; // very light blue
        if (minutes <= 25) return 'rgba(59, 130, 246, 0.4)'; // light blue
        if (minutes <= 35) return 'rgba(59, 130, 246, 0.55)'; // medium-light blue
        if (minutes <= 45) return 'rgba(59, 130, 246, 0.7)'; // medium blue
        if (minutes <= 55) return 'rgba(59, 130, 246, 0.85)'; // dark blue
        return 'rgb(59, 130, 246)'; // darkest blue - 55-60 min
    };

    // Group heatmap data by hour
    const heatmapByHour = useMemo(() => {
        const result: any = {};
        weeklyFocusData.forEach((d: any) => {
            if (!result[d.hour]) result[d.hour] = [];
            result[d.hour].push(d);
        });
        return result;
    }, [weeklyFocusData]);

    // Group burnout heatmap data by hour
    const burnoutByHour = useMemo(() => {
        const result: any = {};
        burnoutHeatmapData.forEach((d: any) => {
            if (!result[d.hour]) result[d.hour] = [];
            result[d.hour].push(d);
        });
        return result;
    }, [burnoutHeatmapData]);

    // Get color for burnout risk (red gradient)
    const getBurnoutColor = (risk: number) => {
        if (risk === 0) return 'rgb(30, 41, 59)'; // dark-800 - no risk
        if (risk <= 10) return 'rgba(252, 165, 165, 0.3)'; // very light pink-red
        if (risk <= 25) return 'rgba(248, 113, 113, 0.4)'; // light coral
        if (risk <= 40) return 'rgba(239, 68, 68, 0.5)'; // medium-light red
        if (risk <= 55) return 'rgba(239, 68, 68, 0.65)'; // medium red
        if (risk <= 70) return 'rgba(220, 38, 38, 0.8)'; // dark red
        if (risk <= 85) return 'rgba(185, 28, 28, 0.9)'; // darker red
        return 'rgb(153, 27, 27)'; // darkest burgundy - critical
    };

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
                        {view === 'today' ? 'Hourly Energy' : 'Weekly Focus Heatmap'}
                    </h3>
                    {view === 'today' ? (
                        <div className="flex items-center gap-3 text-xs text-dark-500">
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: ENERGY_COLORS.peak }} /> Peak</span>
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: ENERGY_COLORS.good }} /> Good</span>
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: ENERGY_COLORS.low }} /> Low</span>
                        </div>
                    ) : (
                        <div className="text-xs text-dark-500">
                            Focus patterns across the week
                        </div>
                    )}
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
                    <div className="relative">
                        {/* Heatmap for Weekly Focus Hours */}
                        {weeklyFocusData.length > 0 && (
                            <div className="overflow-x-auto">
                                <div className="inline-block min-w-full">
                                    {/* Days header */}
                                    <div className="flex mb-2">
                                        <div className="w-12 flex-shrink-0" /> {/* Spacer for hour labels */}
                                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                                            <div key={day} className="flex-1 text-center text-xs font-medium text-dark-300 min-w-[40px]">
                                                {day}
                                            </div>
                                        ))}
                                    </div>

                                    {/* Heatmap grid */}
                                    <div className="space-y-1">
                                        {Array.from({ length: 24 }, (_, hour) => (
                                            <div key={hour} className="flex items-center gap-1">
                                                {/* Hour label */}
                                                <div className="w-12 flex-shrink-0 text-right pr-2">
                                                    <span className="text-[10px] text-dark-500">
                                                        {hour.toString().padStart(2, '0')}:00
                                                    </span>
                                                </div>

                                                {/* Day cells */}
                                                {heatmapByHour[hour]?.map((cell: any, i: number) => (
                                                    <div
                                                        key={i}
                                                        className="flex-1 h-4 rounded-sm min-w-[40px] group relative cursor-pointer transition-transform hover:scale-110"
                                                        style={{ backgroundColor: getHeatmapColor(cell.minutes) }}
                                                        title={`${cell.day} ${hour}:00 - ${cell.minutes.toFixed(0)} min${cell.isDummy ? ' (demo)' : ''}`}
                                                    >
                                                        {/* Tooltip on hover */}
                                                        <div className="invisible group-hover:visible absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 bg-dark-900 text-dark-100 text-[10px] rounded shadow-lg whitespace-nowrap z-10 pointer-events-none">
                                                            {cell.minutes > 0 ? `${cell.minutes.toFixed(0)}m` : 'No activity'}
                                                        </div>
                                                    </div>
                                                )) || Array.from({ length: 7 }, (_, i) => (
                                                    <div key={i} className="flex-1 h-4 rounded-sm bg-dark-800 min-w-[40px]" />
                                                ))}
                                            </div>
                                        ))}
                                    </div>

                                    {/* Legend */}
                                    <div className="flex items-center justify-center gap-2 mt-4 text-xs text-dark-500">
                                        <span>0m</span>
                                        <div className="flex gap-1">
                                            <div className="w-5 h-4 rounded-sm" style={{ backgroundColor: 'rgb(30, 41, 59)' }} title="0 min" />
                                            <div className="w-5 h-4 rounded-sm" style={{ backgroundColor: 'rgba(59, 130, 246, 0.25)' }} title="1-15 min" />
                                            <div className="w-5 h-4 rounded-sm" style={{ backgroundColor: 'rgba(59, 130, 246, 0.4)' }} title="16-25 min" />
                                            <div className="w-5 h-4 rounded-sm" style={{ backgroundColor: 'rgba(59, 130, 246, 0.55)' }} title="26-35 min" />
                                            <div className="w-5 h-4 rounded-sm" style={{ backgroundColor: 'rgba(59, 130, 246, 0.7)' }} title="36-45 min" />
                                            <div className="w-5 h-4 rounded-sm" style={{ backgroundColor: 'rgba(59, 130, 246, 0.85)' }} title="46-55 min" />
                                            <div className="w-5 h-4 rounded-sm" style={{ backgroundColor: 'rgb(59, 130, 246)' }} title="56-60 min" />
                                        </div>
                                        <span>60m</span>
                                        {weeklyFocusData[0]?.isDummy && (
                                            <span className="ml-3 text-[10px] text-amber-400">(Demo Data)</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </Card>

            {/* Burnout Risk Assessment */}
            <BurnoutRisk />

            {/* Burnout Risk Heatmap - Weekly View Only */}
            {view === 'week' && (
                <Card>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-dark-100 flex items-center gap-2">
                            <Activity size={16} className="text-red-400" />
                            Weekly Burnout Risk Heatmap
                        </h3>
                        <div className="text-xs text-dark-500">
                            Stress patterns across the week
                        </div>
                    </div>

                    {burnoutHeatmapData.length > 0 && (
                        <div className="overflow-x-auto">
                            <div className="inline-block min-w-full">
                                {/* Days header */}
                                <div className="flex mb-2">
                                    <div className="w-12 flex-shrink-0" />
                                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                                        <div key={day} className="flex-1 text-center text-xs font-medium text-dark-300 min-w-[40px]">
                                            {day}
                                        </div>
                                    ))}
                                </div>

                                {/* Heatmap grid */}
                                <div className="space-y-1">
                                    {Array.from({ length: 24 }, (_, hour) => (
                                        <div key={hour} className="flex items-center gap-1">
                                            {/* Hour label */}
                                            <div className="w-12 flex-shrink-0 text-right pr-2">
                                                <span className="text-[10px] text-dark-500">
                                                    {hour.toString().padStart(2, '0')}:00
                                                </span>
                                            </div>

                                            {/* Day cells */}
                                            {burnoutByHour[hour]?.map((cell: any, i: number) => (
                                                <div
                                                    key={i}
                                                    className="flex-1 h-4 rounded-sm min-w-[40px] group relative cursor-pointer transition-transform hover:scale-110"
                                                    style={{ backgroundColor: getBurnoutColor(cell.risk) }}
                                                    title={`${cell.day} ${hour}:00 - Risk: ${cell.risk}%${cell.isDummy ? ' (demo)' : ''}`}
                                                >
                                                    {/* Tooltip on hover */}
                                                    <div className="invisible group-hover:visible absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 bg-dark-900 text-dark-100 text-[10px] rounded shadow-lg whitespace-nowrap z-10 pointer-events-none">
                                                        {cell.risk > 0 ? `${cell.risk}% risk` : 'No risk'}
                                                    </div>
                                                </div>
                                            )) || Array.from({ length: 7 }, (_, i) => (
                                                <div key={i} className="flex-1 h-4 rounded-sm bg-dark-800 min-w-[40px]" />
                                            ))}
                                        </div>
                                    ))}
                                </div>

                                {/* Legend */}
                                <div className="flex items-center justify-center gap-2 mt-4 text-xs text-dark-500">
                                    <span>Low</span>
                                    <div className="flex gap-1">
                                        <div className="w-5 h-4 rounded-sm" style={{ backgroundColor: 'rgb(30, 41, 59)' }} title="0%" />
                                        <div className="w-5 h-4 rounded-sm" style={{ backgroundColor: 'rgba(252, 165, 165, 0.3)' }} title="1-10%" />
                                        <div className="w-5 h-4 rounded-sm" style={{ backgroundColor: 'rgba(248, 113, 113, 0.4)' }} title="11-25%" />
                                        <div className="w-5 h-4 rounded-sm" style={{ backgroundColor: 'rgba(239, 68, 68, 0.5)' }} title="26-40%" />
                                        <div className="w-5 h-4 rounded-sm" style={{ backgroundColor: 'rgba(239, 68, 68, 0.65)' }} title="41-55%" />
                                        <div className="w-5 h-4 rounded-sm" style={{ backgroundColor: 'rgba(220, 38, 38, 0.8)' }} title="56-70%" />
                                        <div className="w-5 h-4 rounded-sm" style={{ backgroundColor: 'rgba(185, 28, 28, 0.9)' }} title="71-85%" />
                                        <div className="w-5 h-4 rounded-sm" style={{ backgroundColor: 'rgb(153, 27, 27)' }} title="86-100%" />
                                    </div>
                                    <span>Critical</span>
                                    {burnoutHeatmapData[0]?.isDummy && (
                                        <span className="ml-3 text-[10px] text-amber-400">(Demo Data)</span>
                                    )}
                                </div>

                                {/* Insights */}
                                <div className="mt-3 p-3 bg-red-500/5 border border-red-500/20 rounded-lg">
                                    <p className="text-xs text-red-400">
                                        <strong>⚠️ Warning:</strong> Dark red blocks indicate high burnout risk.
                                        Late-night work and weekend activity suggest unhealthy work patterns.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </Card>
            )}

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
