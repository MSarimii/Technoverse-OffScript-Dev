import {
  enrollCandidates,
  listEnrollments,
  removeEnrollment,
  searchCandidates,
} from '../services/enrollmentService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';

export const listEnrollmentsController = asyncHandler(async (req, res) => {
  const data = await listEnrollments({ user: req.user, examId: req.params.id, query: req.query });
  return sendSuccess(res, data, 200);
});

export const enrollCandidatesController = asyncHandler(async (req, res) => {
  const data = await enrollCandidates({ user: req.user, examId: req.params.id, payload: req.body });
  return sendSuccess(res, data, 200);
});

export const removeEnrollmentController = asyncHandler(async (req, res) => {
  const data = await removeEnrollment({
    user: req.user,
    examId: req.params.id,
    userId: req.params.userId,
  });
  return sendSuccess(res, data, 200);
});

export const searchCandidatesController = asyncHandler(async (req, res) => {
  const data = await searchCandidates({ query: req.query });
  return sendSuccess(res, data, 200);
});
