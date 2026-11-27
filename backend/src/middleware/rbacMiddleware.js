import { ApiError } from '../utils/ApiError.js';

/**
 * Enforces role-based access control on authenticated routes.
 */
export const requireRole = (...allowedRoles) => (req, _res, next) => {
  if (!req.user || !allowedRoles.includes(req.user.role)) {
    return next(
      new ApiError(403, 'FORBIDDEN', 'You do not have permission to access this resource')
    );
  }
  return next();
};
