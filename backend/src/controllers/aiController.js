/**
 * aiController.js — Controller for Examiner AI Assistant Endpoints
 * Routes requests to aiService, enforces validation schemas,
 * and standardizes error responses and audit logging.
 */

import {
  suggestGradeRequestSchema,
  suggestQuestionsRequestSchema,
  testPromptSchema,
} from '../services/ai/schemas.js';
import { formatStandardError, AiError } from '../services/ai/errors.js';
import aiService from '../services/aiService.js';

function handleControllerError(res, err, route) {
  const statusCode = err?.statusCode || 500;
  const standardError = formatStandardError(err);

  // Safe privacy audit log (no PII, prompts, answers, or keys)
  console.log(
    JSON.stringify({
      route,
      status: 'error',
      statusCode,
      code: standardError.error.code,
    })
  );

  return res.status(statusCode).json(standardError);
}

export const suggestGradeHandler = async (req, res) => {
  const start = Date.now();
  const route = 'POST /api/ai/suggest-grade';

  try {
    const parseResult = suggestGradeRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw new AiError('VALIDATION_ERROR', parseResult.error.issues?.[0]?.message || 'Invalid request body', {
        fields: parseResult.error.issues,
      });
    }

    const { attemptId, questionId } = parseResult.data;
    const examinerId = req.user?._id;

    const result = await aiService.suggestGradeForAttempt({
      attemptId,
      questionId,
      examinerId,
    });

    console.log(
      JSON.stringify({
        route,
        source: result.meta?.source,
        latencyMs: Date.now() - start,
        status: 'ok',
        cached: result.meta?.cached,
      })
    );

    return res.status(200).json({
      success: true,
      suggestion: result.suggestion,
      meta: result.meta,
    });
  } catch (err) {
    return handleControllerError(res, err, route);
  }
};

export const aiTestHandler = async (req, res) => {
  const start = Date.now();
  const route = 'POST /api/ai/test';

  try {
    const result = await aiService.testConnection();
    console.log(
      JSON.stringify({
        route,
        source: result.source,
        latencyMs: Date.now() - start,
        status: 'ok',
      })
    );

    return res.status(200).json({
      success: true,
      ok: result.ok,
      source: result.source,
      model: result.model,
      latencyMs: result.latencyMs,
    });
  } catch (err) {
    return handleControllerError(res, err, route);
  }
};

export const suggestQuestionsHandler = async (req, res) => {
  const start = Date.now();
  const route = 'POST /api/ai/suggest-questions';

  try {
    const parseResult = suggestQuestionsRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw new AiError('VALIDATION_ERROR', parseResult.error.issues?.[0]?.message || 'Invalid request body', {
        fields: parseResult.error.issues,
      });
    }

    const result = await aiService.suggestQuestions(parseResult.data);
    console.log(
      JSON.stringify({
        route,
        source: result.meta?.source,
        latencyMs: Date.now() - start,
        status: 'ok',
      })
    );

    return res.status(200).json({
      success: true,
      questions: result.questions,
      meta: result.meta,
      disclaimer: 'Draft questions only. Examiner reviews and imports manually.',
    });
  } catch (err) {
    return handleControllerError(res, err, route);
  }
};

export const testPromptHandler = async (req, res) => {
  const route = 'POST /api/ai/test-prompt';
  try {
    const parseResult = testPromptSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw new AiError('VALIDATION_ERROR', parseResult.error.issues?.[0]?.message || 'Invalid request body');
    }

    const result = await aiService.generateCompletion(parseResult.data.prompt);
    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    return handleControllerError(res, err, route);
  }
};
