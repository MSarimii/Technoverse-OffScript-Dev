import api, { USE_MOCK } from './api';
import { mockApi } from './mockApi';

export const authService = {
  async login(email, password) {
    if (USE_MOCK) return mockApi.login(email, password);
    return api.post('/auth/login', { email, password });
  },

  async getMe() {
    if (USE_MOCK) return mockApi.getMe();
    return api.get('/auth/me');
  },
};
