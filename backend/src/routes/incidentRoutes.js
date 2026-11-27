import express from 'express';
import { reviewIncidentController } from '../controllers/monitoringController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/rbacMiddleware.js';
import { validate } from '../middleware/validate.js';
import { reviewIncidentSchema } from '../validators/monitoringValidator.js';

const router = express.Router();

router.use(requireAuth, requireRole('examiner', 'admin'));

router.patch('/:id', validate(reviewIncidentSchema), reviewIncidentController);

export default router;
