import { importEnrollments, importQuestions } from '../services/importService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';

export const importQuestionsController = asyncHandler(async (req, res) => {
  const data = await importQuestions({
    user: req.user,
    payload: req.body,
    query: req.query,
  });
  return sendSuccess(res, data, 200);
});

export const importEnrollmentsController = asyncHandler(async (req, res) => {
  const data = await importEnrollments({
    user: req.user,
    examId: req.params.id,
    payload: req.body,
    query: req.query,
  });
  return sendSuccess(res, data, 200);
});
