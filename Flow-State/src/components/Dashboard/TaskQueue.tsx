import { Play, Check, Clock, ArrowRight } from 'lucide-react';
import Card from '@/components/UI/Card';
import Button from '@/components/UI/Button';
import { useFlowStateStore } from '@/stores/flowstate-store';
import { getComplexityColor } from '@/utils/formatters';

export default function TaskQueue() {
    const tasks = useFlowStateStore((s) => s.tasks);
    const startTask = useFlowStateStore((s) => s.startTask);
    const completeTask = useFlowStateStore((s) => s.completeTask);

    const activeTask = tasks.find((t) => t.status === 'in_progress');
    const pendingTasks = tasks.filter((t) => t.status === 'pending').slice(0, 5);
    const completedToday = tasks.filter(
        (t) => t.status === 'completed' && t.completedAt &&
            new Date(t.completedAt).toDateString() === new Date().toDateString()
    );

    return (
        <Card padding="none">
            {/* Header */}
            <div className="px-5 py-4 border-b border-dark-700/30">
                <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-dark-100">Tasks</h3>
                    <span className="text-xs text-dark-500">
                        {completedToday.length} / {tasks.length} done
                    </span>
                </div>
            </div>

            {/* Active Task */}
            {activeTask && (
                <div className="px-5 py-3 bg-blue-600/8 border-b border-dark-700/30">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                            <div className="min-w-0">
                                <p className="text-sm font-medium text-dark-100 truncate">{activeTask.title}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <span
                                        className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                                        style={{
                                            color: getComplexityColor(activeTask.complexity),
                                            backgroundColor: getComplexityColor(activeTask.complexity) + '15',
                                        }}
                                    >
                                        {activeTask.complexity}
                                    </span>
                                    {activeTask.estimatedDuration && (
                                        <span className="text-[10px] text-dark-500 flex items-center gap-1">
                                            <Clock size={10} /> {activeTask.estimatedDuration}m
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                        <Button
                            size="sm"
                            variant="primary"
                            onClick={() => completeTask(activeTask.id)}
                            icon={<Check size={14} />}
                        >
                            Done
                        </Button>
                    </div>
                </div>
            )}

            {/* Pending Tasks */}
            <div className="divide-y divide-dark-700/20">
                {pendingTasks.length === 0 && !activeTask && (
                    <div className="px-5 py-8 text-center">
                        <p className="text-dark-500 text-sm">No tasks yet</p>
                        <p className="text-dark-600 text-xs mt-1">Add tasks in the Tasks tab</p>
                    </div>
                )}

                {pendingTasks.map((task) => (
                    <div
                        key={task.id}
                        className="px-5 py-3 flex items-center justify-between hover:bg-dark-800/40 transition-colors group"
                    >
                        <div className="flex items-center gap-3 min-w-0">
                            <div
                                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                style={{ backgroundColor: getComplexityColor(task.complexity) }}
                            />
                            <span className="text-sm text-dark-300 truncate">{task.title}</span>
                        </div>
                        <button
                            onClick={() => startTask(task.id)}
                            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-dark-700 text-dark-500 hover:text-blue-400 transition-all"
                        >
                            <Play size={14} />
                        </button>
                    </div>
                ))}
            </div>

            {/* Completed Section */}
            {completedToday.length > 0 && (
                <div className="px-5 py-3 border-t border-dark-700/30">
                    <p className="text-xs text-dark-500 flex items-center gap-1">
                        <Check size={12} className="text-green-500" />
                        {completedToday.length} completed today
                    </p>
                </div>
            )}
        </Card>
    );
}
