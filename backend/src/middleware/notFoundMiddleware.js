import { ApiError } from '../utils/ApiError.js';

/**
 * Catch-all 404 middleware for unmatched routes.
 */
export const notFoundMiddleware = (req, _res, next) => {
  next(new ApiError(404, 'NOT_FOUND', `Route not found - ${req.originalUrl}`));
};

export const notFound = notFoundMiddleware;
