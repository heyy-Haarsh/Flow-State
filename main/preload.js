// FlowState - Preload Script (Context Bridge)
// Securely exposes Electron APIs to the renderer process

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    // Database operations
    saveQuestionnaire: (data) => ipcRenderer.invoke('save-questionnaire', data),
    getQuestionnaireHistory: () => ipcRenderer.invoke('get-questionnaire-history'),

    // Task operations
    createTask: (task) => ipcRenderer.invoke('create-task', task),
    updateTask: (id, updates) => ipcRenderer.invoke('update-task', id, updates),
    deleteTask: (id) => ipcRenderer.invoke('delete-task', id),
    getTasks: (filter) => ipcRenderer.invoke('get-tasks', filter),

    // Energy & Monitoring
    getEnergyScore: () => ipcRenderer.invoke('get-energy-score'),
    getActivityMetrics: (timeRange) => ipcRenderer.invoke('get-activity-metrics', timeRange),
    onEnergyUpdate: (callback) => {
        ipcRenderer.on('energy-update', (_event, score) => callback(score));
    },

    // Interventions
    onIntervention: (callback) => {
        ipcRenderer.on('intervention', (_event, data) => callback(data));
    },
    respondToIntervention: (id, accepted) =>
        ipcRenderer.invoke('respond-intervention', id, accepted),

    // Breaks
    startBreak: (type) => ipcRenderer.invoke('start-break', type),
    endBreak: (id) => ipcRenderer.invoke('end-break', id),

    // Analytics
    getAnalytics: (range) => ipcRenderer.invoke('get-analytics', range),
    getDailySummary: (date) => ipcRenderer.invoke('get-daily-summary', date),
    getWeeklySummary: () => ipcRenderer.invoke('get-weekly-summary'),

    // ML Model
    triggerModelTraining: () => ipcRenderer.invoke('trigger-model-training'),
    getModelStatus: () => ipcRenderer.invoke('get-model-status'),

    // Privacy & Settings
    getSettings: () => ipcRenderer.invoke('get-settings'),
    updateSetting: (key, value) => ipcRenderer.invoke('update-setting', key, value),
    exportData: (format) => ipcRenderer.invoke('export-data', format),
    deleteAllData: () => ipcRenderer.invoke('delete-all-data'),

    // Monitoring control
    startMonitoring: () => ipcRenderer.invoke('start-monitoring'),
    stopMonitoring: () => ipcRenderer.invoke('stop-monitoring'),
    getMonitoringStatus: () => ipcRenderer.invoke('get-monitoring-status'),
});
