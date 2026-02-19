// Employee management controller
const pool = require('../config/database');

// Get all employees for a manager
const getMyEmployees = async (req, res) => {
  try {
    const managerId = req.user.id;

    const result = await pool.query(
      `SELECT
        u.id, u.email, u.full_name, u.created_at, u.last_login,
        t.assigned_at,
        COUNT(DISTINCT tasks.id) as total_tasks,
        COUNT(DISTINCT CASE WHEN tasks.status = 'completed' THEN tasks.id END) as completed_tasks
      FROM teams t
      JOIN users u ON t.employee_id = u.id
      LEFT JOIN tasks ON tasks.assigned_to = u.id
      WHERE t.manager_id = $1 AND u.is_active = true
      GROUP BY u.id, u.email, u.full_name, u.created_at, u.last_login, t.assigned_at
      ORDER BY u.full_name`,
      [managerId]
    );

    res.json({ employees: result.rows });
  } catch (error) {
    console.error('[Employee] Get employees error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Add employee to team
const addEmployee = async (req, res) => {
  try {
    const managerId = req.user.id;
    const { employeeId } = req.body;

    if (!employeeId) {
      return res.status(400).json({ error: 'Employee ID is required' });
    }

    // Verify employee exists and is an employee role
    const employeeCheck = await pool.query(
      'SELECT id, role FROM users WHERE id = $1 AND is_active = true',
      [employeeId]
    );

    if (employeeCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    if (employeeCheck.rows[0].role !== 'employee') {
      return res.status(400).json({ error: 'User is not an employee' });
    }

    // Check if already in team
    const existingTeam = await pool.query(
      'SELECT id FROM teams WHERE manager_id = $1 AND employee_id = $2',
      [managerId, employeeId]
    );

    if (existingTeam.rows.length > 0) {
      return res.status(409).json({ error: 'Employee already in your team' });
    }

    // Add to team
    await pool.query(
      'INSERT INTO teams (manager_id, employee_id) VALUES ($1, $2)',
      [managerId, employeeId]
    );

    res.status(201).json({ message: 'Employee added to team successfully' });
  } catch (error) {
    console.error('[Employee] Add employee error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Remove employee from team
const removeEmployee = async (req, res) => {
  try {
    const managerId = req.user.id;
    const { employeeId } = req.params;

    const result = await pool.query(
      'DELETE FROM teams WHERE manager_id = $1 AND employee_id = $2 RETURNING id',
      [managerId, employeeId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Employee not in your team' });
    }

    res.json({ message: 'Employee removed from team successfully' });
  } catch (error) {
    console.error('[Employee] Remove employee error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get employee metrics
const getEmployeeMetrics = async (req, res) => {
  try {
    const managerId = req.user.id;
    const { employeeId } = req.params;
    const { days = 7 } = req.query;

    // Verify employee is in manager's team
    const teamCheck = await pool.query(
      'SELECT id FROM teams WHERE manager_id = $1 AND employee_id = $2',
      [managerId, employeeId]
    );

    if (teamCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Employee not in your team' });
    }

    // Get metrics
    const result = await pool.query(
      `SELECT * FROM employee_metrics
       WHERE employee_id = $1
       AND metric_date >= CURRENT_DATE - INTERVAL '${parseInt(days)} days'
       ORDER BY metric_date DESC`,
      [employeeId]
    );

    res.json({ metrics: result.rows });
  } catch (error) {
    console.error('[Employee] Get metrics error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Search for employees to add (not in team yet)
const searchEmployees = async (req, res) => {
  try {
    const managerId = req.user.id;
    const { query } = req.query;

    if (!query || query.length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters' });
    }

    const result = await pool.query(
      `SELECT u.id, u.email, u.full_name, u.created_at
       FROM users u
       WHERE u.role = 'employee'
       AND u.is_active = true
       AND (u.email ILIKE $1 OR u.full_name ILIKE $1)
       AND u.id NOT IN (
         SELECT employee_id FROM teams WHERE manager_id = $2
       )
       ORDER BY u.full_name
       LIMIT 20`,
      [`%${query}%`, managerId]
    );

    res.json({ employees: result.rows });
  } catch (error) {
    console.error('[Employee] Search error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = {
  getMyEmployees,
  addEmployee,
  removeEmployee,
  getEmployeeMetrics,
  searchEmployees,
};
