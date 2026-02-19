// Employee management routes
const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController');
const { authenticateToken, requireManager } = require('../middleware/auth');

// All routes require manager authentication
router.use(authenticateToken, requireManager);

router.get('/', employeeController.getMyEmployees);
router.get('/search', employeeController.searchEmployees);
router.post('/', employeeController.addEmployee);
router.delete('/:employeeId', employeeController.removeEmployee);
router.get('/:employeeId/metrics', employeeController.getEmployeeMetrics);

module.exports = router;
