import api, { USE_MOCK } from './api';
import { mockApi } from './mockApi';

const DEFAULT_ME_PREFS = {
  theme: 'light',
  fontScale: 'md',
  layout: 'right',
  showTimer: true,
  highContrast: false,
};

export const attemptService = {
  getCandidateExams: () => (USE_MOCK ? mockApi.getCandidateExams() : api.get('/candidate/exams')),
  getCandidateExamDetail: (examId) =>
    USE_MOCK
      ? mockApi.getCandidateExams().then((res) => ({
          ...res,
          data: { exam: (res.data?.exams || []).find((e) => e.id === examId) || null },
        }))
      : api.get(`/candidate/exams/${examId}`),
  startAttempt: (examId) =>
    USE_MOCK ? mockApi.startAttempt(examId, false) : api.post(`/candidate/exams/${examId}/start`, {}),
  getAttempt: (attemptId) => (USE_MOCK ? mockApi.getAttempt(attemptId) : api.get(`/attempts/${attemptId}`)),
  saveAnswers: (attemptId, answers, markedForReview, extra = {}) =>
    USE_MOCK
      ? mockApi.saveAnswers(attemptId, answers, markedForReview)
      : api.put(`/attempts/${attemptId}/answers`, { answers, markedForReview, ...extra }),
  sendHeartbeat: (attemptId) =>
    USE_MOCK ? mockApi.sendHeartbeat(attemptId) : api.post(`/attempts/${attemptId}/heartbeat`),
  logEvent: (attemptId, event) =>
    USE_MOCK ? mockApi.logEvent(attemptId, event) : api.post(`/attempts/${attemptId}/events`, event),
  savePreferences: (attemptId, preferences) =>
    USE_MOCK ? mockApi.savePreferences(attemptId, preferences) : api.put(`/attempts/${attemptId}/preferences`, preferences),
  getMyPreferences: () => {
    if (!USE_MOCK) return api.get('/me/preferences');
    try {
      const saved = JSON.parse(localStorage.getItem('sems_me_preferences') || 'null');
      return Promise.resolve({ success: true, data: { preferences: { ...DEFAULT_ME_PREFS, ...saved } } });
    } catch {
      return Promise.resolve({ success: true, data: { preferences: DEFAULT_ME_PREFS } });
    }
  },
  updateMyPreferences: (preferences) => {
    if (!USE_MOCK) return api.put('/me/preferences', preferences);
    const merged = { ...DEFAULT_ME_PREFS, ...preferences };
    localStorage.setItem('sems_me_preferences', JSON.stringify(merged));
    return Promise.resolve({ success: true, data: { preferences: merged } });
  },
  saveScratchpad: (attemptId, scratchpad) =>
    USE_MOCK ? mockApi.saveScratchpad(attemptId, scratchpad) : api.put(`/attempts/${attemptId}/scratchpad`, { scratchpad }),
  submitAttempt: (attemptId) =>
    USE_MOCK ? mockApi.submitAttempt(attemptId) : api.post(`/attempts/${attemptId}/submit`, {}),
  getAnnouncements: (examId, since) =>
    USE_MOCK ? mockApi.getAnnouncements(examId, since) : api.get(`/exams/${examId}/announcements`, { params: { since } }),
  getCandidateResults: () => (USE_MOCK ? mockApi.getCandidateResults() : api.get('/candidate/results')),
  getCandidateResultDetail: (attemptId) =>
    USE_MOCK ? mockApi.getCandidateResultDetail(attemptId) : api.get(`/candidate/results/${attemptId}`),
  verifyReport: (verificationId) =>
    USE_MOCK ? mockApi.verifyReport(verificationId) : api.get(`/verify/${verificationId}`),
  getAttemptReportUrl: (attemptId) =>
    `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/attempts/${attemptId}/report.pdf`,
  downloadAttemptPdf: async (attemptId) => {
    if (USE_MOCK) {
      const blob = new Blob([`SEMS Verified Transcript\nAttempt ID: ${attemptId}\nStatus: Verified`], {
        type: 'application/pdf',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `SEMS-Transcript-${attemptId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      return;
    }
    const res = await api.get(`/attempts/${attemptId}/report.pdf`, { responseType: 'blob' });
    const blob = new Blob([res], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SEMS-Transcript-${attemptId}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },
  createDispute: (attemptId, payload) =>
    USE_MOCK ? mockApi.createDispute(attemptId, payload) : api.post(`/attempts/${attemptId}/disputes`, payload),
};
