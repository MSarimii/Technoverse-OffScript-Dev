import express from 'express';
import {
  autosaveAnswersController,
  getAttemptController,
  recordHeartbeatController,
  reportIncidentController,
  saveScratchpadController,
  submitAttemptController,
} from '../controllers/attemptController.js';
import {
  getAttemptForGradingController,
  gradeManualQuestionController,
} from '../controllers/gradingController.js';
import {
  createDisputeController,
  listAttemptDisputesController,
} from '../controllers/disputeController.js';
import { getAttemptReportPdfController } from '../controllers/reportController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/rbacMiddleware.js';
import { validate } from '../middleware/validate.js';
import {
  attemptIdParamSchema,
  autosaveAnswersSchema,
  heartbeatSchema,
  incidentEventSchema,
  scratchpadSchema,
  submitAttemptSchema,
} from '../validators/attemptValidator.js';
import { createDisputeSchema, idParamSchema as disputeIdParamSchema } from '../validators/disputeValidator.js';
import { manualGradeSchema } from '../validators/gradingValidator.js';

const router = express.Router();

router.use(requireAuth);

const sessionRoles = requireRole('candidate', 'examiner', 'admin');

router.get('/:id', sessionRoles, validate(attemptIdParamSchema), getAttemptController);
router.put(
  '/:id/answers',
  sessionRoles,
  validate(autosaveAnswersSchema),
  autosaveAnswersController
);
router.put(
  '/:id/scratchpad',
  sessionRoles,
  validate(scratchpadSchema),
  saveScratchpadController
);
router.post(
  '/:id/heartbeat',
  sessionRoles,
  validate(heartbeatSchema),
  recordHeartbeatController
);
router.post(
  '/:id/events',
  sessionRoles,
  validate(incidentEventSchema),
  reportIncidentController
);
router.post(
  '/:id/submit',
  sessionRoles,
  validate(submitAttemptSchema),
  submitAttemptController
);

router.get(
  '/:id/report.pdf',
  sessionRoles,
  validate(attemptIdParamSchema),
  getAttemptReportPdfController
);
router.post(
  '/:id/disputes',
  requireRole('candidate'),
  validate(createDisputeSchema),
  createDisputeController
);
router.get(
  '/:id/disputes',
  sessionRoles,
  validate(disputeIdParamSchema),
  listAttemptDisputesController
);
router.get(
  '/:id/grading',
  requireRole('examiner', 'admin'),
  validate(attemptIdParamSchema),
  getAttemptForGradingController
);
router.put(
  '/:id/grades/:questionId',
  requireRole('examiner', 'admin'),
  validate(manualGradeSchema),
  gradeManualQuestionController
);

export default router;
