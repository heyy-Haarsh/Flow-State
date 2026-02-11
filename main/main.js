const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const db = require('./database/index');
const queries = require('./database/queries');
const mlInference = require('./services/ml-inference');
const activityAggregator = require('./monitoring/activity-aggregator');
const globalInputHook = require('./monitoring/global-input-hook');
const keyboardMonitor = require('./monitoring/keyboard-monitor');
const mouseMonitor = require('./monitoring/mouse-monitor');

// App Global State
const state = {
  sessionId: `session_${Date.now()}`,
  sessionStartTime: Date.now(),
  lastBreakTime: Date.now(),
};

// ---- Service Initialization ----

function initializeServices() {
  // 1. Load ML model
  try {
    mlInference.loadModel();
  } catch (err) {
    console.warn('[Main] Failed to load ML model:', err.message);
  }

  // 2. Start activity aggregator (hourly rollups)
  try {
    activityAggregator.start();
  } catch (err) {
    console.warn('[Main] Failed to start activity aggregator:', err.message);
  }

  // 3. Initialize global input hooks (uiohook-napi)
  const hookAvailable = globalInputHook.init();
  if (hookAvailable) {
    globalInputHook.start();
    keyboardMonitor.start(state.sessionId);
    mouseMonitor.start(state.sessionId);
    console.log('[Main] Global input tracking ACTIVE');
  } else {
    console.warn('[Main] Global hooks unavailable — falling back to in-app tracking only');
  }
}

// ---- Energy score update loop ----
// Push energy score to renderer every 30 seconds
let energyInterval = null;

function startEnergyLoop() {
  energyInterval = setInterval(async () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    try {
      const score = await getEnergyScore();
      mainWindow.webContents.send('energy-update', score);
    } catch (err) {
      // Silently continue
    }
  }, 30000);
}

function stopEnergyLoop() {
  if (energyInterval) {
    clearInterval(energyInterval);
    energyInterval = null;
  }
}

// ---- Energy Score Calculation ----

async function getEnergyScore() {
  try {
    // 1. Get Activity Metrics
    const act5 = activityAggregator.getRecentMetrics(5);
    const act15 = activityAggregator.getRecentMetrics(15);

    // Also get live stats from global monitors for more accurate real-time data
    const kbLive = keyboardMonitor.getLiveStats();
    const msLive = mouseMonitor.getLiveStats();

    // Merge live stats with aggregated (prefer live data if aggregated is empty)
    const typingSpeed5 = act5.typingSpeed || kbLive.typingSpeed;
    const errorRate5 = act5.errorRate || kbLive.errorRate;
    const mouseEntropy = act5.mouseEntropy || msLive.entropy;
    const idlePercentage = act5.idlePercentage || msLive.idlePercentage;

    // 2. Get User Context (Questionnaire)
    const questionnaires = queries.getQuestionnaireResponses('morning_checkin');
    const latestQ = questionnaires[0] || {};

    // 3. Get Baseline
    const baseline = queries.getBaseline() || {
      baseline_typing_speed: 50,
      baseline_error_rate: 0.05,
    };

    // 4. Get Task Count
    const tasksCompleted = queries.getCompletedTasksCount(60);

    // 5. Construct Feature Vector
    const features = {
      typing_speed_5min: typingSpeed5,
      typing_speed_15min: act15.typingSpeed || typingSpeed5,
      error_rate_5min: errorRate5,
      error_rate_15min: act15.errorRate || errorRate5,
      mouse_entropy: mouseEntropy,
      idle_percentage: idlePercentage,
      session_duration: (Date.now() - state.sessionStartTime) / 60000,
      time_since_break: (Date.now() - state.lastBreakTime) / 60000,
      tasks_completed_hour: tasksCompleted,
      hour_of_day: new Date().getHours(),
      day_of_week: new Date().getDay(),
      sleep_quality: latestQ.sleep_quality || 7,
      stress_level: latestQ.stress_level || 3,
      caffeine_intake: latestQ.caffeine_intake || 1,
      exercise_today: latestQ.exercise_today ? 1 : 0,
      expected_difficulty: latestQ.expected_difficulty || 5,
      typing_speed_ratio: typingSpeed5 / (baseline.baseline_typing_speed || 1),
      error_rate_ratio: errorRate5 / (baseline.baseline_error_rate || 0.01),
    };

    // 6. Predict
    const score = await mlInference.predict(features);
    return score !== null ? score : 70;
  } catch (error) {
    console.error('[Main] Error in get-energy-score:', error);
    return 70;
  }
}

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    titleBarStyle: 'hiddenInset',
    show: false,
    backgroundColor: '#0f172a',
  });

  // Load app — determine if dev or production
  const isDev =
    (process.env.NODE_ENV || '').trim().toLowerCase() === 'development' ||
    !require('fs').existsSync(path.join(__dirname, '../dist/index.html'));

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
    console.log('[Main] Loading from Vite dev server (http://localhost:5173)');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    startEnergyLoop();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    stopEnergyLoop();
  });
}

