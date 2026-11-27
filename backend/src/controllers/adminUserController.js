import {
  createAdminUser,
  getAdminOverview,
  listUsers,
  resetAdminUserPassword,
  updateAdminUser,
} from '../services/adminUserService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';

export const listUsersController = asyncHandler(async (req, res) => {
  const data = await listUsers(req.query);
  return sendSuccess(res, data, 200);
});

export const createUserController = asyncHandler(async (req, res) => {
  const data = await createAdminUser(req.body);
  return sendSuccess(res, data, 201);
});

export const updateUserController = asyncHandler(async (req, res) => {
  const data = await updateAdminUser(req.user, req.params.id, req.body);
  return sendSuccess(res, data, 200);
});

export const resetPasswordController = asyncHandler(async (req, res) => {
  const data = await resetAdminUserPassword(req.params.id, req.body);
  return sendSuccess(res, data, 200);
});

export const getOverviewController = asyncHandler(async (_req, res) => {
  const data = await getAdminOverview();
  return sendSuccess(res, data, 200);
});
