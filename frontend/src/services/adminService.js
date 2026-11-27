import api, { USE_MOCK } from './api';
import { mockApi } from './mockApi';

export const adminService = {
  getUsers: () => (USE_MOCK ? mockApi.getUsers() : api.get('/admin/users')),
  createUser: (payload) => (USE_MOCK ? mockApi.createUser(payload) : api.post('/admin/users', payload)),
  updateUser: (id, payload) => (USE_MOCK ? mockApi.updateUser(id, payload) : api.patch(`/admin/users/${id}`, payload)),
  deleteUser: (id) => (USE_MOCK ? mockApi.deleteUser(id) : api.delete(`/admin/users/${id}`)),
};
