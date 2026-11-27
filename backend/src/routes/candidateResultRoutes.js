import express from 'express';
import {
  getCandidateResultDetailController,
  listCandidateResultsController,
} from '../controllers/gradingController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/rbacMiddleware.js';
import { validate } from '../middleware/validate.js';
import { candidateResultParamSchema } from '../validators/gradingValidator.js';

const router = express.Router();

router.use(requireAuth, requireRole('candidate'));

router.get('/', listCandidateResultsController);
router.get('/:attemptId', validate(candidateResultParamSchema), getCandidateResultDetailController);

export default router;
