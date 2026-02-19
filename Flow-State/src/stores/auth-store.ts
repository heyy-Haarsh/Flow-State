import { create } from 'zustand';

interface User {
  id: number;
  email: string;
  fullName: string;
  role: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loadFromStorage: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,

  loadFromStorage: () => {
    const token = localStorage.getItem('employee_token');
    const userStr = localStorage.getItem('employee_user');
    if (token && userStr) {
      const user = JSON.parse(userStr);
      set({ user, token, isAuthenticated: true });
    }
  },

  login: async (email: string, password: string) => {
    const { authAPI } = await import('../api/auth');
    const data = await authAPI.login(email, password);

    // Verify this is an employee account
    if (data.user.role !== 'employee') {
      throw new Error('This app is for employees only. Managers use the web portal.');
    }

    // Save to localStorage
    localStorage.setItem('employee_token', data.token);
    localStorage.setItem('employee_user', JSON.stringify(data.user));

    set({
      user: data.user,
      token: data.token,
      isAuthenticated: true,
    });
  },

  logout: () => {
    localStorage.removeItem('employee_token');
    localStorage.removeItem('employee_user');
    set({ user: null, token: null, isAuthenticated: false });
  },
}));
