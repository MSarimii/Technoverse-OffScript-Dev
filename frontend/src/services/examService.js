import api, { USE_MOCK } from './api';
import { mockApi } from './mockApi';

export function triggerBlobDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

export const examService = {
  getExams: (params) => (USE_MOCK ? mockApi.getExams() : api.get('/exams', { params: { limit: 100, ...params } })),
  getExamById: (id) => (USE_MOCK ? mockApi.getExamById(id) : api.get(`/exams/${id}`)),
  createExam: (payload) => (USE_MOCK ? mockApi.createExam(payload) : api.post('/exams', payload)),
  updateExam: (id, payload) => (USE_MOCK ? mockApi.updateExam(id, payload) : api.patch(`/exams/${id}`, payload)),
  deleteExam: (id) => (USE_MOCK ? Promise.resolve({ data: { deleted: true } }) : api.delete(`/exams/${id}`)),
  setExamQuestions: (id, questions) =>
    USE_MOCK ? mockApi.updateExam(id, { questionRefs: questions }) : api.put(`/exams/${id}/questions`, { questions }),
  setExamBlueprint: (id, blueprint) =>
    USE_MOCK ? Promise.resolve({ data: { blueprint } }) : api.put(`/exams/${id}/blueprint`, blueprint),
  publishExam: (id) => (USE_MOCK ? mockApi.publishExam(id) : api.post(`/exams/${id}/publish`)),
  regradeExam: (id) => (USE_MOCK ? Promise.resolve({ data: { regraded: 0 } }) : api.post(`/exams/${id}/regrade`)),
  listCandidates: (params) =>
    USE_MOCK ? mockApi.getUsers() : api.get('/candidates', { params: { limit: 100, ...params } }),
  getEnrollments: (id, params) =>
    USE_MOCK ? Promise.resolve({ data: { enrollments: [] } }) : api.get(`/exams/${id}/enrollments`, { params }),
  enrollCandidates: (id, userIdsOrPayload) =>
    USE_MOCK
      ? mockApi.enrollCandidates(id, userIdsOrPayload)
      : api.post(
          `/exams/${id}/enrollments`,
          Array.isArray(userIdsOrPayload) ? { userIds: userIdsOrPayload } : userIdsOrPayload
        ),
  importCandidates: (id, rowsOrPayload) =>
    USE_MOCK
      ? mockApi.importCandidates(id, rowsOrPayload)
      : api.post(
          `/exams/${id}/enrollments/import`,
          Array.isArray(rowsOrPayload)
            ? { format: 'json', content: rowsOrPayload, createMissingCandidates: true }
            : rowsOrPayload
        ),
  startSandbox: (examId) =>
    USE_MOCK ? mockApi.startAttempt(examId, true) : api.post(`/exams/${examId}/sandbox/start`),
  getMonitor: (examId) => (USE_MOCK ? mockApi.getMonitor(examId) : api.get(`/exams/${examId}/monitor`)),
  getIncidents: (examId, params) =>
    USE_MOCK ? Promise.resolve({ data: { incidents: [] } }) : api.get(`/exams/${examId}/incidents`, { params }),
  reviewIncident: (incidentId, payload) =>
    USE_MOCK ? Promise.resolve({ data: {} }) : api.patch(`/incidents/${incidentId}`, payload),
  getAnnouncements: (examId, params) =>
    USE_MOCK ? mockApi.getAnnouncements(examId) : api.get(`/exams/${examId}/announcements`, { params }),
  postAnnouncement: (examId, message) =>
    USE_MOCK ? mockApi.postAnnouncement(examId, message) : api.post(`/exams/${examId}/announcements`, { message }),
  getGradingQueue: (examId) => (USE_MOCK ? mockApi.getGradingQueue(examId) : api.get(`/exams/${examId}/submissions`)),
  getAttemptGrading: (attemptId) =>
    USE_MOCK ? mockApi.getAttempt(attemptId) : api.get(`/attempts/${attemptId}/grading`),
  gradeQuestion: (attemptId, questionId, { score, feedback = '' }) =>
    USE_MOCK
      ? mockApi.gradeAttempt(attemptId, { [questionId]: score })
      : api.put(`/attempts/${attemptId}/grades/${questionId}`, { score, feedback }),
  gradeAttempt: (attemptId, writtenScores) =>
    USE_MOCK ? mockApi.gradeAttempt(attemptId, writtenScores) : api.put(`/attempts/${attemptId}/grade`, { scores: writtenScores }),
  publishResults: (examId, body = {}) =>
    USE_MOCK ? mockApi.publishResults(examId) : api.post(`/exams/${examId}/results/publish`, body),
  getAnalytics: (examId) => (USE_MOCK ? mockApi.getAnalytics(examId) : api.get(`/exams/${examId}/analytics`)),
  getQuestionAnalytics: (examId) =>
    USE_MOCK ? mockApi.getQuestionAnalytics(examId) : api.get(`/exams/${examId}/questions/analytics`),
  getFairness: (examId) => (USE_MOCK ? mockApi.getFairness(examId) : api.get(`/exams/${examId}/fairness`)),
  testAiStatus: () => (USE_MOCK ? Promise.resolve({ success: true, ok: true, source: 'mock', model: 'mock' }) : api.post('/ai/test')),
  suggestGradeAI: (attemptIdOrPayload, questionId) => {
    if (USE_MOCK) return mockApi.suggestGradeAI(attemptIdOrPayload);
    const body =
      typeof attemptIdOrPayload === 'object' && attemptIdOrPayload !== null
        ? { attemptId: attemptIdOrPayload.attemptId, questionId: attemptIdOrPayload.questionId }
        : { attemptId: attemptIdOrPayload, questionId };
    return api.post('/ai/suggest-grade', body);
  },
  async downloadExamReportPdf(examId) {
    const blob = await api.get(`/exams/${examId}/report.pdf`, { responseType: 'blob' });
    triggerBlobDownload(blob, `exam-${examId}-report.pdf`);
  },
  async downloadResultsCsv(examId) {
    const blob = await api.get(`/exams/${examId}/results.csv`, { responseType: 'blob' });
    triggerBlobDownload(blob, `exam-${examId}-results.csv`);
  },
  getExamReportUrl: (examId) => `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/exams/${examId}/report.pdf`,
  getDisputes: (examId) => (USE_MOCK ? mockApi.getExamDisputes(examId) : api.get(`/exams/${examId}/disputes`)),
  resolveDispute: (disputeId, payload) =>
    USE_MOCK ? mockApi.resolveDispute(disputeId, payload) : api.patch(`/disputes/${disputeId}/resolve`, payload),
};
