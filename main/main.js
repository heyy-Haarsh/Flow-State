const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const db = require('./database/index');
const queries = require('./database/queries');
const mlPipeline = require('./services/ml-inference');
const interventionEngine = require('./services/intervention-engine');
const { extractCurrentFeatures, recordInterventionResponse, recordTaskSwitch, resetTracking } = require('./ml/feature-extractor');
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

async function initializeServices() {
  // 1. Load ML pipeline (all 3 models)
  try {
    await mlPipeline.loadModels();
    const status = mlPipeline.getStatus();
    console.log('[Main] ML Pipeline status:', JSON.stringify(status.pipelineLoaded));
  } catch (err) {
    console.warn('[Main] Failed to load ML pipeline:', err.message);
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
// Push energy score + interventions to renderer every 30 seconds
let energyInterval = null;

function startEnergyLoop() {
  energyInterval = setInterval(async () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    try {
      const pipelineResult = await runPipeline();

      // Send energy score
      mainWindow.webContents.send('energy-update', pipelineResult.energyScore || 70);

      // Check for interventions
      const intervention = checkInterventions(pipelineResult);
      if (intervention) {
        mainWindow.webContents.send('intervention', intervention);
      }
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

// ---- Full Pipeline Run ----

async function runPipeline() {
  try {
    // 1. Get Activity Metrics
    const act5 = activityAggregator.getRecentMetrics(5);
    const act15 = activityAggregator.getRecentMetrics(15);

    // Live stats from global monitors
    const kbLive = keyboardMonitor.getLiveStats();
    const msLive = mouseMonitor.getLiveStats();

    // Merge live stats with aggregated
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

    // 5. Get intervention tracking state
    const interventionState = interventionEngine.getTrackingState();

    // 6. Build session context for feature extractor
    const sessionContext = {
      sessionDuration: (Date.now() - state.sessionStartTime) / 60000,
      timeSinceBreak: (Date.now() - state.lastBreakTime) / 60000,
      tasksCompletedHour: tasksCompleted,
      sleepQuality: latestQ.sleep_quality || 7,
      stressLevel: latestQ.stress_level || 3,
      caffeineIntake: latestQ.caffeine_intake || 1,
      exerciseToday: latestQ.exercise_today ? 1 : 0,
      expectedDifficulty: latestQ.expected_difficulty || 5,
      taskSwitchesLastHour: 0, // TODO: track from task switch events
      userAvgSessionLength: 90,
      historicalAcceptanceRate: interventionState.historicalAcceptanceRate,
      currentTask: {}, // TODO: get from task manager
      pendingTasks: [],
    };

    // 7. Extract unified features
    const features = extractCurrentFeatures(sessionContext);

    // Enrich with intervention tracking
    features.minutes_since_last_prompt = interventionState.minutesSinceLastPrompt;
    features.last_prompt_accepted = interventionState.lastPromptAccepted ? 1 : 0;
    features.prompts_dismissed_streak = interventionState.promptsDismissedStreak;
    features.historical_acceptance_rate = interventionState.historicalAcceptanceRate;

    // 8. Run full ML pipeline
    const pipelineResult = await mlPipeline.predictPipeline(features);

    return pipelineResult;
  } catch (error) {
    console.error('[Main] Pipeline error:', error);
    return { energyScore: 70, shouldSuggestBreak: false, shouldSuggestSwitch: false };
  }
}

// ---- Intervention Check ----

function checkInterventions(pipelineResult) {
  const context = {
    currentEnergy: pipelineResult.energyScore || 70,
    sessionDuration: (Date.now() - state.sessionStartTime) / 60000,
    timeSinceBreak: (Date.now() - state.lastBreakTime) / 60000,
    errorRate: 0, // TODO: pass from pipeline features
    baselineErrorRate: 0.05,
    currentTask: {},
    pendingTasks: [],
  };

  return interventionEngine.evaluate(context, pipelineResult);
}

// ---- Legacy Energy Score (backward compatibility) ----

async function getEnergyScore() {
  try {
    const result = await runPipeline();
    return result.energyScore !== null ? result.energyScore : 70;
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

// Full pipeline prediction (new)
ipcMain.handle('get-pipeline-prediction', async () => {
  return await runPipeline();
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
  interventionEngine.resetCooldown();
  return queries.endBreak(id, 0);
});

// Settings
ipcMain.handle('get-settings', () => queries.getAllSettings());
ipcMain.handle('update-setting', (_, key, value) => queries.setSetting(key, value));

// ML Model Status (enhanced)
ipcMain.handle('get-model-status', () => {
  return mlPipeline.getStatus();
});

ipcMain.handle('trigger-model-training', async () => {
  // Trigger Python training script (trains all 3 models)
  const { spawn } = require('child_process');
  return new Promise((resolve) => {
    const proc = spawn('python', ['export_onnx.py'], {
      cwd: path.join(__dirname, '../ml-service'),
    });
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (data) => { stdout += data.toString(); });
    proc.stderr.on('data', (data) => { stderr += data.toString(); });
    proc.on('close', async (code) => {
      if (code === 0) {
        // Reload models after training
        try {
          await mlPipeline.loadModels();
        } catch (e) {
          console.warn('[Main] Failed to reload models after training:', e.message);
        }
      }
      resolve({
        success: code === 0,
        exitCode: code,
        output: stdout.slice(-500),
        pipelineStatus: mlPipeline.getStatus(),
      });
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
  // Update intervention engine tracking
  interventionEngine.recordResponse(id, accepted);
  // Update feature extractor tracking
  recordInterventionResponse(accepted);
  // Update database
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
