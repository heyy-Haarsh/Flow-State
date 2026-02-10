import { useActivityTracker } from '@/hooks/useActivityTracker';
import { useUIStore } from '@/stores/ui-store';

function App() {
    // Start activity tracking
    useActivityTracker();

    const activeTab = useUIStore((s) => s.activeTab);

    return (
        <div className="flex h-screen w-screen bg-dark-950 text-dark-100">
            {/* Sidebar placeholder */}
            <aside className="w-16 bg-dark-900 border-r border-dark-700/50 flex flex-col items-center py-6">
                <div className="text-2xl font-bold text-energy-peak mb-8">⚡</div>
                <p className="text-xs text-dark-400 [writing-mode:vertical-rl] rotate-180">
                    FlowState
                </p>
            </aside>

            {/* Main content */}
            <main className="flex-1 overflow-y-auto p-6">
                <h1 className="text-3xl font-bold mb-2">
                    FlowState <span className="text-energy-peak">⚡</span>
                </h1>
                <p className="text-dark-400 mb-8">
                    AI-Powered Smart Task & Energy Manager
                </p>

                <div className="glass-card">
                    <h2 className="text-lg font-semibold mb-3">🚧 Under Construction</h2>
                    <p className="text-dark-300">
                        Directory structure is ready. Components will be built next.
                    </p>
                    <p className="text-dark-400 text-sm mt-2">
                        Active tab: <code className="text-energy-peak">{activeTab}</code>
                    </p>
                </div>
            </main>
        </div>
    );
}

export default App;
