// Task management controller
const pool = require('../config/database');
const { validateTaskInput } = require('../utils/validation');

// Create/assign task (Manager only)
const createTask = async (req, res) => {
  try {
    const managerId = req.user.id;
    const {
      title,
      description,
      complexity,
      estimatedDuration,
      priority,
      dueDate,
      assignedTo,
    } = req.body;

    // Validate input
    const validation = validateTaskInput(req.body);
    if (!validation.isValid) {
      return res.status(400).json({ errors: validation.errors });
    }

    if (!assignedTo) {
      return res.status(400).json({ error: 'assignedTo (employee ID) is required' });
    }

    // Verify employee is in manager's team
    const teamCheck = await pool.query(
      'SELECT id FROM teams WHERE manager_id = $1 AND employee_id = $2',
      [managerId, assignedTo]
    );

    if (teamCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Cannot assign task to employee not in your team' });
    }

    // Create task
    const result = await pool.query(
      `INSERT INTO tasks (
        title, description, complexity, estimated_duration, priority,
        due_date, assigned_to, assigned_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        title,
        description || null,
        complexity || 'medium',
        estimatedDuration || null,
        priority || 'medium',
        dueDate || null,
        assignedTo,
        managerId,
      ]
    );

    res.status(201).json({
      message: 'Task created and assigned successfully',
      task: result.rows[0],
    });
  } catch (error) {
    console.error('[Task] Create error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get tasks (with filters)
const getTasks = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const {
      assignedTo,
      status,
      priority,
      complexity,
      limit = 50,
      offset = 0,
    } = req.query;

    let query = `
      SELECT
        t.*,
        assigned_user.full_name as assigned_to_name,
        assigned_user.email as assigned_to_email,
        manager_user.full_name as assigned_by_name,
        manager_user.email as assigned_by_email
      FROM tasks t
      JOIN users assigned_user ON t.assigned_to = assigned_user.id
      JOIN users manager_user ON t.assigned_by = manager_user.id
      WHERE 1=1
    `;

    const params = [];
    let paramIndex = 1;

    // Filter based on role
    if (userRole === 'manager') {
      query += ` AND t.assigned_by = $${paramIndex++}`;
      params.push(userId);
    } else if (userRole === 'employee') {
      query += ` AND t.assigned_to = $${paramIndex++}`;
      params.push(userId);
    }

    // Additional filters
    if (assignedTo) {
      query += ` AND t.assigned_to = $${paramIndex++}`;
      params.push(assignedTo);
    }

    if (status) {
      query += ` AND t.status = $${paramIndex++}`;
      params.push(status);
    }

    if (priority) {
      query += ` AND t.priority = $${paramIndex++}`;
      params.push(priority);
    }

    if (complexity) {
      query += ` AND t.complexity = $${paramIndex++}`;
      params.push(complexity);
    }

    query += ` ORDER BY
      CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END,
      t.priority DESC,
      t.due_date ASC NULLS LAST,
      t.created_at DESC
    `;

    query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM tasks t WHERE 1=1';
    const countParams = [];
    let countIndex = 1;

    if (userRole === 'manager') {
      countQuery += ` AND t.assigned_by = $${countIndex++}`;
      countParams.push(userId);
    } else if (userRole === 'employee') {
      countQuery += ` AND t.assigned_to = $${countIndex++}`;
      countParams.push(userId);
    }

    if (assignedTo) {
      countQuery += ` AND t.assigned_to = $${countIndex++}`;
      countParams.push(assignedTo);
    }

    if (status) {
      countQuery += ` AND t.status = $${countIndex++}`;
      countParams.push(status);
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    res.json({
      tasks: result.rows,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: total > parseInt(offset) + parseInt(limit),
      },
    });
  } catch (error) {
    console.error('[Task] Get tasks error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get single task
const getTask = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const { taskId } = req.params;

    const result = await pool.query(
      `SELECT
        t.*,
        assigned_user.full_name as assigned_to_name,
        assigned_user.email as assigned_to_email,
        manager_user.full_name as assigned_by_name,
        manager_user.email as assigned_by_email
      FROM tasks t
      JOIN users assigned_user ON t.assigned_to = assigned_user.id
      JOIN users manager_user ON t.assigned_by = manager_user.id
      WHERE t.id = $1`,
      [taskId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const task = result.rows[0];

    // Check access permission
    if (userRole === 'manager' && task.assigned_by !== userId) {
      return res.status(403).json({ error: 'You can only view tasks you assigned' });
    }

    if (userRole === 'employee' && task.assigned_to !== userId) {
      return res.status(403).json({ error: 'You can only view tasks assigned to you' });
    }

    res.json({ task });
  } catch (error) {
    console.error('[Task] Get task error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Update task
const updateTask = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const { taskId } = req.params;
    const updates = req.body;

    // Get current task
    const taskResult = await pool.query('SELECT * FROM tasks WHERE id = $1', [taskId]);

    if (taskResult.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const task = taskResult.rows[0];

    // Permission check
    if (userRole === 'manager' && task.assigned_by !== userId) {
      return res.status(403).json({ error: 'You can only update tasks you assigned' });
    }

    if (userRole === 'employee' && task.assigned_to !== userId) {
      return res.status(403).json({ error: 'You can only update tasks assigned to you' });
    }

    // Build update query dynamically
    const allowedFields = {
      manager: ['title', 'description', 'complexity', 'estimated_duration', 'priority', 'due_date', 'status'],
      employee: ['status', 'started_at', 'completed_at', 'actual_duration'],
    };

    const fieldsToUpdate = allowedFields[userRole];
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    Object.keys(updates).forEach((key) => {
      const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      if (fieldsToUpdate.includes(snakeKey)) {
        updateFields.push(`${snakeKey} = $${paramIndex++}`);
        updateValues.push(updates[key]);
      }
    });

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    // If status changed to completed, set completed_at
    if (updates.status === 'completed' && task.status !== 'completed') {
      updateFields.push(`completed_at = CURRENT_TIMESTAMP`);
    }

    // If status changed to in_progress, set started_at if not set
    if (updates.status === 'in_progress' && task.status === 'pending' && !task.started_at) {
      updateFields.push(`started_at = CURRENT_TIMESTAMP`);
    }

    updateValues.push(taskId);

    const result = await pool.query(
      `UPDATE tasks SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      updateValues
    );

    res.json({
      message: 'Task updated successfully',
      task: result.rows[0],
    });
  } catch (error) {
    console.error('[Task] Update error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Delete task (Manager only)
const deleteTask = async (req, res) => {
  try {
    const managerId = req.user.id;
    const { taskId } = req.params;

    const result = await pool.query(
      'DELETE FROM tasks WHERE id = $1 AND assigned_by = $2 RETURNING id',
      [taskId, managerId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Task not found or you do not have permission' });
    }

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('[Task] Delete error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get task statistics for dashboard
const getTaskStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const { employeeId } = req.query;

    let whereClause = '';
    const params = [];

    if (userRole === 'manager') {
      if (employeeId) {
        // Verify employee is in team
        const teamCheck = await pool.query(
          'SELECT id FROM teams WHERE manager_id = $1 AND employee_id = $2',
          [userId, employeeId]
        );

        if (teamCheck.rows.length === 0) {
          return res.status(403).json({ error: 'Employee not in your team' });
        }

        whereClause = 'WHERE assigned_to = $1';
        params.push(employeeId);
      } else {
        whereClause = 'WHERE assigned_by = $1';
        params.push(userId);
      }
    } else {
      whereClause = 'WHERE assigned_to = $1';
      params.push(userId);
    }

    const result = await pool.query(
      `SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN priority = 'urgent' THEN 1 END) as urgent,
        COUNT(CASE WHEN due_date < CURRENT_TIMESTAMP AND status != 'completed' THEN 1 END) as overdue
      FROM tasks ${whereClause}`,
      params
    );

    res.json({ stats: result.rows[0] });
  } catch (error) {
    console.error('[Task] Get stats error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = {
  createTask,
  getTasks,
  getTask,
  updateTask,
  deleteTask,
  getTaskStats,
};
