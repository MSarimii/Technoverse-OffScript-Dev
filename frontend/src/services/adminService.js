import api, { USE_MOCK } from './api';
import { mockApi } from './mockApi';

export const adminService = {
  getOverview: () => (USE_MOCK ? Promise.resolve({ data: {} }) : api.get('/admin/overview')),
  getUsers: (params) => (USE_MOCK ? mockApi.getUsers() : api.get('/admin/users', { params: { limit: 100, ...params } })),
  createUser: (payload) => (USE_MOCK ? mockApi.createUser(payload) : api.post('/admin/users', payload)),
  updateUser: (id, payload) => (USE_MOCK ? mockApi.updateUser(id, payload) : api.patch(`/admin/users/${id}`, payload)),
  resetPassword: (id, newPassword) =>
    USE_MOCK
      ? Promise.resolve({ data: { message: 'Mock reset' } })
      : api.post(`/admin/users/${id}/reset-password`, { newPassword }),
  deleteUser: (id) => (USE_MOCK ? mockApi.deleteUser(id) : api.patch(`/admin/users/${id}`, { isActive: false })),
};
