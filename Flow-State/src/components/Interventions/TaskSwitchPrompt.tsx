import { ArrowRightLeft, X } from 'lucide-react';
import Card from '@/components/UI/Card';
import { useFlowStateStore } from '@/stores/flowstate-store';
import { getComplexityColor } from '@/utils/formatters';

interface TaskSwitchPromptProps {
    onDismiss?: () => void;
}

export default function TaskSwitchPrompt({ onDismiss }: TaskSwitchPromptProps) {
    const tasks = useFlowStateStore((s) => s.tasks);
    const startTask = useFlowStateStore((s) => s.startTask);

    const easyTasks = tasks
        .filter((t) => t.status === 'pending' && (t.complexity === 'low' || t.complexity === 'medium'))
        .slice(0, 3);

    if (easyTasks.length === 0) return null;

    return (
        <Card className="border-orange-500/20">
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-orange-500/15">
                        <ArrowRightLeft size={20} className="text-orange-400" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-dark-100">Switch Task?</h3>
                        <p className="text-xs text-dark-400">High error rate detected. Try something lighter.</p>
                    </div>
                </div>
                {onDismiss && (
                    <button onClick={onDismiss} className="p-1.5 rounded-lg hover:bg-dark-700 text-dark-500">
                        <X size={16} />
                    </button>
                )}
            </div>

            <div className="space-y-2">
                {easyTasks.map((task) => (
                    <button
                        key={task.id}
                        onClick={() => { startTask(task.id); onDismiss?.(); }}
                        className="w-full p-3 rounded-lg border border-dark-600 hover:border-orange-500/30 hover:bg-dark-800/50 transition-all flex items-center gap-3 text-left"
                    >
                        <span
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: getComplexityColor(task.complexity) }}
                        />
                        <span className="text-sm text-dark-200 truncate">{task.title}</span>
                        <span
                            className="text-[10px] px-1.5 py-0.5 rounded ml-auto flex-shrink-0"
                            style={{ color: getComplexityColor(task.complexity), backgroundColor: getComplexityColor(task.complexity) + '15' }}
                        >
                            {task.complexity}
                        </span>
                    </button>
                ))}
            </div>
        </Card>
    );
}
