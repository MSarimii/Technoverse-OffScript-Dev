import express from 'express';
import { z } from 'zod';
import { generateCompletion } from '../services/aiService.js';

const router = express.Router();

const testPromptSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required and cannot be empty'),
});

/**
 * @desc    Test OpenRouter AI completion
 * @route   POST /api/ai/test
 * @access  Public
 */
router.post('/test', async (req, res, next) => {
  try {
    const parseResult = testPromptSchema.safeParse(req.body);
    if (!parseResult.success) {
      const errorMessage =
        parseResult.error.issues?.[0]?.message ||
        parseResult.error.errors?.[0]?.message ||
        'Invalid request body';
      return res.status(400).json({
        success: false,
        message: errorMessage,
      });
    }

    const { prompt } = parseResult.data;
    const result = await generateCompletion(prompt);

    return res.status(200).json({
      success: true,
      data: {
        content: result.content,
        model: result.model,
        mock: !!result.mock,
        usage: result.usage,
      },
    });
  } catch (error) {
    if (error.statusCode === 429 || error.isRateLimit) {
      return res.status(429).json({
        success: false,
        message: error.message || 'OpenRouter rate limit exceeded. Please retry shortly.',
      });
    }
    next(error);
  }
});

export default router;
