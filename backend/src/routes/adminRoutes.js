import express from 'express';
import {
  createUserController,
  getOverviewController,
  listUsersController,
  resetPasswordController,
  updateUserController,
} from '../controllers/adminUserController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/rbacMiddleware.js';
import { validate } from '../middleware/validate.js';
import {
  createUserSchema,
  listUsersQuerySchema,
  resetPasswordSchema,
  updateUserSchema,
} from '../validators/adminUserValidator.js';

const router = express.Router();

router.use(requireAuth, requireRole('admin'));

router.get('/overview', getOverviewController);
router.get('/users', validate(listUsersQuerySchema), listUsersController);
router.post('/users', validate(createUserSchema), createUserController);
router.patch('/users/:id', validate(updateUserSchema), updateUserController);
router.post('/users/:id/reset-password', validate(resetPasswordSchema), resetPasswordController);

export default router;
