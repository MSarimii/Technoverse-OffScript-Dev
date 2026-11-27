import { serializeUser } from '../models/User.js';
import { changeOwnPassword, loginUser, registerCandidate } from '../services/authService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';

export const login = asyncHandler(async (req, res) => {
  const data = await loginUser(req.body);
  return sendSuccess(res, data, 200);
});

export const register = asyncHandler(async (req, res) => {
  const data = await registerCandidate(req.body);
  return sendSuccess(res, data, 201);
});

export const getMe = asyncHandler(async (req, res) => {
  return sendSuccess(res, { user: serializeUser(req.user) }, 200);
});

export const updatePassword = asyncHandler(async (req, res) => {
  const data = await changeOwnPassword(req.user._id, req.body);
  return sendSuccess(res, data, 200);
});
