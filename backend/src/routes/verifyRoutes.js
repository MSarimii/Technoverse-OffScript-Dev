import express from 'express';
import { verifyCodeController } from '../controllers/reportController.js';
import { validate } from '../middleware/validate.js';
import { verifyCodeParamSchema } from '../validators/reportValidator.js';

const router = express.Router();

router.get('/:code', validate(verifyCodeParamSchema), verifyCodeController);

export default router;
