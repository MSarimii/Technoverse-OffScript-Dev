/**
 * Wraps an async Express route handler and forwards rejected promises to error middleware.
 */
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
