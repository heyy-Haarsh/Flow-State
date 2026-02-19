-- FlowState Manager Portal - Database Schema
-- PostgreSQL Database Setup

-- Create database (run this manually first)
-- CREATE DATABASE flowstate_manager;

-- Users table (Managers + Employees)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('manager', 'employee')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);

-- Teams table (Manager-Employee relationships)
CREATE TABLE IF NOT EXISTS teams (
    id SERIAL PRIMARY KEY,
    manager_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    employee_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(manager_id, employee_id)
);

-- Tasks table (centralized task management)
CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    complexity VARCHAR(20) CHECK (complexity IN ('low', 'medium', 'high')),
    estimated_duration INTEGER, -- in minutes
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    due_date TIMESTAMP,

    -- Assignment info
    assigned_to INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Completion tracking
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    actual_duration INTEGER, -- in minutes

    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Sync tracking (for employee app sync)
    synced_to_employee BOOLEAN DEFAULT false,
    last_synced_at TIMESTAMP
);

-- Task comments/notes
CREATE TABLE IF NOT EXISTS task_comments (
    id SERIAL PRIMARY KEY,
    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    comment TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Employee metrics (synced from employee desktop app)
CREATE TABLE IF NOT EXISTS employee_metrics (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    metric_date DATE NOT NULL,

    -- Energy & Focus
    avg_energy_score DECIMAL(5,2),
    total_focus_time INTEGER, -- minutes
    total_focus_sessions INTEGER,
    avg_session_duration INTEGER, -- minutes

    -- Productivity
    tasks_completed INTEGER DEFAULT 0,
    total_work_time INTEGER, -- minutes
    interruptions_count INTEGER DEFAULT 0,

    -- Activity
    avg_typing_speed DECIMAL(5,2),
    avg_error_rate DECIMAL(5,4),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(employee_id, metric_date)
);

-- Indexes for performance
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_tasks_assigned_by ON tasks(assigned_by);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_teams_manager ON teams(manager_id);
CREATE INDEX idx_teams_employee ON teams(employee_id);
CREATE INDEX idx_employee_metrics_date ON employee_metrics(employee_id, metric_date);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employee_metrics_updated_at BEFORE UPDATE ON employee_metrics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
