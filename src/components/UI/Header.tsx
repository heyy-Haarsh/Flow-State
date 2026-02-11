import { Bell, Moon, Sun } from 'lucide-react';
import { useFlowStateStore } from '@/stores/flowstate-store';
import { useSettingsStore } from '@/stores/settings-store';
import { getEnergyColor } from '@/utils/constants';
import { formatDuration } from '@/utils/formatters';

export default function Header() {
    const cognitiveState = useFlowStateStore((s) => s.cognitiveState);
    const theme = useSettingsStore((s) => s.theme);
    const updateSetting = useSettingsStore((s) => s.updateSetting);

    const energyColor = getEnergyColor(cognitiveState.energyScore);

    return (
        <header className="flex items-center justify-between px-6 py-3 border-b border-dark-700/30 bg-dark-900/40 backdrop-blur-sm">
            {/* Left: Status */}
            <div className="flex items-center gap-4">
                {/* Energy Pill */}
                <div
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium"
                    style={{
                        borderColor: energyColor + '40',
                        backgroundColor: energyColor + '10',
                        color: energyColor,
                    }}
                >
                    <div
                        className="w-2 h-2 rounded-full animate-pulse"
                        style={{ backgroundColor: energyColor }}
                    />
                    Energy: {Math.round(cognitiveState.energyScore)}
                </div>

                {/* Session Timer */}
                <span className="text-xs text-dark-500">
                    Session: {formatDuration(cognitiveState.sessionDuration)}
                </span>

                {/* Flow State Badge */}
                {cognitiveState.isInFlowState && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-500/15 border border-purple-400/30 text-purple-400 text-xs font-medium">
                        <span className="animate-pulse">✨</span> In Flow
                    </div>
                )}
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2">
                <button className="p-2 rounded-lg hover:bg-dark-800 text-dark-400 hover:text-dark-200 transition-colors relative">
                    <Bell size={18} />
                </button>
                <button
                    onClick={() => updateSetting('theme', theme === 'dark' ? 'light' : 'dark')}
                    className="p-2 rounded-lg hover:bg-dark-800 text-dark-400 hover:text-dark-200 transition-colors"
                >
                    {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                </button>
            </div>
        </header>
    );
}
