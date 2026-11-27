import express from 'express';
import { resolveDisputeController } from '../controllers/disputeController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/rbacMiddleware.js';
import { validate } from '../middleware/validate.js';
import { resolveDisputeSchema } from '../validators/disputeValidator.js';

const router = express.Router();

router.use(requireAuth, requireRole('examiner', 'admin'));

router.patch('/:id/resolve', validate(resolveDisputeSchema), resolveDisputeController);

export default router;
