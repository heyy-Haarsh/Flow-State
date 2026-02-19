import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, CheckSquare, Plus, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import GradientBackground from './ui/GradientBackground';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/tasks', label: 'Tasks', icon: CheckSquare },
    { path: '/employees', label: 'Employees', icon: Users },
    { path: '/assign-task', label: 'Assign Task', icon: Plus },
  ];

  return (
    <GradientBackground>
      <div className="min-h-screen flex">
        {/* Sidebar */}
        <aside className="w-64 bg-slate-900/50 backdrop-blur-xl border-r border-slate-800/50 flex flex-col">
        <div className="p-6 border-b border-dark-700">
          <h1 className="text-2xl font-bold text-dark-100">FlowState</h1>
          <p className="text-sm text-dark-500">Manager Portal</p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;

            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-dark-400 hover:bg-dark-700 hover:text-dark-200'
                }`}
              >
                <Icon size={20} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* User Info */}
        <div className="p-4 border-t border-dark-700">
          <div className="mb-3">
            <p className="font-medium text-dark-100">{user?.fullName}</p>
            <p className="text-sm text-dark-500">{user?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-4 py-2 bg-dark-700 hover:bg-dark-600 text-dark-200 rounded-lg transition-colors"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
      </div>
    </GradientBackground>
  );
}
