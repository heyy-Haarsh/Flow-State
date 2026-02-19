import { Lightbulb, ArrowRight, Sparkles } from 'lucide-react';
import Card from '@/components/UI/Card';
import { useFlowStateStore } from '@/stores/flowstate-store';
import { useTasks } from '@/hooks/useTasks';
import { getComplexityColor } from '@/utils/formatters';

export default function SuggestedTasks() {
    const energyScore = useFlowStateStore((s) => s.cognitiveState.energyScore);
    const startTask = useFlowStateStore((s) => s.startTask);
    const { getSuggestedTasks } = useTasks();

    const suggested = getSuggestedTasks(energyScore).slice(0, 3);

    if (suggested.length === 0) return null;

    const energyLabel = energyScore >= 80 ? 'Peak' : energyScore >= 60 ? 'Good' : energyScore >= 40 ? 'Low' : 'Critical';

    return (
        <Card padding="none">
            <div className="px-5 py-4 border-b border-dark-700/30">
                <div className="flex items-center gap-2">
                    <Sparkles size={16} className="text-amber-400" />
                    <h3 className="font-semibold text-dark-100">Suggested for You</h3>
                </div>
                <p className="text-xs text-dark-500 mt-1">
                    Based on your {energyLabel.toLowerCase()} energy level ({Math.round(energyScore)})
                </p>
            </div>

            <div className="divide-y divide-dark-700/20">
                {suggested.map((task) => (
                    <button
                        key={task.id}
                        onClick={() => startTask(task.id)}
                        className="w-full px-5 py-3 flex items-center justify-between hover:bg-dark-800/40 transition-colors text-left group"
                    >
                        <div className="flex items-center gap-3 min-w-0">
                            <div
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                                style={{
                                    backgroundColor: getComplexityColor(task.complexity) + '15',
                                    color: getComplexityColor(task.complexity),
                                }}
                            >
                                {task.complexity[0].toUpperCase()}
                            </div>
                            <div className="min-w-0">
                                <p className="text-sm text-dark-200 truncate">{task.title}</p>
                                {task.estimatedDuration && (
                                    <p className="text-[10px] text-dark-500">~{task.estimatedDuration}m</p>
                                )}
                            </div>
                        </div>
                        <ArrowRight size={14} className="text-dark-600 group-hover:text-blue-400 transition-colors flex-shrink-0" />
                    </button>
                ))}
            </div>
        </Card>
    );
}
