// Employee management API
import api from './axios';

export const employeeAPI = {
  getMyEmployees: async () => {
    const response = await api.get('/employees');
    return response.data;
  },

  searchEmployees: async (query) => {
    const response = await api.get(`/employees/search?query=${encodeURIComponent(query)}`);
    return response.data;
  },

  addEmployee: async (employeeId) => {
    const response = await api.post('/employees', { employeeId });
    return response.data;
  },

  removeEmployee: async (employeeId) => {
    const response = await api.delete(`/employees/${employeeId}`);
    return response.data;
  },

  getEmployeeMetrics: async (employeeId, days = 7) => {
    const response = await api.get(`/employees/${employeeId}/metrics?days=${days}`);
    return response.data;
  },
};
