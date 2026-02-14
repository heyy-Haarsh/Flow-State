import { Settings as SettingsIcon, Monitor, Bell, Brain, Palette, Info } from 'lucide-react';
import Card from '@/components/UI/Card';
import Button from '@/components/UI/Button';
import { useSettingsStore } from '@/stores/settings-store';
import { useState } from 'react';

declare global {
    interface Window {
        electron: any;
    }
}

export default function SettingsPage() {
    const settings = useSettingsStore();
    const [notificationSettings, setNotificationSettings] = useState({
        enabled: true,
        breakReminders: true,
        taskSuggestions: true,
        flowAlerts: true,
    });

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-dark-100">Settings</h2>
                <p className="text-sm text-dark-400 mt-1">Configure FlowState to work your way</p>
            </div>

            {/* Monitoring */}
            <Card>
                <h3 className="font-semibold text-dark-100 flex items-center gap-2 mb-4">
                    <Monitor size={16} className="text-blue-400" />
                    Activity Monitoring
                </h3>
                <div className="space-y-4">
                    <ToggleRow
                        label="Enable Activity Monitoring"
                        description="Track typing patterns and mouse movements (not content)"
                        checked={settings.monitoringEnabled}
                        onChange={(v) => settings.updateSetting('monitoringEnabled', v)}
                    />
                    <ToggleRow
                        label="Break Reminders"
                        description="Show break suggestions when energy drops"
                        checked={settings.breakReminderEnabled}
                        onChange={(v) => settings.updateSetting('breakReminderEnabled', v)}
                    />
                </div>
            </Card>

            {/* Notifications */}
            <Card>
                <h3 className="font-semibold text-dark-100 flex items-center gap-2 mb-4">
                    <Bell size={16} className="text-amber-400" />
                    Desktop Notifications
                </h3>
                <div className="space-y-4">
                    <ToggleRow
                        label="Enable Notifications"
                        description="Show desktop notifications for interventions and alerts"
                        checked={notificationSettings.enabled}
                        onChange={(v) => {
                            const updated = { ...notificationSettings, enabled: v };
                            setNotificationSettings(updated);
                            window.electron?.updateNotificationSettings(updated);
                        }}
                    />
                    <ToggleRow
                        label="Break Reminders"
                        description="Notify when it's time to take a break"
                        checked={notificationSettings.breakReminders}
                        onChange={(v) => {
                            const updated = { ...notificationSettings, breakReminders: v };
                            setNotificationSettings(updated);
                            window.electron?.updateNotificationSettings(updated);
                        }}
                    />
                    <ToggleRow
                        label="Task Suggestions"
                        description="Get notified about task switching opportunities"
                        checked={notificationSettings.taskSuggestions}
                        onChange={(v) => {
                            const updated = { ...notificationSettings, taskSuggestions: v };
                            setNotificationSettings(updated);
                            window.electron?.updateNotificationSettings(updated);
                        }}
                    />
                    <ToggleRow
                        label="Flow State Alerts"
                        description="Notify when you enter high-focus flow state"
                        checked={notificationSettings.flowAlerts}
                        onChange={(v) => {
                            const updated = { ...notificationSettings, flowAlerts: v };
                            setNotificationSettings(updated);
                            window.electron?.updateNotificationSettings(updated);
                        }}
                    />

                    <div className="pt-2">
                        <Button
                            variant="secondary"
                            size="sm"
                            className="w-full"
                            onClick={() => {
                                window.electron?.testNotification();
                            }}
                        >
                            Test Notification
                        </Button>
                    </div>
                </div>
            </Card>

            {/* Appearance */}
            <Card>
                <h3 className="font-semibold text-dark-100 flex items-center gap-2 mb-4">
                    <Palette size={16} className="text-purple-400" />
                    Appearance
                </h3>
                <div className="flex gap-3">
                    {(['dark', 'light'] as const).map((t) => (
                        <button
                            key={t}
                            onClick={() => settings.updateSetting('theme', t)}
                            className={`flex-1 p-4 rounded-xl border transition-all ${settings.theme === t
                                    ? 'bg-blue-600/15 border-blue-500/30 text-blue-400'
                                    : 'border-dark-600 text-dark-400 hover:border-dark-500'
                                }`}
                        >
                            <span className="text-2xl block mb-1">{t === 'dark' ? '🌙' : '☀️'}</span>
                            <span className="text-sm font-medium capitalize">{t} Mode</span>
                        </button>
                    ))}
                </div>
            </Card>

            {/* ML Model */}
            <Card>
                <h3 className="font-semibold text-dark-100 flex items-center gap-2 mb-4">
                    <Brain size={16} className="text-green-400" />
                    ML Model
                </h3>
                <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-dark-900/40">
                        <div>
                            <p className="text-sm text-dark-200">Model Status</p>
                            <p className="text-xs text-dark-500">
                                {settings.modelTrained ? 'Trained and active' : 'Not trained yet — using rule-based predictions'}
                            </p>
                        </div>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${settings.modelTrained
                                ? 'bg-green-500/15 text-green-400'
                                : 'bg-amber-500/15 text-amber-400'
                            }`}>
                            {settings.modelTrained ? 'Active' : 'Calibrating'}
                        </span>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-lg bg-dark-900/40">
                        <div>
                            <p className="text-sm text-dark-200">Calibration Day</p>
                            <p className="text-xs text-dark-500">Training starts after 7 days of data collection</p>
                        </div>
                        <span className="text-sm font-bold text-dark-300">{settings.calibrationDay}/7</span>
                    </div>

                    <Button
                        variant="secondary"
                        className="w-full"
                        disabled={settings.calibrationDay < 7}
                        onClick={() => {
                            if (window.electron?.triggerModelTraining) {
                                window.electron.triggerModelTraining();
                            } else {
                                alert('ML training available in desktop app. Use: npm run ml:train');
                            }
                        }}
                    >
                        {settings.calibrationDay < 7 ? `Train Model (${7 - settings.calibrationDay} days left)` : 'Retrain Model'}
                    </Button>
                </div>
            </Card>

            {/* About */}
            <Card>
                <h3 className="font-semibold text-dark-100 flex items-center gap-2 mb-3">
                    <Info size={16} className="text-dark-400" />
                    About
                </h3>
                <p className="text-sm text-dark-400">
                    FlowState v1.0.0 • AI-Powered Smart Task & Energy Manager
                </p>
                <p className="text-xs text-dark-500 mt-1">
                    Privacy-first productivity. All data stays on your device.
                </p>
            </Card>
        </div>
    );
}

// Toggle Row sub-component
function ToggleRow({
    label,
    description,
    checked,
    onChange,
}: {
    label: string;
    description: string;
    checked: boolean;
    onChange: (v: boolean) => void;
}) {
    return (
        <div className="flex items-center justify-between">
            <div>
                <p className="text-sm text-dark-200">{label}</p>
                <p className="text-xs text-dark-500">{description}</p>
            </div>
            <button
                onClick={() => onChange(!checked)}
                className={`w-11 h-6 rounded-full transition-colors flex items-center px-0.5 ${checked ? 'bg-blue-600' : 'bg-dark-600'
                    }`}
            >
                <div
                    className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'
                        }`}
                />
            </button>
        </div>
    );
}
