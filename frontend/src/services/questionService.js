import api, { USE_MOCK } from './api';
import { mockApi } from './mockApi';

export const questionService = {
  getQuestions: () => (USE_MOCK ? mockApi.getQuestions() : api.get('/questions')),
  createQuestion: (payload) => (USE_MOCK ? mockApi.createQuestion(payload) : api.post('/questions', payload)),
  updateQuestion: (id, payload) => (USE_MOCK ? mockApi.updateQuestion(id, payload) : api.patch(`/questions/${id}`, payload)),
  deleteQuestion: (id) => (USE_MOCK ? mockApi.deleteQuestion(id) : api.delete(`/questions/${id}`)),
  importQuestions: (rows) => (USE_MOCK ? mockApi.importQuestions(rows) : api.post('/questions/import', { questions: rows })),
};
