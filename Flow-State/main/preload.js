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
    getBurnoutAnalysis: (useDemoData, scenarioIndex) => ipcRenderer.invoke('get-burnout-analysis', useDemoData, scenarioIndex),

    // ML Model & Pipeline
    triggerModelTraining: () => ipcRenderer.invoke('trigger-model-training'),
    getModelStatus: () => ipcRenderer.invoke('get-model-status'),
    getPipelinePrediction: () => ipcRenderer.invoke('get-pipeline-prediction'),

    // Privacy & Settings
    getSettings: () => ipcRenderer.invoke('get-settings'),
    updateSetting: (key, value) => ipcRenderer.invoke('update-setting', key, value),
    exportData: (format) => ipcRenderer.invoke('export-data', format),
    deleteAllData: () => ipcRenderer.invoke('delete-all-data'),

    // Monitoring control
    startMonitoring: () => ipcRenderer.invoke('start-monitoring'),
    stopMonitoring: () => ipcRenderer.invoke('stop-monitoring'),
    getMonitoringStatus: () => ipcRenderer.invoke('get-monitoring-status'),

    // Tray menu navigation
    onNavigateTo: (callback) => {
        ipcRenderer.on('navigate-to', (_event, page) => callback(page));
    },
    onTriggerBreak: (callback) => {
        ipcRenderer.on('trigger-break', () => callback());
    },

    // Notifications
    updateNotificationSettings: (settings) => ipcRenderer.invoke('update-notification-settings', settings),
    testNotification: () => ipcRenderer.invoke('test-notification'),

    // App Usage Tracking
    getAppUsage: (hours) => ipcRenderer.invoke('get-app-usage', hours),
    getProductiveTime: (hours) => ipcRenderer.invoke('get-productive-time', hours),
    getAppCategories: () => ipcRenderer.invoke('get-app-categories'),
    setAppCategory: (appName, category) => ipcRenderer.invoke('set-app-category', appName, category),

    // Focus Sessions
    startFocusSession: (data) => ipcRenderer.invoke('start-focus-session', data),
    endFocusSession: (sessionId, data) => ipcRenderer.invoke('end-focus-session', sessionId, data),
    getActiveFocusSession: () => ipcRenderer.invoke('get-active-focus-session'),
    getFocusHistory: (limit) => ipcRenderer.invoke('get-focus-history', limit),
    getFocusStats: (days) => ipcRenderer.invoke('get-focus-stats', days),
    getWeeklyFocusHours: () => ipcRenderer.invoke('get-weekly-focus-hours'),
    getWeeklyBurnoutHeatmap: () => ipcRenderer.invoke('get-weekly-burnout-heatmap'),
    getSuggestedDuration: () => ipcRenderer.invoke('get-suggested-duration'),
    getSystemTime: () => ipcRenderer.invoke('get-system-time'),

    // Debug
    getDatabaseStats: () => ipcRenderer.invoke('get-database-stats'),
});
