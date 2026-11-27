import express from 'express';
import { searchCandidatesController } from '../controllers/enrollmentController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/rbacMiddleware.js';
import { validate } from '../middleware/validate.js';
import { searchCandidatesQuerySchema } from '../validators/enrollmentValidator.js';

const router = express.Router();

router.use(requireAuth, requireRole('examiner', 'admin'));

router.get('/', validate(searchCandidatesQuerySchema), searchCandidatesController);

export default router;
