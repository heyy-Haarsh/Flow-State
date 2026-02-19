import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import { employeeAPI } from '../api/employees';
import { taskAPI } from '../api/tasks';

export default function AssignTaskPage() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assignedTo: '',
    complexity: 'medium',
    estimatedDuration: '',
    priority: 'medium',
    dueDate: '',
  });

  const navigate = useNavigate();

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    try {
      const data = await employeeAPI.getMyEmployees();
      setEmployees(data.employees || []);
    } catch (err) {
      console.error('Error loading employees:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await taskAPI.createTask({
        title: formData.title,
        description: formData.description,
        assignedTo: parseInt(formData.assignedTo),
        complexity: formData.complexity,
        estimatedDuration: formData.estimatedDuration ? parseInt(formData.estimatedDuration) : null,
        priority: formData.priority,
        dueDate: formData.dueDate || null,
      });

      setSuccess(true);
      setTimeout(() => {
        navigate('/tasks');
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.errors?.[0] || 'Failed to create task');
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-dark-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-dark-100">Assign New Task</h1>
        <p className="text-dark-400 mt-1">Create and assign a task to an employee</p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-500/10 border border-green-500/30 text-green-400 px-4 py-3 rounded-lg">
          Task assigned successfully! Redirecting...
        </div>
      )}

      <Card>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Employee Selection */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-dark-200">
              Assign To <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.assignedTo}
              onChange={(e) => handleChange('assignedTo', e.target.value)}
              required
              className="w-full px-4 py-2 bg-dark-900 border border-dark-700 rounded-lg text-dark-100 focus:outline-none focus:border-blue-500"
            >
              <option value="">Select an employee</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.full_name} ({emp.email})
                </option>
              ))}
            </select>
            {employees.length === 0 && (
              <p className="text-sm text-amber-400">
                No employees in your team. Add employees first.
              </p>
            )}
          </div>

          {/* Task Title */}
          <Input
            label="Task Title"
            value={formData.title}
            onChange={(e) => handleChange('title', e.target.value)}
            placeholder="e.g., Implement user authentication"
            required
          />

          {/* Description */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-dark-200">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Provide task details and requirements..."
              rows={4}
              className="w-full px-4 py-2 bg-dark-900 border border-dark-700 rounded-lg text-dark-100 placeholder-dark-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Complexity */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-dark-200">Complexity</label>
            <div className="grid grid-cols-3 gap-3">
              {['low', 'medium', 'high'].map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => handleChange('complexity', level)}
                  className={`p-3 rounded-lg border font-medium capitalize transition-all ${
                    formData.complexity === level
                      ? 'bg-blue-600/15 border-blue-500/30 text-blue-400'
                      : 'border-dark-600 text-dark-400 hover:border-dark-500'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-dark-200">Priority</label>
            <div className="grid grid-cols-4 gap-3">
              {['low', 'medium', 'high', 'urgent'].map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => handleChange('priority', level)}
                  className={`p-3 rounded-lg border font-medium capitalize transition-all ${
                    formData.priority === level
                      ? level === 'urgent'
                        ? 'bg-red-600/15 border-red-500/30 text-red-400'
                        : 'bg-blue-600/15 border-blue-500/30 text-blue-400'
                      : 'border-dark-600 text-dark-400 hover:border-dark-500'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Estimated Duration */}
            <Input
              label="Estimated Duration (minutes)"
              type="number"
              value={formData.estimatedDuration}
              onChange={(e) => handleChange('estimatedDuration', e.target.value)}
              placeholder="e.g., 120"
              min="1"
            />

            {/* Due Date */}
            <Input
              label="Due Date"
              type="datetime-local"
              value={formData.dueDate}
              onChange={(e) => handleChange('dueDate', e.target.value)}
            />
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-3 pt-4">
            <Button type="submit" variant="primary" disabled={submitting || employees.length === 0}>
              {submitting ? 'Assigning...' : 'Assign Task'}
            </Button>
            <Button type="button" variant="secondary" onClick={() => navigate('/dashboard')}>
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
