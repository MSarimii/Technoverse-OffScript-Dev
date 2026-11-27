import express from 'express';
import {
  enrollCandidatesController,
  listEnrollmentsController,
  removeEnrollmentController,
} from '../controllers/enrollmentController.js';
import {
  deleteSandboxController,
  startSandboxController,
} from '../controllers/attemptController.js';
import {
  completeExamController,
  createExamController,
  deleteExamController,
  getExamController,
  getExamReadinessController,
  listExamsController,
  publishExamController,
  setExamQuestionsController,
  updateBlueprintController,
  updateExamController,
} from '../controllers/examController.js';
import {
  getExamAnalyticsController,
  getExamQuestionAnalyticsController,
  getResultsPreviewController,
  listExamSubmissionsController,
  publishResultsController,
  regradeExamController,
  unpublishResultsController,
} from '../controllers/gradingController.js';
import { importEnrollmentsController } from '../controllers/importController.js';
import {
  createAnnouncementController,
  getExamMonitorController,
  listAnnouncementsController,
  listExamIncidentsController,
} from '../controllers/monitoringController.js';
import { listExamDisputesController } from '../controllers/disputeController.js';
import {
  getExamFairnessController,
  getExamReportPdfController,
  getExamResultsCsvController,
} from '../controllers/reportController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/rbacMiddleware.js';
import { validate } from '../middleware/validate.js';
import { listExamDisputesQuerySchema } from '../validators/disputeValidator.js';
import {
  enrollCandidatesSchema,
  listEnrollmentsQuerySchema,
  removeEnrollmentParamSchema,
} from '../validators/enrollmentValidator.js';
import {
  assignExamQuestionsSchema,
  blueprintSchema,
  createExamSchema,
  examIdParamSchema,
  listExamsQuerySchema,
  updateExamSchema,
} from '../validators/examValidator.js';
import { publishResultsSchema } from '../validators/gradingValidator.js';
import { importEnrollmentsSchema } from '../validators/importValidator.js';
import { createAnnouncementSchema, listIncidentsQuerySchema } from '../validators/monitoringValidator.js';

const router = express.Router();
const examinerOrAdmin = requireRole('examiner', 'admin');

router.use(requireAuth);

router.get('/', examinerOrAdmin, validate(listExamsQuerySchema), listExamsController);
router.post('/', examinerOrAdmin, validate(createExamSchema), createExamController);
router.get('/:id', examinerOrAdmin, validate(examIdParamSchema), getExamController);
router.patch('/:id', examinerOrAdmin, validate(updateExamSchema), updateExamController);
router.delete('/:id', examinerOrAdmin, validate(examIdParamSchema), deleteExamController);

router.put(
  '/:id/questions',
  examinerOrAdmin,
  validate(assignExamQuestionsSchema),
  setExamQuestionsController
);
router.get('/:id/readiness', examinerOrAdmin, validate(examIdParamSchema), getExamReadinessController);
router.post('/:id/publish', examinerOrAdmin, validate(examIdParamSchema), publishExamController);
router.post('/:id/complete', examinerOrAdmin, validate(examIdParamSchema), completeExamController);
router.put('/:id/blueprint', examinerOrAdmin, validate(blueprintSchema), updateBlueprintController);

router.get(
  '/:id/enrollments',
  examinerOrAdmin,
  validate(listEnrollmentsQuerySchema),
  listEnrollmentsController
);
router.post(
  '/:id/enrollments',
  examinerOrAdmin,
  validate(enrollCandidatesSchema),
  enrollCandidatesController
);
router.post(
  '/:id/enrollments/import',
  examinerOrAdmin,
  validate(importEnrollmentsSchema),
  importEnrollmentsController
);
router.delete(
  '/:id/enrollments/:userId',
  examinerOrAdmin,
  validate(removeEnrollmentParamSchema),
  removeEnrollmentController
);

router.post('/:id/sandbox/start', examinerOrAdmin, validate(examIdParamSchema), startSandboxController);
router.delete('/:id/sandbox', examinerOrAdmin, validate(examIdParamSchema), deleteSandboxController);

router.get('/:id/submissions', examinerOrAdmin, validate(examIdParamSchema), listExamSubmissionsController);
router.post('/:id/regrade', examinerOrAdmin, validate(examIdParamSchema), regradeExamController);
router.get(
  '/:id/results/preview',
  examinerOrAdmin,
  validate(examIdParamSchema),
  getResultsPreviewController
);
router.post(
  '/:id/results/publish',
  examinerOrAdmin,
  validate(publishResultsSchema),
  publishResultsController
);
router.post(
  '/:id/results/unpublish',
  examinerOrAdmin,
  validate(examIdParamSchema),
  unpublishResultsController
);
router.get('/:id/analytics', examinerOrAdmin, validate(examIdParamSchema), getExamAnalyticsController);
router.get(
  '/:id/questions/analytics',
  examinerOrAdmin,
  validate(examIdParamSchema),
  getExamQuestionAnalyticsController
);
router.get('/:id/fairness', examinerOrAdmin, validate(examIdParamSchema), getExamFairnessController);
router.get('/:id/report.pdf', examinerOrAdmin, validate(examIdParamSchema), getExamReportPdfController);
router.get('/:id/results.csv', examinerOrAdmin, validate(examIdParamSchema), getExamResultsCsvController);
router.get(
  '/:id/disputes',
  examinerOrAdmin,
  validate(listExamDisputesQuerySchema),
  listExamDisputesController
);

router.get('/:id/monitor', examinerOrAdmin, validate(examIdParamSchema), getExamMonitorController);
router.get(
  '/:id/incidents',
  examinerOrAdmin,
  validate(listIncidentsQuerySchema),
  listExamIncidentsController
);
router.post(
  '/:id/announcements',
  examinerOrAdmin,
  validate(createAnnouncementSchema),
  createAnnouncementController
);
router.get(
  '/:id/announcements',
  requireRole('examiner', 'admin', 'candidate'),
  validate(examIdParamSchema),
  listAnnouncementsController
);

export default router;
