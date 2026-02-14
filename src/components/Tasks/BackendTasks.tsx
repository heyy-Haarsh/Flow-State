import { useEffect, useState } from 'react';
import { CheckCircle, Clock, AlertCircle } from 'lucide-react';
import Card from '@/components/UI/Card';
import Button from '@/components/UI/Button';
import { taskSyncService, BackendTask } from '@/services/task-sync';

export default function BackendTasks() {
  const [tasks, setTasks] = useState<BackendTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadTasks();
    // Refresh every 3 seconds for near real-time updates
    const interval = setInterval(loadTasks, 3000);
    return () => clearInterval(interval);
  }, []);

  const loadTasks = async () => {
    try {
      const backendTasks = await taskSyncService.fetchTasks();
      setTasks(backendTasks);
      setError('');
    } catch (err: any) {
      setError('Failed to load tasks from server');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (taskId: number, status: 'in_progress' | 'completed') => {
    try {
      if (status === 'in_progress') {
        await taskSyncService.startTask(taskId);
      } else {
        await taskSyncService.completeTask(taskId);
      }
      // Reload tasks
      await loadTasks();
    } catch (err) {
      alert('Failed to update task status');
    }
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      urgent: 'text-red-400 bg-red-500/15',
      high: 'text-orange-400 bg-orange-500/15',
      medium: 'text-blue-400 bg-blue-500/15',
      low: 'text-dark-400 bg-dark-700',
    };
    return colors[priority as keyof typeof colors] || colors.medium;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle size={18} className="text-green-400" />;
      case 'in_progress':
        return <Clock size={18} className="text-blue-400" />;
      default:
        return <AlertCircle size={18} className="text-dark-500" />;
    }
  };

  if (loading) {
    return (
      <Card>
        <div className="text-center py-8 text-dark-400">Loading tasks from server...</div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <div className="text-center py-8">
          <p className="text-red-400 mb-4">{error}</p>
          <Button onClick={loadTasks} variant="secondary" size="sm">
            Retry
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-dark-100">
          Tasks Assigned by Manager ({tasks.length})
        </h2>
        <Button onClick={loadTasks} variant="secondary" size="sm">
          Refresh
        </Button>
      </div>

      {tasks.length === 0 ? (
        <Card>
          <div className="text-center py-8">
            <p className="text-dark-400">No tasks assigned yet</p>
            <p className="text-sm text-dark-500 mt-2">
              Your manager will assign tasks through the Manager Portal
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <Card key={task.id} className="hover:border-dark-600 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  {getStatusIcon(task.status)}
                  <div>
                    <h3 className="font-semibold text-dark-100">{task.title}</h3>
                    {task.description && (
                      <p className="text-sm text-dark-400 mt-1">{task.description}</p>
                    )}
                  </div>
                </div>
                <span
                  className={`px-2 py-1 rounded text-xs font-medium capitalize ${getPriorityColor(
                    task.priority
                  )}`}
                >
                  {task.priority}
                </span>
              </div>

              <div className="flex items-center gap-4 text-sm text-dark-500 mb-3">
                {task.complexity && (
                  <span className="capitalize">Complexity: {task.complexity}</span>
                )}
                {task.estimated_duration && (
                  <span>{task.estimated_duration} min</span>
                )}
                {task.due_date && (
                  <span>Due: {new Date(task.due_date).toLocaleDateString()}</span>
                )}
              </div>

              <div className="flex gap-2">
                {task.status === 'pending' && (
                  <Button
                    onClick={() => handleStatusChange(task.id, 'in_progress')}
                    variant="primary"
                    size="sm"
                  >
                    Start Task
                  </Button>
                )}
                {task.status === 'in_progress' && (
                  <Button
                    onClick={() => handleStatusChange(task.id, 'completed')}
                    variant="primary"
                    size="sm"
                  >
                    Mark Complete
                  </Button>
                )}
                {task.status === 'completed' && (
                  <span className="text-sm text-green-400 flex items-center gap-1">
                    <CheckCircle size={14} />
                    Completed
                  </span>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
