import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, CheckSquare, Clock, AlertCircle } from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import { employeeAPI } from '../api/employees';
import { taskAPI } from '../api/tasks';

export default function DashboardPage() {
  const [employees, setEmployees] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [employeesData, tasksData, statsData] = await Promise.all([
        employeeAPI.getMyEmployees(),
        taskAPI.getTasks({ limit: 5 }),
        taskAPI.getTaskStats(),
      ]);

      setEmployees(employeesData.employees || []);
      setTasks(tasksData.tasks || []);
      setStats(statsData.stats || {});
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-dark-400">Loading...</p>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Employees',
      value: employees.length,
      icon: Users,
      color: 'text-blue-400',
    },
    {
      title: 'Total Tasks',
      value: stats.total || 0,
      icon: CheckSquare,
      color: 'text-green-400',
    },
    {
      title: 'In Progress',
      value: stats.in_progress || 0,
      icon: Clock,
      color: 'text-amber-400',
    },
    {
      title: 'Overdue',
      value: stats.overdue || 0,
      icon: AlertCircle,
      color: 'text-red-400',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-dark-100">Dashboard</h1>
        <Button onClick={() => navigate('/assign-task')} variant="primary">
          Assign New Task
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-dark-400">{stat.title}</p>
                <p className="text-3xl font-bold text-dark-100 mt-1">{stat.value}</p>
              </div>
              <stat.icon size={32} className={stat.color} />
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Tasks */}
        <Card>
          <h2 className="text-xl font-bold text-dark-100 mb-4">Recent Tasks</h2>
          <div className="space-y-3">
            {tasks.length === 0 ? (
              <p className="text-dark-500 text-sm">No tasks assigned yet</p>
            ) : (
              tasks.map((task) => (
                <div
                  key={task.id}
                  className="p-3 bg-dark-900 rounded-lg border border-dark-700 hover:border-dark-600 transition-colors cursor-pointer"
                  onClick={() => navigate(`/tasks/${task.id}`)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-dark-100">{task.title}</h3>
                      <p className="text-sm text-dark-400 mt-1">
                        Assigned to: {task.assigned_to_name}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        task.status === 'completed'
                          ? 'bg-green-500/15 text-green-400'
                          : task.status === 'in_progress'
                          ? 'bg-blue-500/15 text-blue-400'
                          : 'bg-dark-700 text-dark-300'
                      }`}
                    >
                      {task.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
          {tasks.length > 0 && (
            <Button
              onClick={() => navigate('/tasks')}
              variant="secondary"
              className="w-full mt-4"
            >
              View All Tasks
            </Button>
          )}
        </Card>

        {/* Team Members */}
        <Card>
          <h2 className="text-xl font-bold text-dark-100 mb-4">Team Members</h2>
          <div className="space-y-3">
            {employees.length === 0 ? (
              <p className="text-dark-500 text-sm">No employees in your team yet</p>
            ) : (
              employees.slice(0, 5).map((employee) => (
                <div
                  key={employee.id}
                  className="flex items-center justify-between p-3 bg-dark-900 rounded-lg"
                >
                  <div>
                    <h3 className="font-medium text-dark-100">{employee.full_name}</h3>
                    <p className="text-sm text-dark-500">{employee.email}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-dark-400">
                      {employee.completed_tasks}/{employee.total_tasks} tasks
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
          {employees.length > 0 && (
            <Button
              onClick={() => navigate('/employees')}
              variant="secondary"
              className="w-full mt-4"
            >
              Manage Team
            </Button>
          )}
        </Card>
      </div>
    </div>
  );
}
