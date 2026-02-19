import {
    Keyboard,
    AlertTriangle,
    Timer,
    Coffee,
    TrendingUp,
    Zap,
} from 'lucide-react';
import Card from '@/components/UI/Card';
import { useFlowStateStore } from '@/stores/flowstate-store';
import { formatDuration } from '@/utils/formatters';

export default function QuickStats() {
    const cs = useFlowStateStore((s) => s.cognitiveState);
    const tasks = useFlowStateStore((s) => s.tasks);

    const completedToday = tasks.filter(
        (t) => t.status === 'completed' && t.completedAt &&
            new Date(t.completedAt).toDateString() === new Date().toDateString()
    ).length;

    const stats = [
        {
            label: 'Typing Speed',
            value: `${Math.round(cs.typingSpeed)}`,
            unit: 'KPM',
            icon: Keyboard,
            color: '#3B82F6',
        },
        {
            label: 'Error Rate',
            value: `${cs.errorRate.toFixed(1)}`,
            unit: '%',
            icon: AlertTriangle,
            color: cs.errorRate > 5 ? '#EF4444' : '#10B981',
        },
        {
            label: 'Since Break',
            value: formatDuration(cs.timeSinceLastBreak),
            unit: '',
            icon: Coffee,
            color: cs.timeSinceLastBreak > 60 ? '#F59E0B' : '#10B981',
        },
        {
            label: 'Work Velocity',
            value: `${(cs.workVelocity * 100).toFixed(0)}`,
            unit: '%',
            icon: TrendingUp,
            color: '#8B5CF6',
        },
        {
            label: 'Tasks Done',
            value: `${completedToday}`,
            unit: 'today',
            icon: Zap,
            color: '#F59E0B',
        },
        {
            label: 'Burnout Risk',
            value: `${Math.round(cs.burnoutRisk)}`,
            unit: '%',
            icon: Timer,
            color: cs.burnoutRisk > 60 ? '#EF4444' : '#10B981',
        },
    ];

    return (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {stats.map((stat) => {
                const Icon = stat.icon;
                return (
                    <Card key={stat.label} padding="sm" hover>
                        <div className="flex items-start gap-3">
                            <div
                                className="p-2 rounded-lg"
                                style={{ backgroundColor: stat.color + '15' }}
                            >
                                <Icon size={16} style={{ color: stat.color }} />
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs text-dark-400 truncate">{stat.label}</p>
                                <div className="flex items-baseline gap-1 mt-0.5">
                                    <span className="text-lg font-bold text-dark-100">{stat.value}</span>
                                    {stat.unit && (
                                        <span className="text-xs text-dark-500">{stat.unit}</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </Card>
                );
            })}
        </div>
    );
}
