import { useState, useEffect } from 'react';
import { Users, Trash2 } from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import { employeeAPI } from '../api/employees';

export default function EmployeesPage() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const handleRemove = async (employeeId) => {
    if (!confirm('Are you sure you want to remove this employee from your team?')) {
      return;
    }

    try {
      await employeeAPI.removeEmployee(employeeId);
      setEmployees((prev) => prev.filter((emp) => emp.id !== employeeId));
    } catch (err) {
      alert('Failed to remove employee');
    }
  };

  if (loading) {
    return <div className="text-dark-400">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-dark-100">Team Members</h1>
          <p className="text-dark-400 mt-1">Manage your team</p>
        </div>
      </div>

      {employees.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <Users size={48} className="mx-auto text-dark-600 mb-4" />
            <h3 className="text-xl font-semibold text-dark-200 mb-2">
              No employees yet
            </h3>
            <p className="text-dark-500">
              Employees will appear here after they register with your company
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {employees.map((emp) => (
            <Card key={emp.id}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-dark-100">{emp.full_name}</h3>
                  <p className="text-sm text-dark-500">{emp.email}</p>
                </div>
                <button
                  onClick={() => handleRemove(emp.id)}
                  className="text-red-400 hover:text-red-300 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-dark-500">Total Tasks</p>
                  <p className="font-medium text-dark-200">{emp.total_tasks || 0}</p>
                </div>
                <div>
                  <p className="text-dark-500">Completed</p>
                  <p className="font-medium text-green-400">{emp.completed_tasks || 0}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
