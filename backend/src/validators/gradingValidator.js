import { z } from 'zod';

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid identifier');

export const examIdParamSchema = {
  params: z.object({ id: objectIdSchema }).strict(),
};

export const attemptIdParamSchema = {
  params: z.object({ id: objectIdSchema }).strict(),
};

export const manualGradeSchema = {
  params: z
    .object({
      id: objectIdSchema,
      questionId: objectIdSchema,
    })
    .strict(),
  body: z
    .object({
      score: z.number().min(0, 'Score cannot be negative'),
      feedback: z.string().trim().max(2000).optional(),
    })
    .strict(),
};

export const publishResultsSchema = {
  params: examIdParamSchema.params,
  body: z.preprocess(
    (val) => (val === undefined ? {} : val),
    z
      .object({
        force: z.boolean().optional().default(false),
      })
      .strict()
  ),
};

export const candidateResultParamSchema = {
  params: z.object({ attemptId: objectIdSchema }).strict(),
};
