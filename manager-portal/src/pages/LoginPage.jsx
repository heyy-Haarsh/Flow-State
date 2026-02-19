import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import AnimatedCard from '../components/ui/AnimatedCard';
import GradientBackground from '../components/ui/GradientBackground';
import Button from '../components/Button';
import Input from '../components/Input';

export default function LoginPage() {
  const [email, setEmail] = useState('manager@company.com');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <GradientBackground>
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Logo and title */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-8"
          >
            <h1 className="text-5xl font-bold bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent mb-2">
              FlowState
            </h1>
            <p className="text-slate-400 text-lg">Manager Portal</p>
          </motion.div>

          {/* Login card */}
          <AnimatedCard delay={0.2}>
            <h2 className="text-2xl font-bold text-white mb-6">Welcome Back</h2>

            {error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg mb-4 backdrop-blur"
              >
                {error}
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="manager@company.com"
                required
              />

              <Input
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />

              <Button
                type="submit"
                variant="primary"
                disabled={loading}
                className="w-full mt-6 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 border-0"
              >
                {loading ? 'Logging in...' : 'Login'}
              </Button>
            </form>

            <p className="text-xs text-slate-500 text-center mt-6">
              For managers only. Employees use the desktop app.
            </p>
          </AnimatedCard>

          {/* Footer hint */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="text-center text-slate-600 text-sm mt-6"
          >
            ✨ Demo credentials pre-filled
          </motion.p>
        </div>
      </div>
    </GradientBackground>
  );
}
