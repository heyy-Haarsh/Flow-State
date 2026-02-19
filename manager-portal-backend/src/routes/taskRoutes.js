// Task management routes
const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const { authenticateToken, requireManager } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// Task CRUD
router.post('/', requireManager, taskController.createTask);
router.get('/', taskController.getTasks);
router.get('/stats', taskController.getTaskStats);
router.get('/:taskId', taskController.getTask);
router.put('/:taskId', taskController.updateTask);
router.delete('/:taskId', requireManager, taskController.deleteTask);

module.exports = router;
