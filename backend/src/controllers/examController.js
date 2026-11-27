import {
  completeExam,
  createExam,
  deleteExam,
  getExamById,
  getExamReadiness,
  listExams,
  publishExam,
  setExamQuestions,
  updateBlueprint,
  updateExam,
} from '../services/examService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';

export const listExamsController = asyncHandler(async (req, res) => {
  const data = await listExams({ user: req.user, query: req.query });
  return sendSuccess(res, data, 200);
});

export const createExamController = asyncHandler(async (req, res) => {
  const data = await createExam({ user: req.user, payload: req.body });
  return sendSuccess(res, data, 201);
});

export const getExamController = asyncHandler(async (req, res) => {
  const data = await getExamById({ user: req.user, examId: req.params.id });
  return sendSuccess(res, data, 200);
});

export const updateExamController = asyncHandler(async (req, res) => {
  const data = await updateExam({ user: req.user, examId: req.params.id, payload: req.body });
  return sendSuccess(res, data, 200);
});

export const deleteExamController = asyncHandler(async (req, res) => {
  const data = await deleteExam({ user: req.user, examId: req.params.id });
  return sendSuccess(res, data, 200);
});

export const setExamQuestionsController = asyncHandler(async (req, res) => {
  const data = await setExamQuestions({
    user: req.user,
    examId: req.params.id,
    questions: req.body.questions,
  });
  return sendSuccess(res, data, 200);
});

export const getExamReadinessController = asyncHandler(async (req, res) => {
  const data = await getExamReadiness({ user: req.user, examId: req.params.id });
  return sendSuccess(res, data, 200);
});

export const publishExamController = asyncHandler(async (req, res) => {
  const data = await publishExam({ user: req.user, examId: req.params.id });
  return sendSuccess(res, data, 200);
});

export const completeExamController = asyncHandler(async (req, res) => {
  const data = await completeExam({ user: req.user, examId: req.params.id });
  return sendSuccess(res, data, 200);
});

export const updateBlueprintController = asyncHandler(async (req, res) => {
  const data = await updateBlueprint({ user: req.user, examId: req.params.id, payload: req.body });
  return sendSuccess(res, data, 200);
});
