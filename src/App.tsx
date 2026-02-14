import { useActivityTracker } from '@/hooks/useActivityTracker';
import { useUIStore } from '@/stores/ui-store';
import { useFlowStateStore } from '@/stores/flowstate-store';

import { Sidebar, Header } from '@/components/UI';
import { Dashboard } from '@/components/Dashboard';
import { TaskManager } from '@/components/Tasks';
import { Analytics } from '@/components/Analytics';
import { QuestionnaireHub } from '@/components/Questionnaire';
import { PrivacyDashboard } from '@/components/Privacy';
import SettingsPage from '@/components/Settings/SettingsPage';
import { BreakSuggestion } from '@/components/Interventions';
import { FocusModeAlert } from '@/components/Interventions';
import FocusPage from '@/components/FocusSessions/FocusPage';

import { useState, useEffect } from 'react';



function App() {
    // Start activity tracking
    useActivityTracker();

    const activeTab = useUIStore((s) => s.activeTab);
    const setActiveTab = useUIStore((s) => s.setActiveTab);
    const cognitiveState = useFlowStateStore((s) => s.cognitiveState);
    const settings = useFlowStateStore((s) => s.settings);

    const setMLEnergy = useFlowStateStore((s) => s.setMLEnergy);

    // Intervention state
    const [showBreakSuggestion, setShowBreakSuggestion] = useState(false);
    const [showFlowAlert, setShowFlowAlert] = useState(false);
    const [flowAlertDismissed, setFlowAlertDismissed] = useState(false);
    const [breakRecommendation, setBreakRecommendation] = useState<any>(null);

    // ---- Wire ML Energy Pipeline into the UI Store ----
    // The Electron main process runs the ML model every 60s and sends
    // a smoothed energy score via IPC. We push it into the Zustand store
    // so ALL components (Dashboard, Header, EnergyGauge, etc.) show it.
    useEffect(() => {
        // 1. Listen for ongoing ML energy updates (every 60s)
        if (window.electron?.onEnergyUpdate) {
            window.electron.onEnergyUpdate((score: number) => {
                setMLEnergy(score);
            });
        }

        // 2. Fetch initial ML energy immediately on mount
        //    (don't wait 60s for the first pipeline cycle)
        if (window.electron?.getEnergyScore) {
            window.electron.getEnergyScore().then((score: number) => {
                if (typeof score === 'number' && score > 0) {
                    setMLEnergy(score);
                }
            });
        }
    }, [setMLEnergy]);

    // Show break suggestion when energy drops below 40 and break reminder is enabled
    useEffect(() => {
        if (cognitiveState.energyScore < 40 && settings.breakReminderEnabled && cognitiveState.timeSinceLastBreak > 45) {
            setShowBreakSuggestion(true);
        }
    }, [cognitiveState.energyScore, cognitiveState.timeSinceLastBreak, settings.breakReminderEnabled]);

    // Show flow state alert
    useEffect(() => {
        if (cognitiveState.isInFlowState && !flowAlertDismissed) {
            setShowFlowAlert(true);
        } else if (!cognitiveState.isInFlowState) {
            setFlowAlertDismissed(false);
        }
    }, [cognitiveState.isInFlowState, flowAlertDismissed]);

    // Listen for tray menu navigation events
    useEffect(() => {
        if (window.electron?.onNavigateTo) {
            window.electron.onNavigateTo((page: string) => {
                setActiveTab(page as any);
            });
        }

        if (window.electron?.onTriggerBreak) {
            window.electron.onTriggerBreak(() => {
                setShowBreakSuggestion(true);
                setActiveTab('dashboard');
            });
        }

        // Listen for ML-powered intervention events from the backend
        if (window.electron?.onIntervention) {
            window.electron.onIntervention((intervention: any) => {
                if (intervention.type === 'break_suggestion' ||
                    intervention.type === 'mandatory_break' ||
                    intervention.type === 'critical_energy') {
                    // Extract the break type recommendation
                    if (intervention.breakRecommendation) {
                        setBreakRecommendation(intervention.breakRecommendation);
                    }
                    setShowBreakSuggestion(true);
                }
            });
        }
    }, [setActiveTab]);

    const renderPage = () => {
        switch (activeTab) {
            case 'dashboard':
                return <Dashboard />;
            case 'focus':
                return <FocusPage />;
            case 'tasks':
                return <TaskManager />;
            case 'analytics':
                return <Analytics />;
            case 'questionnaire':
                return <QuestionnaireHub />;
            case 'privacy':
                return <PrivacyDashboard />;
            case 'settings':
                return <SettingsPage />;
            default:
                return <Dashboard />;
        }
    };

    return (
        <div className="flex h-screen w-screen bg-dark-950 text-dark-100 overflow-hidden">
            {/* Sidebar */}
            <Sidebar />

            {/* Main Area */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Header */}
                <Header />

                {/* Page Content */}
                <main className="flex-1 overflow-y-auto p-6">
                    {/* Interventions */}
                    {showFlowAlert && (
                        <div className="mb-4">
                            <FocusModeAlert
                                onDismiss={() => {
                                    setShowFlowAlert(false);
                                    setFlowAlertDismissed(true);
                                }}
                            />
                        </div>
                    )}

                    {showBreakSuggestion && activeTab === 'dashboard' && (
                        <div className="mb-4">
                            <BreakSuggestion
                                onDismiss={() => { setShowBreakSuggestion(false); setBreakRecommendation(null); }}
                                recommendation={breakRecommendation}
                            />
                        </div>
                    )}

                    {/* Active Page */}
                    {renderPage()}
                </main>
            </div>
        </div>
    );
}

export default App;
