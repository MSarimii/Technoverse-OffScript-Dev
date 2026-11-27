import {
  archiveQuestion,
  createQuestion,
  getQuestionById,
  listQuestions,
  listTopics,
  updateQuestion,
} from '../services/questionService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';

export const listQuestionsController = asyncHandler(async (req, res) => {
  const data = await listQuestions({ user: req.user, query: req.query });
  return sendSuccess(res, data, 200);
});

export const createQuestionController = asyncHandler(async (req, res) => {
  const data = await createQuestion({ user: req.user, payload: req.body });
  return sendSuccess(res, data, 201);
});

export const listTopicsController = asyncHandler(async (req, res) => {
  const data = await listTopics({ user: req.user });
  return sendSuccess(res, data, 200);
});

export const getQuestionController = asyncHandler(async (req, res) => {
  const data = await getQuestionById({ user: req.user, questionId: req.params.id });
  return sendSuccess(res, data, 200);
});

export const updateQuestionController = asyncHandler(async (req, res) => {
  const data = await updateQuestion({
    user: req.user,
    questionId: req.params.id,
    payload: req.body,
  });
  return sendSuccess(res, data, 200);
});

export const archiveQuestionController = asyncHandler(async (req, res) => {
  const data = await archiveQuestion({ user: req.user, questionId: req.params.id });
  return sendSuccess(res, data, 200);
});
