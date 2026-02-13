import { useEffect } from 'react';
import Card from '@/components/UI/Card';
import { useFlowStateStore } from '@/stores/flowstate-store';
import { Target, Zap, TrendingUp, Sun } from 'lucide-react';

export default function PeakHoursWidget() {
    const peakAnalysis = useFlowStateStore((s) => s.peakAnalysis);
    const fetchPeakHours = useFlowStateStore((s) => s.fetchPeakHours);
    const baseline = useFlowStateStore((s) => s.baseline);

    useEffect(() => {
        fetchPeakHours();
    }, [fetchPeakHours]);

    // Group peaks into windows
    const windows = [];
    if (peakAnalysis.length > 0) {
        let currentWindow = null;

        // Sort by hour just in case
        const sorted = [...peakAnalysis].sort((a, b) => a.hourOfDay - b.hourOfDay);

        for (const p of sorted) {
            if (!p.isPeak) continue;

            if (currentWindow && p.windowGroupId === currentWindow.groupId) {
                // Extend window
                currentWindow.endHour = p.hourOfDay + 1;
                currentWindow.score += p.peakScore;
                currentWindow.count++;
            } else {
                // New window
                if (currentWindow) windows.push(currentWindow);
                currentWindow = {
                    groupId: p.windowGroupId,
                    startHour: p.hourOfDay,
                    endHour: p.hourOfDay + 1,
                    score: p.peakScore,
                    count: 1,
                    context: p.context
                };
            }
        }
        if (currentWindow) windows.push(currentWindow);
    } else if (baseline.peakHours && baseline.peakHours.length > 0) {
        // Fallback to baseline simple numbers if no rich analysis
        // This handles cases where ML service hasn't returned rich data yet
        // We'll just group adjacent hours
        const sorted = [...baseline.peakHours].sort((a, b) => a - b);
        let currentStart = sorted[0];
        let prev = sorted[0];

        for (let i = 1; i < sorted.length; i++) {
            if (sorted[i] !== prev + 1) {
                windows.push({ startHour: currentStart, endHour: prev + 1, score: 80, count: 1 });
                currentStart = sorted[i];
            }
            prev = sorted[i];
        }
        windows.push({ startHour: currentStart, endHour: prev + 1, score: 80, count: 1 });
    }

    if (windows.length === 0) {
        return (
            <Card padding="sm" className="mt-3">
                <div className="flex items-center gap-2 text-xs text-dark-400">
                    <Target size={14} className="text-dark-600" />
                    <span>Calibrating peak performance windows...</span>
                </div>
            </Card>
        );
    }

    return (
        <Card padding="sm" className="mt-3">
            <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-amber-400 font-medium">
                        <Target size={14} />
                        <span>Peak Focus Windows</span>
                    </div>
                </div>

                <div className="space-y-2">
                    {windows.map((w, idx) => {
                        const start = w.startHour;
                        const end = w.endHour;
                        const format = (h: number) => {
                            const ampm = h >= 12 && h < 24 ? 'PM' : 'AM';
                            const h12 = h % 12 || 12;
                            return `${h12}${ampm}`;
                        };

                        const avgScore = w.score / w.count;
                        const intensity = avgScore >= 90 ? 'High' : avgScore >= 80 ? 'Med' : 'Good';

                        return (
                            <div key={idx} className="flex items-center justify-between p-2 rounded bg-dark-800/50 border border-dark-700/50">
                                <div className="flex items-center gap-3">
                                    <div className="p-1.5 rounded-full bg-amber-500/10 text-amber-500">
                                        <Zap size={12} fill="currentColor" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium text-dark-200">
                                            {format(start)} – {format(end)}
                                        </span>
                                        <span className="text-[10px] text-dark-500 uppercase tracking-wide">
                                            {intensity} Intensity
                                        </span>
                                    </div>
                                </div>

                                {w.score && (
                                    <div className="text-xs font-mono text-dark-400">
                                        {avgScore.toFixed(0)}
                                        <span className="text-[10px] ml-0.5">%</span>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </Card>
    );
}
