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
};
