import api, { USE_MOCK } from './api';
import { mockApi } from './mockApi';

export const questionService = {
  getQuestions: (params) => (USE_MOCK ? mockApi.getQuestions() : api.get('/questions', { params: { limit: 100, ...params } })),
  createQuestion: (payload) => (USE_MOCK ? mockApi.createQuestion(payload) : api.post('/questions', payload)),
  updateQuestion: (id, payload) => (USE_MOCK ? mockApi.updateQuestion(id, payload) : api.patch(`/questions/${id}`, payload)),
  deleteQuestion: (id) => (USE_MOCK ? mockApi.deleteQuestion(id) : api.delete(`/questions/${id}`)),
  importQuestions: (rowsOrPayload, format = 'json') =>
    USE_MOCK
      ? mockApi.importQuestions(rowsOrPayload)
      : api.post(
          '/questions/import',
          rowsOrPayload && !Array.isArray(rowsOrPayload) && rowsOrPayload.format
            ? rowsOrPayload
            : { format, content: rowsOrPayload }
        ),
};
