// Tasks API
import apiClient from './client';

export const tasksAPI = {
  // Get all tasks assigned to the logged-in employee
  getMyTasks: async (status = null) => {
    const params = status ? { status } : {};
    const response = await apiClient.get('/tasks', { params });
    return response.data;
  },

  // Update task status
  updateTask: async (taskId, updates) => {
    const response = await apiClient.put(`/tasks/${taskId}`, updates);
    return response.data;
  },

  // Mark task as started
  startTask: async (taskId) => {
    const response = await apiClient.put(`/tasks/${taskId}`, {
      status: 'in_progress',
      startedAt: new Date().toISOString(),
    });
    return response.data;
  },

  // Mark task as completed
  completeTask: async (taskId, actualDuration) => {
    const response = await apiClient.put(`/tasks/${taskId}`, {
      status: 'completed',
      completedAt: new Date().toISOString(),
      actualDuration,
    });
    return response.data;
  },
};
