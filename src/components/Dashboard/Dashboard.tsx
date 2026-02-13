import EnergyGauge from './EnergyGauge';
import QuickStats from './QuickStats';
import TaskQueue from './TaskQueue';
import SuggestedTasks from './SuggestedTasks';
import PeakHoursWidget from './PeakHoursWidget';
import Card from '@/components/UI/Card';
import { useFlowStateStore } from '@/stores/flowstate-store';
import { getEnergyColor } from '@/utils/constants';
import { Clock, Brain, Target } from 'lucide-react';

export default function Dashboard() {
    const cs = useFlowStateStore((s) => s.cognitiveState);
    const baseline = useFlowStateStore((s) => s.baseline);

    return (
        <div className="space-y-6">
            {/* Hero Area: Energy + Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Energy Gauge */}
                <Card className="lg:col-span-1 flex flex-col items-center justify-center py-8">
                    <EnergyGauge />

                    {/* Mini insight */}
                    <div className="mt-5 w-full px-4">
                        <div className="flex items-center justify-between text-xs text-dark-400 bg-dark-900/50 rounded-lg px-3 py-2">
                            <span className="flex items-center gap-1.5">
                                <Clock size={12} />
                                Session: {cs.sessionDuration}m
                            </span>
                            <span className="flex items-center gap-1.5">
                                <Brain size={12} />
                                Velocity: {(cs.workVelocity * 100).toFixed(0)}%
                            </span>
                        </div>
                    </div>
                </Card>

                {/* Quick Stats */}
                <div className="lg:col-span-2">
                    <QuickStats />

                    {/* Peak Hours Insight */}
                    <PeakHoursWidget />
                </div>
            </div>

            {/* Tasks Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <TaskQueue />
                <SuggestedTasks />
            </div>

            {/* Tip / Insight Card */}
            <Card padding="sm">
                <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-purple-500/15">
                        <Brain size={16} className="text-purple-400" />
                    </div>
                    <div>
                        <p className="text-sm text-dark-200">
                            {cs.energyScore >= 80
                                ? "🔥 You're at peak energy! Tackle your most challenging tasks now."
                                : cs.energyScore >= 60
                                    ? '✅ Good energy levels. Maintain your pace with focused work.'
                                    : cs.energyScore >= 40
                                        ? '⚠️ Energy dipping. Consider a break or switch to easier tasks.'
                                        : '🔴 Energy critical. Take a break — your brain needs rest.'}
                        </p>
                        <p className="text-xs text-dark-500 mt-1">
                            Powered by your activity patterns • {cs.isInFlowState ? '✨ Flow State detected' : 'ML model training in progress...'}
                        </p>
                    </div>
                </div>
            </Card>
        </div>
    );
}
