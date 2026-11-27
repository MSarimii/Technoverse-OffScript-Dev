import { serializeUser } from '../models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';

export const getPreferencesController = asyncHandler(async (req, res) => {
  return sendSuccess(res, { preferences: serializeUser(req.user).preferences }, 200);
});

export const updatePreferencesController = asyncHandler(async (req, res) => {
  const current = serializeUser(req.user).preferences;
  req.user.preferences = { ...current, ...req.body };
  await req.user.save();
  return sendSuccess(res, { preferences: serializeUser(req.user).preferences }, 200);
});
