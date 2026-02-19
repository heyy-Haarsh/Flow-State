// Simple task sync service - no auth required
import axios from 'axios';

const API_URL = 'http://localhost:3001/api';

// Hardcode the employee token for simplicity
const EMPLOYEE_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MiwiZW1haWwiOiJlbXBsb3llZUBjb21wYW55LmNvbSIsInJvbGUiOiJlbXBsb3llZSIsImlhdCI6MTc3MTA5NjA3OCwiZXhwIjoxNzcxNzAwODc4fQ.3g2m1EoXH5XFxZKCL9ZLbYZIL6XbiOkJNQ24WeQRSas';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${EMPLOYEE_TOKEN}`,
  },
});

export interface BackendTask {
  id: number;
  title: string;
  description: string | null;
  complexity: 'low' | 'medium' | 'high';
  estimated_duration: number | null;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed';
  due_date: string | null;
  assigned_to: number;
  assigned_by: number;
  assigned_to_name: string;
  assigned_by_name: string;
  created_at: string;
  updated_at: string;
}

export const taskSyncService = {
  // Fetch tasks from backend
  async fetchTasks(): Promise<BackendTask[]> {
    try {
      const response = await api.get('/tasks');
      return response.data.tasks || [];
    } catch (error) {
      console.error('[TaskSync] Error fetching tasks:', error);
      return [];
    }
  },

  // Update task status
  async updateTaskStatus(taskId: number, status: 'pending' | 'in_progress' | 'completed'): Promise<void> {
    try {
      await api.put(`/tasks/${taskId}`, { status });
      console.log(`[TaskSync] Updated task ${taskId} to ${status}`);
    } catch (error) {
      console.error('[TaskSync] Error updating task:', error);
      throw error;
    }
  },

  // Mark task as started
  async startTask(taskId: number): Promise<void> {
    try {
      await api.put(`/tasks/${taskId}`, {
        status: 'in_progress',
      });
      console.log(`[TaskSync] Started task ${taskId}`);
    } catch (error) {
      console.error('[TaskSync] Error starting task:', error);
      throw error;
    }
  },

  // Mark task as completed
  async completeTask(taskId: number, actualDuration?: number): Promise<void> {
    try {
      await api.put(`/tasks/${taskId}`, {
        status: 'completed',
        actualDuration,
      });
      console.log(`[TaskSync] Completed task ${taskId}`);
    } catch (error) {
      console.error('[TaskSync] Error completing task:', error);
      throw error;
    }
  },
};
