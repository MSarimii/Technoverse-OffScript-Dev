import {
  getAttemptForGrading,
  getExamAnalytics,
  getExamQuestionAnalytics,
  getResultsPreview,
  gradeManualQuestion,
  listCandidateResults,
  getCandidateResultDetail,
  listExamSubmissions,
  publishResults,
  regradeExam,
  unpublishResults,
} from '../services/gradingService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';

export const listExamSubmissionsController = asyncHandler(async (req, res) => {
  const data = await listExamSubmissions({ user: req.user, examId: req.params.id });
  return sendSuccess(res, data, 200);
});

export const getAttemptForGradingController = asyncHandler(async (req, res) => {
  const data = await getAttemptForGrading({ user: req.user, attemptId: req.params.id });
  return sendSuccess(res, data, 200);
});

export const gradeManualQuestionController = asyncHandler(async (req, res) => {
  const data = await gradeManualQuestion({
    user: req.user,
    attemptId: req.params.id,
    questionId: req.params.questionId,
    score: req.body.score,
    feedback: req.body.feedback,
  });
  return sendSuccess(res, data, 200);
});

export const regradeExamController = asyncHandler(async (req, res) => {
  const data = await regradeExam({ user: req.user, examId: req.params.id });
  return sendSuccess(res, data, 200);
});

export const getResultsPreviewController = asyncHandler(async (req, res) => {
  const data = await getResultsPreview({ user: req.user, examId: req.params.id });
  return sendSuccess(res, data, 200);
});

export const publishResultsController = asyncHandler(async (req, res) => {
  const data = await publishResults({
    user: req.user,
    examId: req.params.id,
    force: req.body?.force,
  });
  return sendSuccess(res, data, 200);
});

export const unpublishResultsController = asyncHandler(async (req, res) => {
  const data = await unpublishResults({ user: req.user, examId: req.params.id });
  return sendSuccess(res, data, 200);
});

export const getExamAnalyticsController = asyncHandler(async (req, res) => {
  const data = await getExamAnalytics({ user: req.user, examId: req.params.id });
  return sendSuccess(res, data, 200);
});

export const listCandidateResultsController = asyncHandler(async (req, res) => {
  const data = await listCandidateResults({ user: req.user });
  return sendSuccess(res, data, 200);
});

export const getCandidateResultDetailController = asyncHandler(async (req, res) => {
  const data = await getCandidateResultDetail({
    user: req.user,
    attemptId: req.params.attemptId,
  });
  return sendSuccess(res, data, 200);
});

export const getExamQuestionAnalyticsController = asyncHandler(async (req, res) => {
  const data = await getExamQuestionAnalytics({ user: req.user, examId: req.params.id });
  return sendSuccess(res, data, 200);
});
