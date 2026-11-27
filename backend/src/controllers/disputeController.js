import {
  createDispute,
  listAttemptDisputes,
  listExamDisputes,
  resolveDispute,
} from '../services/disputeService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';

export const createDisputeController = asyncHandler(async (req, res) => {
  const data = await createDispute({
    user: req.user,
    attemptId: req.params.id,
    questionId: req.body.questionId,
    reason: req.body.reason,
  });
  return sendSuccess(res, data, 201);
});

export const listAttemptDisputesController = asyncHandler(async (req, res) => {
  const data = await listAttemptDisputes({
    user: req.user,
    attemptId: req.params.id,
  });
  return sendSuccess(res, data, 200);
});

export const listExamDisputesController = asyncHandler(async (req, res) => {
  const data = await listExamDisputes({
    user: req.user,
    examId: req.params.id,
    status: req.query.status,
  });
  return sendSuccess(res, data, 200);
});

export const resolveDisputeController = asyncHandler(async (req, res) => {
  const data = await resolveDispute({
    user: req.user,
    disputeId: req.params.id,
    status: req.body.status,
    resolutionNote: req.body.resolutionNote,
    adjustedScore: req.body.adjustedScore,
  });
  return sendSuccess(res, data, 200);
});
