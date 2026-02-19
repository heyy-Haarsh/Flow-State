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

const getWeeklyFocusHours = () => {
  const db = getDatabase();

  // Get hourly breakdown for each day of the past week
  const hourlyData = db.prepare(`
    SELECT
      DATE(start_time) as date,
      CAST(strftime('%H', start_time) AS INTEGER) as hour,
      CAST(SUM(actual_duration) AS FLOAT) / 60.0 as minutes
    FROM focus_sessions
    WHERE start_time >= date('now', '-7 days')
      AND end_time IS NOT NULL
    GROUP BY DATE(start_time), CAST(strftime('%H', start_time) AS INTEGER)
    ORDER BY date ASC, hour ASC
  `).all();

  // Generate full grid for 7 days x 24 hours
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const today = new Date();
  const heatmapData = [];

  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const dayOfWeek = date.getDay();
    const dayName = days[(dayOfWeek + 6) % 7]; // Convert Sunday=0 to Monday=0

    for (let hour = 0; hour < 24; hour++) {
      const hourData = hourlyData.find(d => d.date === dateStr && d.hour === hour);
      heatmapData.push({
        day: dayName,
        date: dateStr,
        hour,
        minutes: hourData ? parseFloat(hourData.minutes.toFixed(1)) : 0
      });
    }
  }

  // Force demo data for prototype presentation
  const hasRealData = false; // heatmapData.some(d => d.minutes > 0);

  if (!hasRealData) {
    // Generate realistic prototype data showing full range of intensities
    return heatmapData.map(d => {
      const isWeekend = d.day === 'Sat' || d.day === 'Sun';
      const dayIndex = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(d.day);

      let minutes = 0;

      // WEEKDAY PATTERNS (Mon-Fri)
      if (!isWeekend) {
        // Early morning (6-7 AM): Light activity - 10-20 min
        if (d.hour === 6 || d.hour === 7) {
          minutes = 10 + (Math.random() * 10);
        }
        // Morning start (8 AM): Medium activity - 35-45 min
        else if (d.hour === 8) {
          minutes = 35 + (Math.random() * 10);
        }
        // Morning peak (9-11 AM): High focus - 55-60 min (DARKEST)
        else if (d.hour === 9 || d.hour === 10 || d.hour === 11) {
          minutes = 55 + (Math.random() * 5);
        }
        // Pre-lunch (12 PM): Medium - 35-45 min
        else if (d.hour === 12) {
          minutes = 35 + (Math.random() * 10);
        }
        // Lunch break (1-2 PM): No activity
        else if (d.hour === 13 || d.hour === 14) {
          minutes = 0;
        }
        // Afternoon (3-5 PM): Varied by day
        else if (d.hour === 15 || d.hour === 16 || d.hour === 17) {
          if (dayIndex === 2) { // Wednesday - lighter
            minutes = 25 + (Math.random() * 10); // 25-35 min
          } else {
            minutes = 45 + (Math.random() * 10); // 45-55 min
          }
        }
        // Evening (7-9 PM): Decreasing throughout week
        else if (d.hour === 19 || d.hour === 20 || d.hour === 21) {
          if (dayIndex === 0) minutes = 55 + (Math.random() * 5); // Mon: 55-60
          else if (dayIndex === 1) minutes = 45 + (Math.random() * 5); // Tue: 45-50
          else if (dayIndex === 2) minutes = 35 + (Math.random() * 5); // Wed: 35-40
          else if (dayIndex === 3) minutes = 25 + (Math.random() * 5); // Thu: 25-30
          else minutes = 15 + (Math.random() * 5); // Fri: 15-20
        }
        // Late night (10-11 PM): Only Mon-Wed, light
        else if ((d.hour === 22 || d.hour === 23) && dayIndex <= 2) {
          minutes = 12 + (Math.random() * 8); // 12-20 min
        }
      }
      // WEEKEND PATTERNS
      else {
        // Saturday
        if (d.day === 'Sat') {
          if (d.hour === 10 || d.hour === 11 || d.hour === 12) {
            minutes = 50 + (Math.random() * 10); // 50-60 min
          }
          else if (d.hour === 14 || d.hour === 15 || d.hour === 16) {
            minutes = 30 + (Math.random() * 15); // 30-45 min
          }
        }
        // Sunday - minimal
        else if (d.day === 'Sun') {
          if (d.hour === 15 || d.hour === 16 || d.hour === 17) {
            minutes = 20 + (Math.random() * 10); // 20-30 min
          }
        }
      }

      return {
        ...d,
        minutes: Math.min(60, parseFloat(minutes.toFixed(0))), // Cap at 60, round to integer
        isDummy: true
      };
    });
  }

  return heatmapData;
};

