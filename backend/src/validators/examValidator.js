import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;
const objectIdSchema = z.string().regex(objectIdRegex, 'Invalid identifier');

const examSettingsInputSchema = z
  .object({
    shuffleQuestions: z.boolean().optional(),
    shuffleOptions: z.boolean().optional(),
    showScoreImmediately: z.boolean().optional(),
    allowLateStart: z.boolean().optional(),
    strictEnd: z.boolean().optional(),
    negativeMarkingEnabled: z.boolean().optional(),
  })
  .strict();

export const examIdParamSchema = {
  params: z.object({ id: objectIdSchema }).strict(),
};

export const listExamsQuerySchema = {
  query: z
    .object({
      status: z.enum(['draft', 'published', 'ongoing', 'completed', 'cancelled']).optional(),
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(20),
    })
    .strict(),
};

export const createExamSchema = {
  body: z
    .object({
      title: z.string().trim().min(3, 'Title must be at least 3 characters').max(150),
      instructions: z.string().trim().max(10000).optional(),
      startAt: z.coerce.date(),
      endAt: z.coerce.date(),
      durationMinutes: z.number().int().min(1, 'Duration must be at least 1 minute'),
      settings: examSettingsInputSchema.optional(),
    })
    .strict()
    .refine((data) => data.endAt > data.startAt, {
      path: ['endAt'],
      message: 'endAt must be after startAt',
    }),
};

export const updateExamSchema = {
  params: examIdParamSchema.params,
  body: z
    .object({
      title: z.string().trim().min(3).max(150).optional(),
      instructions: z.string().trim().max(10000).optional(),
      startAt: z.coerce.date().optional(),
      endAt: z.coerce.date().optional(),
      durationMinutes: z.number().int().min(1).optional(),
      settings: examSettingsInputSchema.optional(),
    })
    .strict()
    .refine((data) => Object.keys(data).length > 0, {
      message: 'At least one updatable field is required',
    })
    .refine((data) => !(data.startAt && data.endAt) || data.endAt > data.startAt, {
      path: ['endAt'],
      message: 'endAt must be after startAt',
    }),
};

export const assignExamQuestionsSchema = {
  params: examIdParamSchema.params,
  body: z
    .object({
      questions: z.array(
        z
          .object({
            questionId: objectIdSchema,
            marks: z.number().min(0.25, 'Marks must be at least 0.25').optional(),
          })
          .strict()
      ),
    })
    .strict()
    .superRefine((data, ctx) => {
      const seen = new Set();
      for (let i = 0; i < data.questions.length; i++) {
        const qId = data.questions[i].questionId;
        if (seen.has(qId)) {
          ctx.addIssue({
            code: 'custom',
            path: ['questions', i, 'questionId'],
            message: 'Duplicate questionId in exam question list',
          });
        }
        seen.add(qId);
      }
    }),
};

export const blueprintSchema = {
  params: examIdParamSchema.params,
  body: z
    .object({
      easy: z.number().int().min(0),
      medium: z.number().int().min(0),
      hard: z.number().int().min(0),
      poolMode: z.boolean().default(false),
    })
    .strict(),
};
