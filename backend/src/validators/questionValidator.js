import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;
const questionTypeEnum = z.enum(['single', 'multiple', 'written']);
const difficultyEnum = z.enum(['easy', 'medium', 'hard']);

const optionInputSchema = z
  .object({
    text: z.string().trim().min(1, 'Option text cannot be empty'),
  })
  .strict();

const schemeInputSchema = z
  .object({
    mode: z.enum(['all_or_nothing', 'partial']).default('all_or_nothing'),
    negativeMarks: z.number().min(0, 'Negative marks cannot be negative').default(0),
  })
  .strict();

/**
 * Validates cross-field consistency between question type, options, and correctOptionIndexes.
 */
export const validateQuestionConsistency = ({ type, options = [], correctOptionIndexes = [] }) => {
  const issues = [];
  const opts = Array.isArray(options) ? options : [];
  const indexes = Array.isArray(correctOptionIndexes) ? correctOptionIndexes : [];

  if (type === 'written') {
    if (opts.length > 0) {
      issues.push({ path: 'options', message: 'Written questions must not have options' });
    }
    if (indexes.length > 0) {
      issues.push({
        path: 'correctOptionIndexes',
        message: 'Written questions must not have correctOptionIndexes',
      });
    }
    return issues;
  }

  if (opts.length < 2 || opts.length > 8) {
    issues.push({
      path: 'options',
      message: `${type} questions must have between 2 and 8 options`,
    });
  }

  const uniqueIndexes = new Set(indexes);
  if (uniqueIndexes.size !== indexes.length) {
    issues.push({
      path: 'correctOptionIndexes',
      message: 'correctOptionIndexes must not contain duplicates',
    });
  }

  for (const idx of indexes) {
    if (!Number.isInteger(idx) || idx < 0 || idx >= opts.length) {
      issues.push({
        path: 'correctOptionIndexes',
        message: `Option index ${idx} is out of range`,
      });
    }
  }

  if (type === 'single' && indexes.length !== 1) {
    issues.push({
      path: 'correctOptionIndexes',
      message: 'Single-choice questions must have exactly 1 correct option',
    });
  }

  if (type === 'multiple' && indexes.length < 1) {
    issues.push({
      path: 'correctOptionIndexes',
      message: 'Multiple-select questions must have at least 1 correct option',
    });
  }

  return issues;
};

export const questionIdParamSchema = {
  params: z
    .object({
      id: z.string().regex(objectIdRegex, 'Invalid question ID'),
    })
    .strict(),
};

export const listQuestionsQuerySchema = {
  query: z
    .object({
      topic: z.string().trim().min(1).optional(),
      difficulty: difficultyEnum.optional(),
      type: questionTypeEnum.optional(),
      includeArchived: z.enum(['true', 'false']).optional(),
      q: z.string().trim().max(100).optional(),
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(20),
    })
    .strict(),
};

export const createQuestionSchema = {
  body: z
    .object({
      type: questionTypeEnum,
      text: z.string().trim().min(3, 'Question text must be at least 3 characters'),
      options: z.array(optionInputSchema).optional(),
      correctOptionIndexes: z.array(z.number().int().nonnegative()).optional(),
      topic: z.string().trim().min(1, 'Topic is required'),
      difficulty: difficultyEnum,
      marks: z.number().min(0.25, 'Marks must be at least 0.25'),
      scheme: schemeInputSchema.optional(),
      rubric: z.string().trim().optional(),
      explanation: z.string().trim().optional(),
    })
    .strict()
    .superRefine((data, ctx) => {
      for (const issue of validateQuestionConsistency(data)) {
        ctx.addIssue({
          code: 'custom',
          path: [issue.path],
          message: issue.message,
        });
      }
    }),
};

export const updateQuestionSchema = {
  params: questionIdParamSchema.params,
  body: z
    .object({
      type: questionTypeEnum.optional(),
      text: z.string().trim().min(3, 'Question text must be at least 3 characters').optional(),
      options: z.array(optionInputSchema).optional(),
      correctOptionIndexes: z.array(z.number().int().nonnegative()).optional(),
      topic: z.string().trim().min(1, 'Topic cannot be empty').optional(),
      difficulty: difficultyEnum.optional(),
      marks: z.number().min(0.25, 'Marks must be at least 0.25').optional(),
      scheme: z
        .object({
          mode: z.enum(['all_or_nothing', 'partial']).optional(),
          negativeMarks: z.number().min(0, 'Negative marks cannot be negative').optional(),
        })
        .strict()
        .optional(),
      rubric: z.string().trim().optional(),
      explanation: z.string().trim().optional(),
      isArchived: z.boolean().optional(),
    })
    .strict()
    .refine((data) => Object.keys(data).length > 0, {
      message: 'At least one updatable field is required',
    }),
};
