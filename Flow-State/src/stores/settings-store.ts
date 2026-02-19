import { create } from 'zustand';
import type { UserSettings } from '@/types/flowstate';

interface SettingsState extends UserSettings {
    updateSetting: <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => void;
    loadSettings: () => Promise<void>;
    resetSettings: () => void;
}

const DEFAULT_SETTINGS: UserSettings = {
    dataRetentionDays: 30,
    monitoringEnabled: true,
    breakReminderEnabled: true,
    calibrationDay: 0,
    modelTrained: false,
    theme: 'dark',
};

export const useSettingsStore = create<SettingsState>((set) => ({
    ...DEFAULT_SETTINGS,

    updateSetting: (key, value) => {
        set({ [key]: value });

        // Persist to Electron if available
        if (window.electron?.updateSetting) {
            window.electron.updateSetting(key, value);
        }
    },

    loadSettings: async () => {
        try {
            if (window.electron?.getSettings) {
                const settings = await window.electron.getSettings();
                if (settings) {
                    set({
                        dataRetentionDays: Number(settings.data_retention_days) || 30,
                        monitoringEnabled: settings.monitoring_enabled !== 'false',
                        breakReminderEnabled: settings.break_reminder_enabled !== 'false',
                        calibrationDay: Number(settings.calibration_day) || 0,
                        modelTrained: settings.model_trained === 'true',
                        theme: (settings.theme as 'dark' | 'light') || 'dark',
                    });
                }
            }
        } catch (error) {
            console.error('Failed to load settings:', error);
        }
    },

    resetSettings: () => set({ ...DEFAULT_SETTINGS }),
}));
