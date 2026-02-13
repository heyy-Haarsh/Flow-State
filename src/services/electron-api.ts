/**
 * FlowState - Electron API Wrapper
 * Provides type-safe access to the Electron IPC bridge.
 * Falls back gracefully when running outside Electron (e.g. in browser dev).
 */

const isElectron = typeof window !== 'undefined' && window.electron !== undefined;

export const electronAPI = {
    // ---- Questionnaire ----
    saveQuestionnaire: async (data: any) => {
        if (isElectron) return window.electron.saveQuestionnaire(data);
        console.log('[Mock] saveQuestionnaire', data);
    },

    getQuestionnaireHistory: async () => {
        if (isElectron) return window.electron.getQuestionnaireHistory();
        return [];
    },

    // ---- Tasks ----
    createTask: async (task: any) => {
        if (isElectron) return window.electron.createTask(task);
        console.log('[Mock] createTask', task);
    },

    updateTask: async (id: string, updates: any) => {
        if (isElectron) return window.electron.updateTask(id, updates);
        console.log('[Mock] updateTask', id, updates);
    },

    deleteTask: async (id: string) => {
        if (isElectron) return window.electron.deleteTask(id);
        console.log('[Mock] deleteTask', id);
    },

    getTasks: async (filter?: any) => {
        if (isElectron) return window.electron.getTasks(filter);
        return [];
    },

    // ---- Energy ----
    getEnergyScore: async () => {
        if (isElectron) return window.electron.getEnergyScore();
        return 70; // Mock
    },

    // ---- Analytics ----
    getAnalytics: async (range: number) => {
        if (isElectron) return window.electron.getAnalytics(range);
        return [];
    },

    // ---- ML ----
    analyzePeakHours: async () => {
        if (isElectron) return window.electron.analyzePeakHours();
        console.log('[Mock] analyzePeakHours');
    },

    getPeakAnalysis: async (context: string) => {
        if (isElectron) return window.electron.getPeakAnalysis(context);
        return [];
    },

    triggerModelTraining: async () => {
        if (isElectron) return window.electron.triggerModelTraining();
        console.log('[Mock] triggerModelTraining');
    },

    getModelStatus: async () => {
        if (isElectron) return window.electron.getModelStatus();
        return { isLoaded: false };
    },

    // ---- Privacy ----
    exportData: async (format: string) => {
        if (isElectron) return window.electron.exportData(format);
        console.log('[Mock] exportData', format);
    },

    deleteAllData: async () => {
        if (isElectron) return window.electron.deleteAllData();
        console.log('[Mock] deleteAllData');
    },

    // ---- Settings ----
    getSettings: async () => {
        if (isElectron) return window.electron.getSettings();
        return {};
    },

    updateSetting: async (key: string, value: any) => {
        if (isElectron) return window.electron.updateSetting(key, value);
        console.log('[Mock] updateSetting', key, value);
    },
};

// Type declaration for window.electron
declare global {
    interface Window {
        electron: {
            saveQuestionnaire: (data: any) => Promise<any>;
            getQuestionnaireHistory: () => Promise<any>;
            createTask: (task: any) => Promise<any>;
            updateTask: (id: string, updates: any) => Promise<any>;
            deleteTask: (id: string) => Promise<any>;
            getTasks: (filter?: any) => Promise<any>;
            getEnergyScore: () => Promise<number>;
            getActivityMetrics: (timeRange: any) => Promise<any>;
            onEnergyUpdate: (callback: (score: number) => void) => void;
            onIntervention: (callback: (data: any) => void) => void;
            respondToIntervention: (id: string, accepted: boolean) => Promise<any>;
            startBreak: (type: string) => Promise<any>;
            endBreak: (id: string) => Promise<any>;
            getAnalytics: (range: number) => Promise<any>;
            getDailySummary: (date: string) => Promise<any>;
            getWeeklySummary: () => Promise<any>;
            analyzePeakHours: () => Promise<any>;
            getPeakAnalysis: (context: string) => Promise<any>;
            triggerModelTraining: () => Promise<any>;
            getModelStatus: () => Promise<any>;
            getSettings: () => Promise<any>;
            updateSetting: (key: string, value: any) => Promise<any>;
            exportData: (format: string) => Promise<any>;
            deleteAllData: () => Promise<any>;
            startMonitoring: () => Promise<any>;
            stopMonitoring: () => Promise<any>;
            getMonitoringStatus: () => Promise<any>;
        };
    }
}