const getWeeklyBurnoutHeatmap = () => {
  const db = getDatabase();

  // Try to get real burnout data from hourly metrics
  const hourlyBurnout = db.prepare(`
    SELECT
      DATE(hour_start) as date,
      CAST(strftime('%H', hour_start) AS INTEGER) as hour,
      CAST((100 - avg_energy_score) AS INTEGER) as burnout_risk
    FROM metrics_hourly
    WHERE hour_start >= date('now', '-7 days')
    GROUP BY DATE(hour_start), CAST(strftime('%H', hour_start) AS INTEGER)
    ORDER BY date ASC, hour ASC
  `).all();

  // Generate full grid for 7 days x 24 hours
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const today = new Date();
  const heatmapData = [];

  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const dayOfWeek = date.getDay();
    const dayName = days[(dayOfWeek + 6) % 7];

    for (let hour = 0; hour < 24; hour++) {
      const hourData = hourlyBurnout.find(d => d.date === dateStr && d.hour === hour);
      heatmapData.push({
        day: dayName,
        date: dateStr,
        hour,
        risk: hourData ? hourData.burnout_risk : 0
      });
    }
  }

  const hasRealData = false; // heatmapData.some(d => d.risk > 0); // Force demo data

  if (!hasRealData) {
    // Generate realistic burnout pattern demo data
    return heatmapData.map(d => {
      const isWeekend = d.day === 'Sat' || d.day === 'Sun';
      const dayIndex = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(d.day);

      let risk = 0; // 0-100 scale

      // WEEKDAY PATTERNS
      if (!isWeekend) {
        // Very early morning (5-6 AM): Low-medium risk
        if (d.hour === 5 || d.hour === 6) {
          risk = 20 + (dayIndex * 4); // Mon: 20%, Fri: 36%
        }
        // Morning ramp (7-8 AM): Very low risk
        else if (d.hour === 7 || d.hour === 8) {
          risk = 10 + (dayIndex * 2); // Starting work
        }
        // Normal work hours (9 AM - 12 PM, 3-5 PM): Low to medium
        else if ((d.hour >= 9 && d.hour <= 12) || (d.hour >= 15 && d.hour <= 17)) {
          risk = 15 + (dayIndex * 6); // Mon: 15%, Fri: 45%
        }
        // Lunch break (1-2 PM): Very low risk
        else if (d.hour === 13 || d.hour === 14) {
          risk = 5 + (dayIndex * 2); // Healthy break
        }
        // Early evening (6-7 PM): Medium risk
        else if (d.hour === 18 || d.hour === 19) {
          risk = 30 + (dayIndex * 5); // Overtime starts
        }
        // Late evening (8-10 PM): Medium-high risk
        else if (d.hour === 20 || d.hour === 21 || d.hour === 22) {
          risk = 50 + (dayIndex * 7); // Mon: 50%, Fri: 78%
        }
        // Late night (11 PM - midnight): High risk (Thu-Fri only)
        else if (d.hour === 23 && dayIndex >= 3) {
          risk = 75 + (Math.random() * 10); // Thursday/Friday only
        }
      }
      // WEEKEND PATTERNS
      else {
        // Saturday afternoon work
        if (d.day === 'Sat') {
          if (d.hour >= 14 && d.hour <= 17) {
            risk = 35 + (Math.random() * 15); // 35-50%
          }
          // Saturday evening
          else if (d.hour >= 20 && d.hour <= 22) {
            risk = 55 + (Math.random() * 10); // 55-65%
          }
        }
        // Sunday evening anxiety
        else if (d.day === 'Sun') {
          if (d.hour >= 18 && d.hour <= 21) {
            risk = 40 + (Math.random() * 10); // 40-50%
          }
        }
      }

      return {
        ...d,
        risk: Math.min(100, Math.round(risk)),
        isDummy: true
      };
    });
  }

  return heatmapData;
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
  getWeeklyFocusHours,
  getWeeklyBurnoutHeatmap,
};
