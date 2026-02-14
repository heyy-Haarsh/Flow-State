// Task Aggregator - Combines local and backend tasks
const axios = require('axios');
const queries = require('../database/queries');

const BACKEND_API = 'http://localhost:3001/api';
const EMPLOYEE_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MiwiZW1haWwiOiJlbXBsb3llZUBjb21wYW55LmNvbSIsInJvbGUiOiJlbXBsb3llZSIsImlhdCI6MTc3MTA5NjA3OCwiZXhwIjoxNzcxNzAwODc4fQ.3g2m1EoXH5XFxZKCL9ZLbYZIL6XbiOkJNQ24WeQRSas';

class TaskAggregator {
  constructor() {
    this.backendTasks = [];
    this.lastFetch = 0;
    this.CACHE_TTL = 60000; // 1 minute cache
  }

  /**
   * Fetch tasks from backend API
   */
  async fetchBackendTasks() {
    try {
      const response = await axios.get(`${BACKEND_API}/tasks`, {
        headers: { Authorization: `Bearer ${EMPLOYEE_TOKEN}` },
        timeout: 5000,
      });

      return response.data.tasks || [];
    } catch (error) {
      console.error('[TaskAggregator] Failed to fetch backend tasks:', error.message);
      return [];
    }
  }

  /**
   * Convert backend task format to local task format
   */
  normalizeBackendTask(backendTask) {
    return {
      id: `backend-${backendTask.id}`,
      title: backendTask.title,
      description: backendTask.description,
      complexity: backendTask.complexity || 'medium',
      estimatedDuration: backendTask.estimated_duration || 0,
      status: backendTask.status,
      priority: backendTask.priority || 'medium',
      source: 'backend',
      backendId: backendTask.id,
      assignedBy: backendTask.assigned_by_name,
      dueDate: backendTask.due_date,
    };
  }

  /**
   * Get all tasks (local + backend), sorted by priority
   */
  async getAllTasks() {
    const now = Date.now();

    // Refresh backend tasks from cache or fetch
    if (now - this.lastFetch > this.CACHE_TTL) {
      const fetched = await this.fetchBackendTasks();
      this.backendTasks = fetched.map(t => this.normalizeBackendTask(t));
      this.lastFetch = now;
    }

    // Get local tasks from SQLite
    const localTasks = queries.getTasks({ status: 'pending' }).map(t => ({
      ...t,
      source: 'local',
    }));

    // Combine and sort by priority
    const allTasks = [...this.backendTasks, ...localTasks];

    // Priority order: urgent > high > medium > low
    const priorityWeight = {
      urgent: 4,
      high: 3,
      medium: 2,
      low: 1,
    };

    return allTasks.sort((a, b) => {
      const aPriority = priorityWeight[a.priority] || 2;
      const bPriority = priorityWeight[b.priority] || 2;
      return bPriority - aPriority; // Higher priority first
    });
  }

  /**
   * Get pending tasks (status: pending or in_progress)
   */
  async getPendingTasks() {
    const allTasks = await this.getAllTasks();
    return allTasks.filter(t =>
      t.status === 'pending' || t.status === 'in_progress'
    );
  }

  /**
   * Get current active task (if any)
   */
  async getCurrentTask() {
    const allTasks = await this.getAllTasks();
    const inProgress = allTasks.find(t => t.status === 'in_progress');
    return inProgress || {};
  }

  /**
   * Get tasks suitable for switching (easier than current task)
   */
  async getEasierTasks(currentTask) {
    const pending = await this.getPendingTasks();

    const complexityWeight = { low: 1, medium: 2, high: 3 };
    const currentComplexity = complexityWeight[currentTask.complexity] || 2;

    return pending.filter(t => {
      const taskComplexity = complexityWeight[t.complexity] || 2;
      return taskComplexity <= currentComplexity;
    });
  }
}

module.exports = new TaskAggregator();
