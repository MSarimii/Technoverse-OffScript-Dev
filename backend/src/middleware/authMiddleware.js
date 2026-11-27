import User from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { verifyToken } from '../utils/generateToken.js';
import { requireRole } from './rbacMiddleware.js';

/**
 * Validates Bearer JWT, loads user from MongoDB, and verifies active status and tokenVersion.
 */
export const requireAuth = asyncHandler(async (req, _res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new ApiError(401, 'UNAUTHENTICATED', 'Not authorized, no token provided');
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    throw new ApiError(401, 'UNAUTHENTICATED', 'Not authorized, no token provided');
  }

  let decoded;
  try {
    decoded = verifyToken(token);
  } catch {
    throw new ApiError(401, 'UNAUTHENTICATED', 'Not authorized, token invalid or expired');
  }

  const user = await User.findById(decoded.id);
  if (!user) {
    throw new ApiError(401, 'UNAUTHENTICATED', 'User no longer exists');
  }

  if (!user.isActive) {
    throw new ApiError(401, 'UNAUTHENTICATED', 'Account is deactivated');
  }

  if ((decoded.tokenVersion ?? 0) !== (user.tokenVersion ?? 0)) {
    throw new ApiError(401, 'UNAUTHENTICATED', 'Session invalidated, please log in again');
  }

  req.user = user;
  next();
});

export const protect = requireAuth;
export const authorize = requireRole;
