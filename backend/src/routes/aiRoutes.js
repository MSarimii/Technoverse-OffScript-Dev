/**
 * aiRoutes.js — REST Routes for the SEMS AI Module
 * Thin route declarations with authentication, authorization, and rate limiting.
 * Zero business logic here (delegated to aiController).
 */

import express from 'express';
import rateLimit from 'express-rate-limit';
import { protect, authorize } from '../middleware/authMiddleware.js';
import {
  suggestGradeHandler,
  aiTestHandler,
  suggestQuestionsHandler,
  testPromptHandler,
} from '../controllers/aiController.js';

const router = express.Router();

/**
 * Per-examiner AI rate limiter: 20 requests per 1 minute window.
 * Protects upstream API quotas while allowing smooth examiner grading workflow.
 */
export const aiLimiter = rateLimit({
  windowMs: 1 * 60 * 1_000, // 1 minute
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?._id?.toString() || req.ip,
  message: {
    success: false,
    error: {
      code: 'AI_RATE_LIMITED',
      message: 'Too many AI requests. Please wait a minute before trying again.',
      fields: null,
    },
    code: 'AI_RATE_LIMITED',
    message: 'Too many AI requests. Please wait a minute before trying again.',
  },
});

// ─── Examiner-only AI Assistant Routes ────────────────────────────────────────

/**
 * @route   POST /api/ai/test
 * @desc    Examiner AI status health check
 * @access  Private (Examiner only)
 */
router.post('/test', protect, authorize('examiner', 'admin'), aiLimiter, aiTestHandler);

/**
 * @route   POST /api/ai/suggest-grade
 * @desc    Advisory grading suggestion for a written question attempt
 * @access  Private (Examiner who owns the exam, or Admin)
 */
router.post('/suggest-grade', protect, authorize('examiner', 'admin'), aiLimiter, suggestGradeHandler);

/**
 * @route   POST /api/ai/suggest-questions
 * @desc    Draft questions suggestion (stretch)
 * @access  Private (Examiner or Admin)
 */
router.post('/suggest-questions', protect, authorize('examiner', 'admin'), aiLimiter, suggestQuestionsHandler);

// ─── Backward Compatibility Route ─────────────────────────────────────────────

/**
 * @route   POST /api/ai/test-prompt
 * @desc    Public prompt test from initial starter
 * @access  Public
 */
router.post('/test-prompt', testPromptHandler);

export default router;
