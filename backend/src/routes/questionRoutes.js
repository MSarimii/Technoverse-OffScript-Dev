import express from 'express';
import {
  archiveQuestionController,
  createQuestionController,
  getQuestionController,
  listQuestionsController,
  listTopicsController,
  updateQuestionController,
} from '../controllers/questionController.js';
import { importQuestionsController } from '../controllers/importController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/rbacMiddleware.js';
import { validate } from '../middleware/validate.js';
import {
  createQuestionSchema,
  listQuestionsQuerySchema,
  questionIdParamSchema,
  updateQuestionSchema,
} from '../validators/questionValidator.js';
import { importQuestionsSchema } from '../validators/importValidator.js';

const router = express.Router();

router.use(requireAuth, requireRole('examiner', 'admin'));

router.get('/', validate(listQuestionsQuerySchema), listQuestionsController);
router.post('/', validate(createQuestionSchema), createQuestionController);
router.post('/import', validate(importQuestionsSchema), importQuestionsController);
router.get('/topics', listTopicsController);
router.get('/:id', validate(questionIdParamSchema), getQuestionController);
router.patch('/:id', validate(updateQuestionSchema), updateQuestionController);
router.delete('/:id', validate(questionIdParamSchema), archiveQuestionController);

export default router;
