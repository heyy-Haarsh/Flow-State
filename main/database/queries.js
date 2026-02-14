// FlowState - Prepared SQL Statements
// All database queries centralized here for maintainability

const { getDatabase } = require('./index');

// ============ ACTIVITY EVENTS ============

const insertActivityEvent = (eventType, metricValue, sessionId) => {
  const db = getDatabase();
  return db.prepare(`
    INSERT INTO activity_events (event_type, metric_value, session_id)
    VALUES (?, ?, ?)
  `).run(eventType, metricValue, sessionId);
};

const getRecentEvents = (minutes = 15) => {
  const db = getDatabase();
  return db.prepare(`
    SELECT * FROM activity_events
    WHERE timestamp >= datetime('now', '-${minutes} minutes')
    ORDER BY timestamp DESC
  `).all();
};

// ============ METRICS HOURLY ============

const insertHourlyMetric = (data) => {
  const db = getDatabase();
  return db.prepare(`
    INSERT INTO metrics_hourly (
      hour_start, avg_typing_speed, avg_error_rate, mouse_entropy,
      idle_percentage, tasks_completed, avg_energy_score, work_minutes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    data.hourStart, data.avgTypingSpeed, data.avgErrorRate,
    data.mouseEntropy, data.idlePercentage, data.tasksCompleted,
    data.avgEnergyScore, data.workMinutes
  );
};

const getHourlyMetrics = (hours = 24) => {
  const db = getDatabase();
  return db.prepare(`
    SELECT * FROM metrics_hourly
    WHERE hour_start >= datetime('now', '-${hours} hours')
    ORDER BY hour_start DESC
  `).all();
};

// ============ TASKS ============

const createTask = (task) => {
  const db = getDatabase();
  return db.prepare(`
    INSERT INTO tasks (title, description, complexity, estimated_duration, status)
    VALUES (?, ?, ?, ?, 'pending')
  `).run(task.title, task.description, task.complexity, task.estimatedDuration);
};

const updateTask = (id, updates) => {
  const db = getDatabase();
  const fields = Object.keys(updates)
    .map((key) => `${key} = ?`)
    .join(', ');
  const values = Object.values(updates);
  return db.prepare(`UPDATE tasks SET ${fields} WHERE id = ?`).run(...values, id);
};

const deleteTask = (id) => {
  const db = getDatabase();
  return db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
};

const getTasks = (filter = {}) => {
  const db = getDatabase();
  let query = 'SELECT * FROM tasks';
  const conditions = [];
  const params = [];

  if (filter.status) {
    conditions.push('status = ?');
    params.push(filter.status);
  }
  if (filter.complexity) {
    conditions.push('complexity = ?');
    params.push(filter.complexity);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ' ORDER BY created_at DESC';
  return db.prepare(query).all(...params);
};

const getTasksByComplexity = (complexity) => {
  const db = getDatabase();
  return db.prepare(`
    SELECT * FROM tasks WHERE complexity = ? AND status != 'completed'
    ORDER BY created_at DESC
  `).all(complexity);
  return db.prepare(`
    SELECT * FROM tasks WHERE complexity = ? AND status != 'completed'
    ORDER BY created_at DESC
  `).all(complexity);
};

const getCompletedTasksCount = (minutes) => {
  const db = getDatabase();
  // Assuming 'completed_at' exists in tasks table. Check schema?
  // The previous summary mentions 'completedAt' in Typescript interface.
  // The table schema likely uses 'completed_at' (snake_case).
  // Let's assume completed_at.
  return db.prepare(`
        SELECT COUNT(*) as count FROM tasks 
        WHERE status = 'completed' 
        AND completed_at >= datetime('now', '-${minutes} minutes')
    `).get().count;
};

// ============ QUESTIONNAIRE ============

const saveQuestionnaireResponse = (data) => {
  const db = getDatabase();
  return db.prepare(`
    INSERT INTO questionnaire_responses (
      questionnaire_type, day_number, sleep_quality, current_energy,
      mental_sharpness, stress_level, exercise_today, caffeine_intake,
      expected_work_hours, expected_difficulty, motivation_level,
      external_factors, actual_productivity, hit_wall_time,
      breaks_taken, interventions_helpful
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    data.questionnaire_type, data.day_number, data.sleep_quality,
    data.current_energy, data.mental_sharpness, data.stress_level,
    data.exercise_today, data.caffeine_intake, data.expected_work_hours,
    data.expected_difficulty, data.motivation_level,
    JSON.stringify(data.external_factors),
    data.actual_productivity, data.hit_wall_time,
    data.breaks_taken, JSON.stringify(data.interventions_helpful)
  );
};

const getQuestionnaireResponses = (type = null) => {
  const db = getDatabase();
  if (type) {
    return db.prepare(
      'SELECT * FROM questionnaire_responses WHERE questionnaire_type = ? ORDER BY timestamp DESC'
    ).all(type);
  }
  return db.prepare(
    'SELECT * FROM questionnaire_responses ORDER BY timestamp DESC'
  ).all();
};

// ============ INTERVENTIONS ============

const saveIntervention = (data) => {
  const db = getDatabase();
  return db.prepare(`
    INSERT INTO interventions (type, message, energy_before)
    VALUES (?, ?, ?)
  `).run(data.type, data.message, data.energyBefore);
};

const updateInterventionResponse = (id, accepted, energyAfter) => {
  const db = getDatabase();
  return db.prepare(`
    UPDATE interventions SET accepted = ?, energy_after = ? WHERE id = ?
  `).run(accepted, energyAfter, id);
};

// ============ BREAKS ============

const startBreak = (type, energyBefore) => {
  const db = getDatabase();
  return db.prepare(`
    INSERT INTO breaks (start_time, break_type, energy_before)
    VALUES (datetime('now'), ?, ?)
  `).run(type, energyBefore);
};

const endBreak = (id, energyAfter) => {
  const db = getDatabase();
  return db.prepare(`
    UPDATE breaks 
    SET end_time = datetime('now'),
        duration = CAST((julianday('now') - julianday(start_time)) * 1440 AS INTEGER),
        energy_after = ?
    WHERE id = ?
  `).run(energyAfter, id);
};

// ============ BASELINE ============

const getBaseline = () => {
  const db = getDatabase();
  return db.prepare(
    'SELECT * FROM user_baseline ORDER BY last_updated DESC LIMIT 1'
  ).get();
};

const saveBaseline = (data) => {
  const db = getDatabase();
  return db.prepare(`
    INSERT INTO user_baseline (
      baseline_typing_speed, baseline_error_rate, baseline_tasks_per_day,
      peak_hours, energy_curve, last_updated
    ) VALUES (?, ?, ?, ?, ?, datetime('now'))
  `).run(
    data.typingSpeed, data.errorRate, data.tasksPerDay,
    JSON.stringify(data.peakHours), JSON.stringify(data.energyCurve)
  );
};

// ============ SETTINGS ============

const getSetting = (key) => {
  const db = getDatabase();
  const row = db.prepare('SELECT value FROM user_settings WHERE key = ?').get(key);
  return row ? row.value : null;
};

const setSetting = (key, value) => {
  const db = getDatabase();
  return db.prepare(
    'INSERT OR REPLACE INTO user_settings (key, value) VALUES (?, ?)'
  ).run(key, String(value));
};

const getAllSettings = () => {
  const db = getDatabase();
  const rows = db.prepare('SELECT * FROM user_settings').all();
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
};

// ============ CLEANUP ============

const cleanupOldData = (retentionDays) => {
  if (retentionDays === 0) return; // Keep forever
  const db = getDatabase();

  db.prepare(`
    DELETE FROM activity_events
    WHERE timestamp < datetime('now', '-${retentionDays} days')
  `).run();

  db.prepare(`
    DELETE FROM metrics_hourly
    WHERE hour_start < datetime('now', '-${retentionDays} days')
  `).run();

  // Keep only the latest analysis per context/hour
  db.prepare(`
    DELETE FROM peak_analysis_results
    WHERE id NOT IN (
      SELECT id FROM peak_analysis_results
      ORDER BY analysis_date DESC
      LIMIT 100 -- Keep last ~2 full analyses (48 hours * 2)
    )
  `).run();
};

// ============ PEAK ANALYSIS ============

const savePeakAnalysisResult = (result) => {
  const db = getDatabase();
  return db.prepare(`
    INSERT INTO peak_analysis_results (
      context, hour_of_day, is_peak, peak_score,
      performance_score, consistency_score, sustainability_score,
      confidence_level, window_group_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    result.context, result.hourOfDay, result.isPeak ? 1 : 0, result.peakScore,
    result.performanceScore, result.consistencyScore, result.sustainabilityScore,
    result.confidenceLevel, result.windowGroupId
  );
};

const getPeakAnalysisResults = (context) => {
  const db = getDatabase();
  // Get the most recent analysis for each hour in the given context
  return db.prepare(`
    SELECT * FROM peak_analysis_results
    WHERE context = ?
    AND analysis_date = (
        SELECT analysis_date FROM peak_analysis_results 
        WHERE context = ? 
        ORDER BY analysis_date DESC 
        LIMIT 1
    )
    ORDER BY hour_of_day ASC
  `).all(context, context);
};

// Clear previous results for a fresh run
const clearPeakAnalysisResults = (context) => {
  const db = getDatabase();
  return db.prepare('DELETE FROM peak_analysis_results WHERE context = ?').run(context);
};

// App Usage Tracking

const insertAppUsage = ({ appName, duration, sessionId }) => {
  const db = getDatabase();
  return db.prepare(`
    INSERT INTO app_usage (app_name, duration, session_id)
    VALUES (?, ?, ?)
  `).run(appName, duration, sessionId);
};

const getAppUsageByRange = (hours = 24) => {
  const db = getDatabase();
  return db.prepare(`
    SELECT
      app_name,
      SUM(duration) as total_duration,
      COUNT(*) as session_count
    FROM app_usage
    WHERE timestamp > datetime('now', '-${hours} hours')
    GROUP BY app_name
    ORDER BY total_duration DESC
  `).all();
};

const getAppCategories = () => {
  const db = getDatabase();
  return db.prepare('SELECT * FROM app_categories').all();
};

const setAppCategory = (appName, category) => {
  const db = getDatabase();
  return db.prepare(`
    INSERT OR REPLACE INTO app_categories (app_name, category)
    VALUES (?, ?)
  `).run(appName, category);
};

const getProductiveTime = (hours = 24) => {
  const db = getDatabase();
  const result = db.prepare(`
    SELECT
      COALESCE(ac.category, 'neutral') as category,
      SUM(au.duration) as total_duration
    FROM app_usage au
    LEFT JOIN app_categories ac ON au.app_name = ac.app_name
    WHERE au.timestamp > datetime('now', '-${hours} hours')
    GROUP BY category
  `).all();

  const totals = {
    productive: 0,
    neutral: 0,
    distracting: 0,
  };

  result.forEach(row => {
    totals[row.category] = row.total_duration || 0;
  });

  return totals;
};

// Focus Sessions

const startFocusSession = ({ taskId, plannedDuration, energyAtStart, sessionType }) => {
  const db = getDatabase();

  // First, auto-end any active sessions that were abandoned
  // (sessions older than 3 hours without an end_time are considered abandoned)
  db.prepare(`
    UPDATE focus_sessions
    SET end_time = CURRENT_TIMESTAMP,
        actual_duration = CAST((julianday(CURRENT_TIMESTAMP) - julianday(start_time)) * 86400 AS INTEGER),
        completed = 0
    WHERE end_time IS NULL
    AND start_time < datetime('now', '-3 hours')
  `).run();

  const result = db.prepare(`
    INSERT INTO focus_sessions (task_id, planned_duration, energy_at_start, session_type)
    VALUES (?, ?, ?, ?)
  `).run(taskId || null, plannedDuration, energyAtStart, sessionType || 'pomodoro');

  return result.lastInsertRowid;
};

const endFocusSession = (sessionId, { energyAtEnd, completed }) => {
  const db = getDatabase();

  // Get session start time to calculate actual duration
  const session = db.prepare('SELECT start_time FROM focus_sessions WHERE id = ?').get(sessionId);

  if (!session) return null;

  const actualDuration = Math.floor((Date.now() - new Date(session.start_time).getTime()) / 1000);

  return db.prepare(`
    UPDATE focus_sessions
    SET end_time = CURRENT_TIMESTAMP,
        actual_duration = ?,
        energy_at_end = ?,
        completed = ?
    WHERE id = ?
  `).run(actualDuration, energyAtEnd, completed ? 1 : 0, sessionId);
};

const recordInterruption = ({ sessionId, interruptionType, appName, durationSeconds }) => {
  const db = getDatabase();

  // Insert interruption
  db.prepare(`
    INSERT INTO focus_interruptions (session_id, interruption_type, app_name, duration_seconds)
    VALUES (?, ?, ?, ?)
  `).run(sessionId, interruptionType, appName, durationSeconds || 0);

  // Increment interruption count
  db.prepare(`
    UPDATE focus_sessions
    SET interruption_count = interruption_count + 1
    WHERE id = ?
  `).run(sessionId);
};

const getActiveFocusSession = () => {
  const db = getDatabase();
  return db.prepare(`
    SELECT * FROM focus_sessions
    WHERE end_time IS NULL
    ORDER BY start_time DESC
    LIMIT 1
  `).get();
};

const getFocusHistory = (limit = 20) => {
  const db = getDatabase();
  return db.prepare(`
    SELECT
      fs.*,
      t.title as task_title,
      t.complexity as task_complexity
    FROM focus_sessions fs
    LEFT JOIN tasks t ON fs.task_id = t.id
    WHERE fs.end_time IS NOT NULL
    ORDER BY fs.start_time DESC
    LIMIT ?
  `).all(limit);
};

const getFocusStats = (days = 7) => {
  const db = getDatabase();

  const stats = db.prepare(`
    SELECT
      COUNT(*) as total_sessions,
      SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) as completed_sessions,
      SUM(actual_duration) as total_focus_time,
      AVG(actual_duration) as avg_session_duration,
      SUM(interruption_count) as total_interruptions,
      AVG(interruption_count) as avg_interruptions_per_session
    FROM focus_sessions
    WHERE start_time > datetime('now', '-${days} days')
  `).get();

  return stats;
};

module.exports = {
  insertActivityEvent,
  getRecentEvents,
  insertHourlyMetric,
  getHourlyMetrics,
  createTask,
  updateTask,
  deleteTask,
  getTasks,
  getTasksByComplexity,
  saveQuestionnaireResponse,
  getQuestionnaireResponses,
  saveIntervention,
  updateInterventionResponse,
  startBreak,
  endBreak,
  getBaseline,
  saveBaseline,
  getSetting,
  setSetting,
  getAllSettings,
  cleanupOldData,
  getCompletedTasksCount,
<<<<<<< HEAD
  savePeakAnalysisResult,
  getPeakAnalysisResults,
  clearPeakAnalysisResults,
=======
  insertAppUsage,
  getAppUsageByRange,
  getAppCategories,
  setAppCategory,
  getProductiveTime,
  startFocusSession,
  endFocusSession,
  recordInterruption,
  getActiveFocusSession,
  getFocusHistory,
  getFocusStats,
>>>>>>> f4d4a1e0a3e3349d8ce471f9a57400bd5ce8293c
};
