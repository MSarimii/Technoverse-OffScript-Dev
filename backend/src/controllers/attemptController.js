import {
  autosaveAnswers,
  deleteExamSandbox,
  getAttemptById,
  getCandidateExamDetail,
  listCandidateExams,
  recordHeartbeat,
  reportIncident,
  saveScratchpad,
  startOrResumeAttempt,
  startSandboxAttempt,
  submitAttempt,
} from '../services/attemptService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';

const extractSessionId = (req) => {
  const header = req.headers['x-session-id'];
  if (typeof header !== 'string') return null;
  const trimmed = header.trim();
  return trimmed !== '' ? trimmed.slice(0, 128) : null;
};

export const listCandidateExamsController = asyncHandler(async (req, res) => {
  const data = await listCandidateExams({ user: req.user });
  return sendSuccess(res, data, 200);
});

export const getCandidateExamDetailController = asyncHandler(async (req, res) => {
  const data = await getCandidateExamDetail({ user: req.user, examId: req.params.id });
  return sendSuccess(res, data, 200);
});

export const startOrResumeAttemptController = asyncHandler(async (req, res) => {
  const data = await startOrResumeAttempt({
    user: req.user,
    examId: req.params.id,
    sessionId: extractSessionId(req),
  });
  return sendSuccess(res, data, data.resumed ? 200 : 201);
});

export const getAttemptController = asyncHandler(async (req, res) => {
  const data = await getAttemptById({ user: req.user, attemptId: req.params.id });
  return sendSuccess(res, data, 200);
});

export const autosaveAnswersController = asyncHandler(async (req, res) => {
  const data = await autosaveAnswers({
    user: req.user,
    attemptId: req.params.id,
    answers: req.body.answers,
    offlineBuffered: req.body.offlineBuffered,
    clientSavedAt: req.body.clientSavedAt,
    sessionId: extractSessionId(req),
  });
  return sendSuccess(res, data, 200);
});

export const saveScratchpadController = asyncHandler(async (req, res) => {
  const data = await saveScratchpad({
    user: req.user,
    attemptId: req.params.id,
    text: req.body.text,
  });
  return sendSuccess(res, data, 200);
});

export const recordHeartbeatController = asyncHandler(async (req, res) => {
  const data = await recordHeartbeat({
    user: req.user,
    attemptId: req.params.id,
    since: req.body?.since,
    sessionId: extractSessionId(req),
  });
  return sendSuccess(res, data, 200);
});

export const reportIncidentController = asyncHandler(async (req, res) => {
  const data = await reportIncident({
    user: req.user,
    attemptId: req.params.id,
    type: req.body.type,
    details: req.body.details,
  });
  return sendSuccess(res, data, 201);
});

export const submitAttemptController = asyncHandler(async (req, res) => {
  const data = await submitAttempt({ user: req.user, attemptId: req.params.id });
  return sendSuccess(res, data, 200);
});

export const startSandboxController = asyncHandler(async (req, res) => {
  const data = await startSandboxAttempt({ user: req.user, examId: req.params.id });
  return sendSuccess(res, data, 201);
});

export const deleteSandboxController = asyncHandler(async (req, res) => {
  const data = await deleteExamSandbox({ user: req.user, examId: req.params.id });
  return sendSuccess(res, data, 200);
});
