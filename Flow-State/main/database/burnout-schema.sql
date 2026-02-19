-- Burnout Analysis Tables
-- Stores burnout risk scores and component metrics

-- Weekly burnout scores
CREATE TABLE IF NOT EXISTS burnout_weekly (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  week_start TEXT NOT NULL,
  week_end TEXT NOT NULL,
  composite_score REAL NOT NULL,
  risk_level TEXT NOT NULL,
  trend TEXT NOT NULL,

  -- Component scores
  velocity_score REAL NOT NULL,
  recovery_score REAL NOT NULL,
  variance_score REAL NOT NULL,
  overwork_score REAL NOT NULL,
  quality_pace_score REAL NOT NULL,
  avoidance_score REAL NOT NULL,

  -- Dominant factors JSON array
  dominant_factors TEXT,

  -- Recommendations JSON array
  recommendations TEXT,

  created_at TEXT DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(week_start)
);

-- Weekly aggregate metrics for burnout calculation
CREATE TABLE IF NOT EXISTS burnout_weekly_metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  week_start TEXT NOT NULL,
  week_end TEXT NOT NULL,

  -- Performance metrics
  tasks_completed INTEGER DEFAULT 0,
  complex_tasks_completed INTEGER DEFAULT 0,

  -- Energy metrics
  avg_energy REAL DEFAULT 0,
  energy_std_dev REAL DEFAULT 0,
  low_energy_percentage REAL DEFAULT 0,

  -- Recovery metrics
  avg_recovery_gain REAL DEFAULT 0,
  break_count INTEGER DEFAULT 0,

  -- Work pattern metrics
  long_sessions_count INTEGER DEFAULT 0,
  late_night_hours REAL DEFAULT 0,
  weekend_hours REAL DEFAULT 0,
  avg_break_interval REAL DEFAULT 0,

  -- Quality metrics
  avg_keys_per_min REAL DEFAULT 0,
  avg_error_rate REAL DEFAULT 0,

  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(week_start)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_burnout_weekly_week_start
  ON burnout_weekly(week_start);

CREATE INDEX IF NOT EXISTS idx_burnout_metrics_week_start
  ON burnout_weekly_metrics(week_start);

CREATE INDEX IF NOT EXISTS idx_burnout_weekly_created
  ON burnout_weekly(created_at);
