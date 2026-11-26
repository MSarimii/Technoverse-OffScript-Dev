import api from './api';

export const authService = {
  /**
   * Register a new user
   */
  async register(name, email, password) {
    return await api.post('/auth/register', { name, email, password });
  },

  /**
   * Log in an existing user
   */
  async login(email, password) {
    return await api.post('/auth/login', { email, password });
  },

  /**
   * Fetch current authenticated user's profile
   */
  async getMe() {
    return await api.get('/auth/me');
  },
};
