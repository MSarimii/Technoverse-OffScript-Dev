import api, { USE_MOCK } from './api';
import { mockApi } from './mockApi';

export const examService = {
  getExams: () => (USE_MOCK ? mockApi.getExams() : api.get('/exams')),
  getExamById: (id) => (USE_MOCK ? mockApi.getExamById(id) : api.get(`/exams/${id}`)),
  createExam: (payload) => (USE_MOCK ? mockApi.createExam(payload) : api.post('/exams', payload)),
  updateExam: (id, payload) => (USE_MOCK ? mockApi.updateExam(id, payload) : api.patch(`/exams/${id}`, payload)),
  publishExam: (id) => (USE_MOCK ? mockApi.publishExam(id) : api.post(`/exams/${id}/publish`)),
  enrollCandidates: (id, candidateIds) =>
    USE_MOCK ? mockApi.enrollCandidates(id, candidateIds) : api.post(`/exams/${id}/enroll`, { candidateIds }),
  importCandidates: (id, rows) =>
    USE_MOCK ? mockApi.importCandidates(id, rows) : api.post(`/exams/${id}/enroll/import`, { candidates: rows }),
  startSandbox: (examId) =>
    USE_MOCK ? mockApi.startAttempt(examId, true) : api.post(`/exams/${examId}/sandbox/start`),
  getMonitor: (examId) => (USE_MOCK ? mockApi.getMonitor(examId) : api.get(`/exams/${examId}/monitor`)),
  postAnnouncement: (examId, message) =>
    USE_MOCK ? mockApi.postAnnouncement(examId, message) : api.post(`/exams/${examId}/announcements`, { message }),
  getGradingQueue: (examId) => (USE_MOCK ? mockApi.getGradingQueue(examId) : api.get(`/exams/${examId}/grading`)),
  gradeAttempt: (attemptId, writtenScores) =>
    USE_MOCK ? mockApi.gradeAttempt(attemptId, writtenScores) : api.put(`/attempts/${attemptId}/grade`, { scores: writtenScores }),
  publishResults: (examId) => (USE_MOCK ? mockApi.publishResults(examId) : api.post(`/exams/${examId}/results/publish`)),
  getAnalytics: (examId) => (USE_MOCK ? mockApi.getAnalytics(examId) : api.get(`/exams/${examId}/analytics`)),
  getQuestionAnalytics: (examId) =>
    USE_MOCK ? mockApi.getQuestionAnalytics(examId) : api.get(`/exams/${examId}/question-analytics`),
  getFairness: (examId) => (USE_MOCK ? mockApi.getFairness(examId) : api.get(`/exams/${examId}/fairness`)),
  suggestGradeAI: (payload) => (USE_MOCK ? mockApi.suggestGradeAI(payload) : api.post('/ai/suggest-grade', payload)),
  getExamReportUrl: (examId) => `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/reports/exam/${examId}.pdf`,
  getDisputes: (examId) => (USE_MOCK ? mockApi.getExamDisputes(examId) : api.get(`/exams/${examId}/disputes`)),
  resolveDispute: (disputeId, payload) =>
    USE_MOCK ? mockApi.resolveDispute(disputeId, payload) : api.patch(`/disputes/${disputeId}/resolve`, payload),
};