// ---- IPC Handlers ----

// Database: Questionnaire
ipcMain.handle('save-questionnaire', (_, data) => queries.saveQuestionnaireResponse(data));
ipcMain.handle('get-questionnaire-history', () => queries.getQuestionnaireResponses());

// Database: Tasks
ipcMain.handle('create-task', (_, task) => queries.createTask(task));
ipcMain.handle('update-task', (_, id, updates) => queries.updateTask(id, updates));
ipcMain.handle('delete-task', (_, id) => queries.deleteTask(id));
ipcMain.handle('get-tasks', (_, filter) => queries.getTasks(filter));

// ML & Energy
ipcMain.handle('get-energy-score', async () => {
  return await getEnergyScore();
});

// Monitoring status — shows global tracking state
ipcMain.handle('get-monitoring-status', () => {
  return {
    globalHook: globalInputHook.getStatus(),
    keyboard: keyboardMonitor.getStatus(),
    mouse: mouseMonitor.getStatus(),
    liveKeyboard: keyboardMonitor.getLiveStats(),
    liveMouse: mouseMonitor.getLiveStats(),
  };
});

// Start/stop monitoring
ipcMain.handle('start-monitoring', () => {
  const hookAvailable = globalInputHook.getStatus().isAvailable;
  if (hookAvailable && !globalInputHook.getStatus().isRunning) {
    globalInputHook.start();
  }
  if (!keyboardMonitor.getStatus().isRunning) {
    keyboardMonitor.start(state.sessionId);
  }
  if (!mouseMonitor.getStatus().isRunning) {
    mouseMonitor.start(state.sessionId);
  }
  return { success: true };
});

ipcMain.handle('stop-monitoring', () => {
  keyboardMonitor.stop();
  mouseMonitor.stop();
  return { success: true };
});

// Activity Metrics (for Analytics page)
ipcMain.handle('get-activity-metrics', (_, timeRange) => {
  return queries.getHourlyMetrics(timeRange || 24);
});

// Breaks
ipcMain.handle('start-break', (_, type) => {
  const result = queries.startBreak(type, 0);
  return result;
});

ipcMain.handle('end-break', (_, id) => {
  state.lastBreakTime = Date.now();
  return queries.endBreak(id, 0);
});

// Settings
ipcMain.handle('get-settings', () => queries.getAllSettings());
ipcMain.handle('update-setting', (_, key, value) => queries.setSetting(key, value));

// ML Model
ipcMain.handle('get-model-status', () => {
  return mlInference.getStatus();
});

ipcMain.handle('trigger-model-training', async () => {
  // Trigger Python training script
  const { spawn } = require('child_process');
  return new Promise((resolve) => {
    const proc = spawn('python', ['train_model.py'], {
      cwd: path.join(__dirname, '../ml-service'),
    });
    proc.on('close', (code) => {
      resolve({ success: code === 0, exitCode: code });
    });
    proc.on('error', (err) => {
      resolve({ success: false, error: err.message });
    });
  });
});

// Privacy: Data Export & Delete
ipcMain.handle('export-data', (_, format) => {
  try {
    const data = {
      tasks: queries.getTasks(),
      questionnaires: queries.getQuestionnaireResponses(),
      hourlyMetrics: queries.getHourlyMetrics(720), // 30 days
      settings: queries.getAllSettings(),
      exportedAt: new Date().toISOString(),
    };
    return { success: true, data: JSON.stringify(data, null, 2) };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('delete-all-data', () => {
  try {
    queries.cleanupOldData(0); // Delete everything
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Analytics
ipcMain.handle('get-analytics', (_, range) => {
  return queries.getHourlyMetrics(range || 24);
});

ipcMain.handle('get-daily-summary', (_, date) => {
  return queries.getHourlyMetrics(24);
});

ipcMain.handle('get-weekly-summary', () => {
  return queries.getHourlyMetrics(168); // 7 days
});

// Interventions
ipcMain.handle('respond-intervention', (_, id, accepted) => {
  return queries.updateInterventionResponse(id, accepted, 0);
});

// ---- App Lifecycle ----

app.whenReady().then(() => {
  initializeServices();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // Cleanup before exit
    keyboardMonitor.stop();
    mouseMonitor.stop();
    globalInputHook.stop();
    activityAggregator.stop();
    stopEnergyLoop();
    app.quit();
  }
});

app.on('before-quit', () => {
  keyboardMonitor.stop();
  mouseMonitor.stop();
  globalInputHook.stop();
  activityAggregator.stop();
  stopEnergyLoop();
});
