import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckSquare } from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import { taskAPI } from '../api/tasks';

export default function TasksPage() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const navigate = useNavigate();

  useEffect(() => {
    loadTasks();
  }, [filter]);

  const loadTasks = async () => {
    try {
      const params = filter !== 'all' ? { status: filter } : {};
      const data = await taskAPI.getTasks(params);
      setTasks(data.tasks || []);
    } catch (err) {
      console.error('Error loading tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-dark-700 text-dark-300',
      in_progress: 'bg-blue-500/15 text-blue-400',
      completed: 'bg-green-500/15 text-green-400',
    };
    return colors[status] || colors.pending;
  };

  if (loading) {
    return <div className="text-dark-400">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-dark-100">All Tasks</h1>
        <Button onClick={() => navigate('/assign-task')} variant="primary">
          Assign New Task
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {['all', 'pending', 'in_progress', 'completed'].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-lg font-medium capitalize transition-all ${
              filter === status
                ? 'bg-blue-600 text-white'
                : 'bg-dark-800 text-dark-400 hover:bg-dark-700'
            }`}
          >
            {status.replace('_', ' ')}
          </button>
        ))}
      </div>

      {tasks.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <CheckSquare size={48} className="mx-auto text-dark-600 mb-4" />
            <h3 className="text-xl font-semibold text-dark-200 mb-2">No tasks found</h3>
            <p className="text-dark-500">Start by assigning a task to an employee</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <Card key={task.id} className="hover:border-dark-600 transition-colors cursor-pointer">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-dark-100 mb-1">{task.title}</h3>
                  <p className="text-sm text-dark-400 mb-2">
                    Assigned to: <span className="text-dark-200">{task.assigned_to_name}</span>
                  </p>
                  {task.description && (
                    <p className="text-sm text-dark-500 line-clamp-2">{task.description}</p>
                  )}
                  <div className="flex gap-2 mt-3">
                    {task.complexity && (
                      <span className="px-2 py-1 rounded text-xs bg-dark-700 text-dark-300 capitalize">
                        {task.complexity}
                      </span>
                    )}
                    {task.priority && (
                      <span className={`px-2 py-1 rounded text-xs capitalize ${
                        task.priority === 'urgent' ? 'bg-red-500/15 text-red-400' : 'bg-dark-700 text-dark-300'
                      }`}>
                        {task.priority}
                      </span>
                    )}
                  </div>
                </div>
                <span className={`px-3 py-1 rounded text-xs font-medium capitalize ${getStatusColor(task.status)}`}>
                  {task.status.replace('_', ' ')}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
