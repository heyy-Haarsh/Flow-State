// Authentication API
import api from './axios';

export const authAPI = {
  login: async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },

  register: async (email, password, fullName, role) => {
    const response = await api.post('/auth/register', {
      email,
      password,
      fullName,
      role,
    });
    return response.data;
  },

  getMe: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },
};
