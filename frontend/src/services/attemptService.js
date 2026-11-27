import api, { USE_MOCK } from './api';
import { mockApi } from './mockApi';
import { triggerBlobDownload } from './examService';

export const attemptService = {
  getCandidateExams: () => (USE_MOCK ? mockApi.getCandidateExams() : api.get('/candidate/exams')),
  getCandidateExamDetail: (examId) =>
    USE_MOCK
      ? mockApi.getExamById(examId)
      : api.get(`/candidate/exams/${examId}`),
  startAttempt: (examId) =>
    USE_MOCK ? mockApi.startAttempt(examId, false) : api.post(`/candidate/exams/${examId}/start`, {}),
  getAttempt: (attemptId) => (USE_MOCK ? mockApi.getAttempt(attemptId) : api.get(`/attempts/${attemptId}`)),
  saveAnswers: (attemptId, payloadOrAnswers, markedForReview) =>
    USE_MOCK
      ? mockApi.saveAnswers(attemptId, payloadOrAnswers, markedForReview)
      : api.put(
          `/attempts/${attemptId}/answers`,
          Array.isArray(payloadOrAnswers) ? { answers: payloadOrAnswers } : payloadOrAnswers
        ),
  sendHeartbeat: (attemptId, since) =>
    USE_MOCK ? mockApi.sendHeartbeat(attemptId) : api.post(`/attempts/${attemptId}/heartbeat`, since ? { since } : {}),
  logEvent: (attemptId, event) =>
    USE_MOCK ? mockApi.logEvent(attemptId, event) : api.post(`/attempts/${attemptId}/events`, event),
  getPreferences: () =>
    USE_MOCK ? Promise.resolve({ data: { preferences: {} } }) : api.get('/me/preferences'),
  savePreferences: (_attemptId, preferences) =>
    USE_MOCK
      ? mockApi.savePreferences(_attemptId, preferences)
      : api.put('/me/preferences', preferences),
  saveScratchpad: (attemptId, text) =>
    USE_MOCK ? mockApi.saveScratchpad(attemptId, text) : api.put(`/attempts/${attemptId}/scratchpad`, { text }),
  submitAttempt: (attemptId) =>
    USE_MOCK ? mockApi.submitAttempt(attemptId) : api.post(`/attempts/${attemptId}/submit`, {}),
  getAnnouncements: (examId, since) =>
    USE_MOCK
      ? mockApi.getAnnouncements(examId, since)
      : api.get(`/exams/${examId}/announcements`, { params: since ? { since } : undefined }),
  getCandidateResults: () => (USE_MOCK ? mockApi.getCandidateResults() : api.get('/candidate/results')),
  getCandidateResultDetail: (attemptId) =>
    USE_MOCK ? mockApi.getCandidateResultDetail(attemptId) : api.get(`/candidate/results/${attemptId}`),
  verifyReport: (verificationId) =>
    USE_MOCK ? mockApi.verifyReport(verificationId) : api.get(`/verify/${verificationId}`),
  async downloadAttemptReportPdf(attemptId) {
    const blob = await api.get(`/attempts/${attemptId}/report.pdf`, { responseType: 'blob' });
    triggerBlobDownload(blob, `attempt-${attemptId}-transcript.pdf`);
  },
  getAttemptReportUrl: (attemptId) =>
    `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/attempts/${attemptId}/report.pdf`,
  getAttemptDisputes: (attemptId) =>
    USE_MOCK ? Promise.resolve({ data: { disputes: [] } }) : api.get(`/attempts/${attemptId}/disputes`),
  createDispute: (attemptId, payload) =>
    USE_MOCK ? mockApi.createDispute(attemptId, payload) : api.post(`/attempts/${attemptId}/disputes`, payload),
};
