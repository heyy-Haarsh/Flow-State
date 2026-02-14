// FlowState - Database Migrations
// Creates all tables on first run

function runMigrations(db) {
    db.exec(`
    -- Raw activity events (auto-delete after 7 days)
    CREATE TABLE IF NOT EXISTS activity_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      event_type TEXT,
      metric_value REAL,
      session_id TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_events_timestamp ON activity_events(timestamp);

    -- Hourly aggregated metrics (keep 30 days)
    CREATE TABLE IF NOT EXISTS metrics_hourly (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hour_start DATETIME,
      avg_typing_speed REAL,
      avg_error_rate REAL,
      mouse_entropy REAL,
      idle_percentage REAL,
      tasks_completed INTEGER,
      avg_energy_score INTEGER,
      work_minutes INTEGER
    );
    CREATE INDEX IF NOT EXISTS idx_hourly_time ON metrics_hourly(hour_start);

    -- Daily summaries (keep forever - for ML training)
    CREATE TABLE IF NOT EXISTS metrics_daily (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date DATE UNIQUE,
      avg_energy INTEGER,
      tasks_completed INTEGER,
      work_hours REAL,
      peak_hours TEXT,
      burnout_score REAL
    );

    -- Tasks
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      complexity TEXT CHECK(complexity IN ('low', 'medium', 'high')),
      estimated_duration INTEGER,
      actual_duration INTEGER,
      status TEXT CHECK(status IN ('pending', 'in_progress', 'completed')) DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME
    );

    -- Questionnaire responses (CRITICAL for ML training)
    CREATE TABLE IF NOT EXISTS questionnaire_responses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      questionnaire_type TEXT,
      day_number INTEGER,
      sleep_quality INTEGER,
      current_energy INTEGER,
      mental_sharpness INTEGER,
      stress_level INTEGER,
      exercise_today BOOLEAN,
      caffeine_intake INTEGER,
      expected_work_hours REAL,
      expected_difficulty INTEGER,
      motivation_level INTEGER,
      external_factors TEXT,
      actual_productivity INTEGER,
      hit_wall_time TEXT,
      breaks_taken INTEGER,
      interventions_helpful TEXT
    );

    -- Interventions (system suggestions)
    CREATE TABLE IF NOT EXISTS interventions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      type TEXT,
      message TEXT,
      accepted BOOLEAN,
      energy_before INTEGER,
      energy_after INTEGER
    );

    -- Breaks
    CREATE TABLE IF NOT EXISTS breaks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      start_time DATETIME,
      end_time DATETIME,
      duration INTEGER,
      break_type TEXT,
      energy_before INTEGER,
      energy_after INTEGER
    );

    -- User baseline (learned over Week 1)
    CREATE TABLE IF NOT EXISTS user_baseline (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      baseline_typing_speed REAL,
      baseline_error_rate REAL,
      baseline_tasks_per_day INTEGER,
      peak_hours TEXT,
      energy_curve TEXT,
      last_updated DATETIME
    );

    -- User settings
    CREATE TABLE IF NOT EXISTS user_settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    -- App usage tracking
    CREATE TABLE IF NOT EXISTS app_usage (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      app_name TEXT NOT NULL,
      duration INTEGER NOT NULL,
      session_id TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_app_usage_timestamp ON app_usage(timestamp);
    CREATE INDEX IF NOT EXISTS idx_app_usage_app_name ON app_usage(app_name);

    -- App categories (productive/neutral/distracting)
    CREATE TABLE IF NOT EXISTS app_categories (
      app_name TEXT PRIMARY KEY,
      category TEXT CHECK(category IN ('productive', 'neutral', 'distracting')) DEFAULT 'neutral'
    );

    -- Focus sessions
    CREATE TABLE IF NOT EXISTS focus_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER,
      start_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      end_time DATETIME,
      planned_duration INTEGER,
      actual_duration INTEGER,
      interruption_count INTEGER DEFAULT 0,
      energy_at_start INTEGER,
      energy_at_end INTEGER,
      completed BOOLEAN DEFAULT 0,
      session_type TEXT DEFAULT 'pomodoro',
      FOREIGN KEY (task_id) REFERENCES tasks(id)
    );
    CREATE INDEX IF NOT EXISTS idx_focus_sessions_start ON focus_sessions(start_time);

    -- Focus interruptions
    CREATE TABLE IF NOT EXISTS focus_interruptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      interruption_type TEXT,
      app_name TEXT,
      duration_seconds INTEGER,
      FOREIGN KEY (session_id) REFERENCES focus_sessions(id)
    );
  `);

    // Insert default settings if not present
    const insertSetting = db.prepare(
        'INSERT OR IGNORE INTO user_settings (key, value) VALUES (?, ?)'
    );

    const defaultSettings = [
        ['data_retention_days', '30'],
        ['monitoring_enabled', 'true'],
        ['break_reminder_enabled', 'true'],
        ['calibration_day', '0'],
        ['model_trained', 'false'],
        ['theme', 'dark'],
    ];

    const insertMany = db.transaction((settings) => {
        for (const [key, value] of settings) {
            insertSetting.run(key, value);
        }
    });

    insertMany(defaultSettings);
}

module.exports = { runMigrations };
