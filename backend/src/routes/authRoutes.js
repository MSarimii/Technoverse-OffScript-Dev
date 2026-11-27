import express from 'express';
import { getMe, login, register, updatePassword } from '../controllers/authController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { authLimiter } from '../middleware/rateLimitMiddleware.js';
import { validate } from '../middleware/validate.js';
import { ApiError } from '../utils/ApiError.js';
import {
  changePasswordSchema,
  loginSchema,
  registerSchema,
} from '../validators/authValidator.js';

const requireSelfRegisterEnabled = (_req, _res, next) => {
  if (process.env.ALLOW_SELF_REGISTER !== 'true') {
    return next(new ApiError(403, 'FORBIDDEN', 'Self-registration is disabled'));
  }
  return next();
};

const router = express.Router();

router.post('/login', authLimiter, validate(loginSchema), login);
router.post(
  '/register',
  authLimiter,
  requireSelfRegisterEnabled,
  validate(registerSchema),
  register
);
router.get('/me', requireAuth, getMe);
router.patch('/password', requireAuth, validate(changePasswordSchema), updatePassword);

export default router;
