import express from 'express';
import {
  getCandidateExamDetailController,
  listCandidateExamsController,
  startOrResumeAttemptController,
} from '../controllers/attemptController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/rbacMiddleware.js';
import { validate } from '../middleware/validate.js';
import { examIdParamSchema, startAttemptSchema } from '../validators/attemptValidator.js';

const router = express.Router();

router.use(requireAuth, requireRole('candidate'));

router.get('/', listCandidateExamsController);
router.get('/:id', validate(examIdParamSchema), getCandidateExamDetailController);
router.post('/:id/start', validate(startAttemptSchema), startOrResumeAttemptController);

export default router;
