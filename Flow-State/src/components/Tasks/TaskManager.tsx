import { useState } from 'react';
import {
    Plus,
    CheckCircle2,
    Circle,
    PlayCircle,
    Clock,
    Trash2,
    Filter,
} from 'lucide-react';
import Card from '@/components/UI/Card';
import Button from '@/components/UI/Button';
import Modal from '@/components/UI/Modal';
import { useFlowStateStore } from '@/stores/flowstate-store';
import { useTasks } from '@/hooks/useTasks';
import { getComplexityColor, getComplexityLabel } from '@/utils/formatters';
import type { TaskComplexity } from '@/types/flowstate';
import BackendTasks from './BackendTasks';

function TaskForm({ onClose }: { onClose: () => void }) {
    const addTask = useFlowStateStore((s) => s.addTask);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [complexity, setComplexity] = useState<TaskComplexity>('medium');
    const [duration, setDuration] = useState(30);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;
        addTask({ title, description, complexity, estimatedDuration: duration, status: 'pending' });
        onClose();
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm text-dark-300 mb-1.5">Task Title</label>
                <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2.5 bg-dark-900 border border-dark-600 rounded-lg text-dark-100 placeholder-dark-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-colors"
                    placeholder="What needs to be done?"
                    autoFocus
                />
            </div>

            <div>
                <label className="block text-sm text-dark-300 mb-1.5">Description (optional)</label>
                <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3 py-2.5 bg-dark-900 border border-dark-600 rounded-lg text-dark-100 placeholder-dark-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-colors resize-none"
                    rows={2}
                    placeholder="Add some details..."
                />
            </div>

            <div>
                <label className="block text-sm text-dark-300 mb-2">Complexity</label>
                <div className="flex gap-2">
                    {(['low', 'medium', 'high'] as const).map((c) => (
                        <button
                            key={c}
                            type="button"
                            onClick={() => setComplexity(c)}
                            className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-all ${complexity === c
                                    ? 'border-current shadow-sm'
                                    : 'border-dark-600 text-dark-400 hover:border-dark-500'
                                }`}
                            style={
                                complexity === c
                                    ? { color: getComplexityColor(c), borderColor: getComplexityColor(c), backgroundColor: getComplexityColor(c) + '10' }
                                    : {}
                            }
                        >
                            {getComplexityLabel(c)}
                        </button>
                    ))}
                </div>
            </div>

            <div>
                <label className="block text-sm text-dark-300 mb-1.5">Estimated Duration (min)</label>
                <input
                    type="number"
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    min={5}
                    max={480}
                    step={5}
                    className="w-full px-3 py-2.5 bg-dark-900 border border-dark-600 rounded-lg text-dark-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-colors"
                />
            </div>

            <div className="flex gap-3 pt-2">
                <Button type="submit" className="flex-1">Add Task</Button>
                <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            </div>
        </form>
    );
}

export default function TaskManager() {
    const [showForm, setShowForm] = useState(false);
    const [filter, setFilter] = useState<'all' | 'pending' | 'in_progress' | 'completed'>('all');
    const { tasks, startTask, completeTask, deleteTask, stats } = useTasks();

    const filtered = filter === 'all' ? tasks : tasks.filter((t) => t.status === filter);

    const statusIcon = (status: string) => {
        switch (status) {
            case 'completed': return <CheckCircle2 size={18} className="text-green-500" />;
            case 'in_progress': return <PlayCircle size={18} className="text-blue-400 animate-pulse" />;
            default: return <Circle size={18} className="text-dark-500" />;
        }
    };

    return (
        <div className="space-y-6">
            {/* Backend Tasks - Assigned by Manager */}
            <BackendTasks />

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-dark-100">My Tasks</h2>
                    <p className="text-sm text-dark-400 mt-1">
                        {stats.completed}/{stats.total} completed • {stats.inProgress} in progress
                    </p>
                </div>
                <Button onClick={() => setShowForm(true)} icon={<Plus size={16} />}>
                    Add Task
                </Button>
            </div>

            {/* Filters */}
            <div className="flex gap-2">
                {(['all', 'pending', 'in_progress', 'completed'] as const).map((f) => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filter === f
                                ? 'bg-blue-600/15 text-blue-400 border border-blue-500/20'
                                : 'text-dark-400 hover:text-dark-200 hover:bg-dark-800'
                            }`}
                    >
                        {f === 'all' ? 'All' : f === 'in_progress' ? 'In Progress' : f.charAt(0).toUpperCase() + f.slice(1)}
                        {f === 'all' && ` (${stats.total})`}
                    </button>
                ))}
            </div>

            {/* Task List */}
            <Card padding="none">
                {filtered.length === 0 ? (
                    <div className="py-12 text-center">
                        <p className="text-dark-500">No tasks found</p>
                        <p className="text-dark-600 text-xs mt-1">
                            {filter !== 'all' ? 'Try a different filter' : 'Click "Add Task" to get started'}
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-dark-700/20">
                        {filtered.map((task) => (
                            <div
                                key={task.id}
                                className="px-5 py-4 flex items-center gap-4 hover:bg-dark-800/30 transition-colors group"
                            >
                                {/* Status Icon */}
                                <button
                                    onClick={() => {
                                        if (task.status === 'pending') startTask(task.id);
                                        else if (task.status === 'in_progress') completeTask(task.id);
                                    }}
                                    className="flex-shrink-0 hover:scale-110 transition-transform"
                                >
                                    {statusIcon(task.status)}
                                </button>

                                {/* Task Info */}
                                <div className="flex-1 min-w-0">
                                    <p className={`text-sm font-medium ${task.status === 'completed' ? 'text-dark-500 line-through' : 'text-dark-100'}`}>
                                        {task.title}
                                    </p>
                                    {task.description && (
                                        <p className="text-xs text-dark-500 mt-0.5 truncate">{task.description}</p>
                                    )}
                                </div>

                                {/* Complexity Badge */}
                                <span
                                    className="text-[10px] px-2 py-1 rounded-full font-medium flex-shrink-0"
                                    style={{
                                        color: getComplexityColor(task.complexity),
                                        backgroundColor: getComplexityColor(task.complexity) + '15',
                                    }}
                                >
                                    {task.complexity}
                                </span>

                                {/* Duration */}
                                {task.estimatedDuration && (
                                    <span className="text-xs text-dark-500 flex items-center gap-1 flex-shrink-0">
                                        <Clock size={12} /> {task.estimatedDuration}m
                                    </span>
                                )}

                                {/* Delete */}
                                <button
                                    onClick={() => deleteTask(task.id)}
                                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-600/15 text-dark-600 hover:text-red-400 transition-all flex-shrink-0"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </Card>

            {/* Add Task Modal */}
            <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Add New Task">
                <TaskForm onClose={() => setShowForm(false)} />
            </Modal>
        </div>
    );
}
