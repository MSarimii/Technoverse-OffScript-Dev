import express from 'express';
import {
  getPreferencesController,
  updatePreferencesController,
} from '../controllers/meController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/rbacMiddleware.js';
import { validate } from '../middleware/validate.js';
import { updatePreferencesSchema } from '../validators/meValidator.js';

const router = express.Router();

router.use(requireAuth, requireRole('candidate', 'examiner', 'admin'));

router.get('/preferences', getPreferencesController);
router.put('/preferences', validate(updatePreferencesSchema), updatePreferencesController);

export default router;
