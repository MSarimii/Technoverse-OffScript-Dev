import rateLimit from 'express-rate-limit';

const rateLimitMessage = (message) => ({
  success: false,
  error: {
    code: 'RATE_LIMITED',
    message,
    details: [],
  },
});

/**
 * Rate limiter for authentication endpoints (5 requests/min/IP, skipped in test env).
 */
export const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  message: rateLimitMessage(
    'Too many authentication attempts from this IP, please try again in a minute.'
  ),
});

/**
 * General API rate limiter protecting all /api routes from request bursts.
 */
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitMessage('Too many requests, please try again shortly.'),
});
