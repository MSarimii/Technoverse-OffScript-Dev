import rateLimit from 'express-rate-limit';

/**
 * Rate limiter for sensitive authentication endpoints (login, register).
 * Max 10 requests per minute per IP to prevent credential brute-forcing.
 */
export const authLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts from this IP, please try again in a minute.',
  },
});
