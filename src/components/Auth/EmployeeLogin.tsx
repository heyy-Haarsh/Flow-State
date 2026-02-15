import { useState } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import Card from '@/components/UI/Card';
import Button from '@/components/UI/Button';

export default function EmployeeLogin() {
  const [email, setEmail] = useState('employee@company.com');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const login = useAuthStore((s) => s.login);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-dark-900">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-dark-100 mb-2">FlowState</h1>
          <p className="text-dark-400">Employee Desktop App</p>
        </div>

        <Card>
          <h2 className="text-2xl font-bold text-dark-100 mb-6">Employee Login</h2>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-dark-200 mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2 bg-dark-900 border border-dark-700 rounded-lg text-dark-100 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-200 mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-2 bg-dark-900 border border-dark-700 rounded-lg text-dark-100 focus:outline-none focus:border-blue-500"
              />
            </div>

            <Button type="submit" variant="primary" disabled={loading} className="w-full mt-6">
              {loading ? 'Logging in...' : 'Login'}
            </Button>
          </form>

          <p className="text-xs text-dark-500 text-center mt-6">
            Default credentials: employee@company.com / password123
          </p>
        </Card>
      </div>
    </div>
  );
}
