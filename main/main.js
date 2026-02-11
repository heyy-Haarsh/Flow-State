const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const db = require('./database/index');
const queries = require('./database/queries');
const mlInference = require('./services/ml-inference');
const activityAggregator = require('./monitoring/activity-aggregator');

// App Global State
const state = {
  sessionStartTime: Date.now(),
  lastBreakTime: Date.now(),
};

// Initialize services (will only run if dependencies are installed)
try {
  mlInference.loadModel();
  activityAggregator.start();
} catch (err) {
  console.warn('Failed to initialize ML/Monitoring services:', err.message);
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

  // Load app
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
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
  try {
    // 1. Get Activity Metrics
    const act5 = activityAggregator.getRecentMetrics(5); // last 5 min
    const act15 = activityAggregator.getRecentMetrics(15); // last 15 min

    if (!act5 || !act15) return 70; // default if no data

    // 2. Get User Context (Questionnaire)
    const questionnaires = queries.getQuestionnaireResponses('morning_checkin');
    const latestQ = questionnaires[0] || {}; // latest response

    // 3. Get Baseline
    const baseline = queries.getBaseline() || { baseline_typing_speed: 50, baseline_error_rate: 0.05 };

    // 4. Get Task Limit
    const tasksCompleted = queries.getCompletedTasksCount(60); // last hour

    // 5. Construct Feature Vector
    const features = {
      typing_speed_5min: act5.typingSpeed,
      typing_speed_15min: act15.typingSpeed,
      error_rate_5min: act5.errorRate,
      error_rate_15min: act15.errorRate,
      mouse_entropy: act5.mouseEntropy,
      idle_percentage: act5.idlePercentage,
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
      typing_speed_ratio: act5.typingSpeed / (baseline.baseline_typing_speed || 1),
      error_rate_ratio: act5.errorRate / (baseline.baseline_error_rate || 0.01),
    };

    // 6. Predict
    const score = await mlInference.predict(features);
    return score !== null ? score : 70;

  } catch (error) {
    console.error('Error in get-energy-score:', error);
    return 70;
  }
});

// Breaks
ipcMain.handle('start-break', (_, type) => {
  const result = queries.startBreak(type, 0); // energyBefore is approx
  return result;
});

ipcMain.handle('end-break', (_, id) => {
  state.lastBreakTime = Date.now(); // reset break timer
  return queries.endBreak(id, 0); // energyAfter is approx
});

// Settings
ipcMain.handle('get-settings', () => queries.getAllSettings());
ipcMain.handle('update-setting', (_, key, value) => queries.setSetting(key, value));

// App Lifecycle
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
