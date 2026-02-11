import {
    LayoutDashboard,
    CheckSquare,
    BarChart3,
    ClipboardList,
    Shield,
    Settings,
    Zap,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';
import { useUIStore } from '@/stores/ui-store';
import Tooltip from './Tooltip';

const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'questionnaire', label: 'Check-in', icon: ClipboardList },
    { id: 'privacy', label: 'Privacy', icon: Shield },
    { id: 'settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
    const { sidebarCollapsed, toggleSidebar, activeTab, setActiveTab } = useUIStore();

    return (
        <aside
            className={`
        flex flex-col h-full bg-dark-900/80 backdrop-blur-lg border-r border-dark-700/50
        transition-all duration-300 ease-in-out
        ${sidebarCollapsed ? 'w-[68px]' : 'w-[220px]'}
      `}
        >
            {/* Logo */}
            <div className={`flex items-center gap-3 px-4 py-5 border-b border-dark-700/30 ${sidebarCollapsed ? 'justify-center' : ''}`}>
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-600/20">
                    <Zap size={18} className="text-white" />
                </div>
                {!sidebarCollapsed && (
                    <span className="font-bold text-lg tracking-tight text-dark-100">
                        Flow<span className="text-blue-400">State</span>
                    </span>
                )}
            </div>

            {/* Nav Items */}
            <nav className="flex-1 py-4 px-2 space-y-1">
                {navItems.map((item) => {
                    const isActive = activeTab === item.id;
                    const Icon = item.icon;

                    const button = (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            className={`
                w-full flex items-center gap-3 rounded-xl transition-all duration-200
                ${sidebarCollapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2.5'}
                ${isActive
                                    ? 'bg-blue-600/15 text-blue-400 border border-blue-500/20 shadow-sm shadow-blue-600/10'
                                    : 'text-dark-400 hover:text-dark-200 hover:bg-dark-800/60'}
              `}
                        >
                            <Icon size={20} className={isActive ? 'text-blue-400' : ''} />
                            {!sidebarCollapsed && (
                                <span className="text-sm font-medium">{item.label}</span>
                            )}
                        </button>
                    );

                    return sidebarCollapsed ? (
                        <Tooltip key={item.id} text={item.label} position="right">
                            {button}
                        </Tooltip>
                    ) : (
                        <div key={item.id}>{button}</div>
                    );
                })}
            </nav>

            {/* Collapse Button */}
            <div className="px-2 py-3 border-t border-dark-700/30">
                <button
                    onClick={toggleSidebar}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-dark-500
            hover:text-dark-300 hover:bg-dark-800/60 transition-all duration-200"
                >
                    {sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
                    {!sidebarCollapsed && <span className="text-xs">Collapse</span>}
                </button>
            </div>
        </aside>
    );
}
