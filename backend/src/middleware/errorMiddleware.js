import { ApiError } from '../utils/ApiError.js';

const normalizeError = (err, res) => {
  if (err instanceof ApiError) {
    return {
      statusCode: err.statusCode,
      code: err.code,
      message: err.message,
      details: err.details,
    };
  }

  if (
    err instanceof SyntaxError &&
    err.status === 400 &&
    ('body' in err || err.type === 'entity.parse.failed')
  ) {
    return {
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      message: 'Invalid JSON payload',
      details: [],
    };
  }

  if (err?.name === 'CastError') {
    return {
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      message: `Invalid ${err.path || 'identifier'}`,
      details: [{ path: err.path || '', message: err.message }],
    };
  }

  if (err?.name === 'ValidationError') {
    const details = Object.values(err.errors || {}).map((e) => ({
      path: e.path || '',
      message: e.message,
    }));
    return {
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      details,
    };
  }

  if (err?.code === 11000) {
    const details = Object.keys(err.keyValue || {}).map((key) => ({
      path: key,
      message: `${key} already exists`,
    }));
    return {
      statusCode: 409,
      code: 'CONFLICT',
      message: 'Duplicate resource value',
      details,
    };
  }

  if (err?.name === 'JsonWebTokenError' || err?.name === 'TokenExpiredError') {
    return {
      statusCode: 401,
      code: 'UNAUTHENTICATED',
      message: err.message || 'Authentication failed',
      details: [],
    };
  }

  const statusCode =
    err?.statusCode && err.statusCode >= 400
      ? err.statusCode
      : res.statusCode && res.statusCode !== 200
        ? res.statusCode
        : 500;

  return {
    statusCode,
    code: err?.code || (statusCode === 404 ? 'NOT_FOUND' : 'INTERNAL_ERROR'),
    message:
      process.env.NODE_ENV === 'production' && statusCode === 500
        ? 'Internal Server Error'
        : err?.message || 'Internal Server Error',
    details: Array.isArray(err?.details) ? err.details : [],
  };
};

/**
 * Centralized Express error handler emitting { success: false, error: { code, message, details } }.
 */
export const errorMiddleware = (err, _req, res, _next) => {
  const { statusCode, code, message, details } = normalizeError(err, res);

  return res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      details,
    },
    ...(process.env.NODE_ENV !== 'production' && err?.stack ? { stack: err.stack } : {}),
  });
};

export const errorHandler = errorMiddleware;
