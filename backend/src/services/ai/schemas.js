/**
 * schemas.js — Centralized Zod Schemas for the AI Module
 * Enforces strict input validation and provider output verification.
 */

import { z } from 'zod';

const OBJECT_ID_REGEX = /^[a-f\d]{24}$/i;

/** Schema for model grading suggestion output */
export const gradeSuggestionSchema = z.object({
  suggestedMarks: z.number(),
  matchedPoints: z.array(z.string()),
  missingPoints: z.array(z.string()),
  rationale: z.string().max(400),
  confidence: z.enum(['low', 'medium', 'high']),
});

/** Schema for POST /api/ai/suggest-grade request body (IDs only, strict) */
export const suggestGradeRequestSchema = z
  .object({
    attemptId: z.string().regex(OBJECT_ID_REGEX, 'Invalid attemptId'),
    questionId: z.string().regex(OBJECT_ID_REGEX, 'Invalid questionId'),
  })
  .strict();

/** Schema for POST /api/ai/suggest-questions request body */
export const suggestQuestionsRequestSchema = z
  .object({
    topic: z.string().min(1, 'Topic is required').max(200, 'Topic is too long'),
    difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
    count: z.number().int().min(1).max(5).default(3),
  })
  .strict();

/** Schema for question draft generation output */
export const draftQuestionSchema = z.object({
  questions: z
    .array(
      z.object({
        type: z.enum(['mcq', 'written', 'short']),
        text: z.string().min(5),
        marks: z.number().min(0),
        rubric: z.string().optional().default(''),
        options: z.array(z.string()).optional().default([]),
      })
    )
    .min(1)
    .max(5),
});

/** Schema for public test prompt endpoint */
export const testPromptSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required and cannot be empty'),
});
