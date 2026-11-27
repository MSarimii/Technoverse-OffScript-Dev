import api, { USE_MOCK } from './api';
import { mockApi } from './mockApi';

export const attemptService = {
  getCandidateExams: () => (USE_MOCK ? mockApi.getCandidateExams() : api.get('/candidate/exams')),
  startAttempt: (examId) => (USE_MOCK ? mockApi.startAttempt(examId, false) : api.post('/attempts/start', { examId })),
  getAttempt: (attemptId) => (USE_MOCK ? mockApi.getAttempt(attemptId) : api.get(`/attempts/${attemptId}`)),
  saveAnswers: (attemptId, answers, markedForReview) =>
    USE_MOCK
      ? mockApi.saveAnswers(attemptId, answers, markedForReview)
      : api.put(`/attempts/${attemptId}/answers`, { answers, markedForReview }),
  sendHeartbeat: (attemptId) =>
    USE_MOCK ? mockApi.sendHeartbeat(attemptId) : api.post(`/attempts/${attemptId}/heartbeat`),
  logEvent: (attemptId, event) =>
    USE_MOCK ? mockApi.logEvent(attemptId, event) : api.post(`/attempts/${attemptId}/events`, event),
  savePreferences: (attemptId, preferences) =>
    USE_MOCK ? mockApi.savePreferences(attemptId, preferences) : api.put(`/attempts/${attemptId}/preferences`, preferences),
  saveScratchpad: (attemptId, scratchpad) =>
    USE_MOCK ? mockApi.saveScratchpad(attemptId, scratchpad) : api.put(`/attempts/${attemptId}/scratchpad`, { scratchpad }),
  submitAttempt: (attemptId) =>
    USE_MOCK ? mockApi.submitAttempt(attemptId) : api.post(`/attempts/${attemptId}/submit`),
  getAnnouncements: (examId, since) =>
    USE_MOCK ? mockApi.getAnnouncements(examId, since) : api.get(`/exams/${examId}/announcements`, { params: { since } }),
  getCandidateResults: () => (USE_MOCK ? mockApi.getCandidateResults() : api.get('/candidate/results')),
  getCandidateResultDetail: (attemptId) =>
    USE_MOCK ? mockApi.getCandidateResultDetail(attemptId) : api.get(`/candidate/results/${attemptId}`),
  verifyReport: (verificationId) =>
    USE_MOCK ? mockApi.verifyReport(verificationId) : api.get(`/verify/${verificationId}`),
  getAttemptReportUrl: (attemptId) =>
    `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/reports/attempt/${attemptId}.pdf`,
};
