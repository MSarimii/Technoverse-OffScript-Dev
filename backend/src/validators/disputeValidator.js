import { z } from 'zod';

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid identifier');

export const idParamSchema = {
  params: z.object({ id: objectIdSchema }).strict(),
};

export const createDisputeSchema = {
  params: idParamSchema.params,
  body: z
    .object({
      questionId: objectIdSchema,
      reason: z
        .string()
        .trim()
        .min(5, 'Dispute reason must be at least 5 characters')
        .max(1000, 'Dispute reason cannot exceed 1000 characters'),
    })
    .strict(),
};

export const listExamDisputesQuerySchema = {
  params: idParamSchema.params,
  query: z
    .object({
      status: z.enum(['open', 'under_review', 'accepted', 'rejected']).optional(),
    })
    .strict(),
};

export const resolveDisputeSchema = {
  params: idParamSchema.params,
  body: z
    .object({
      status: z.enum(['accepted', 'rejected']),
      resolutionNote: z.string().trim().max(1000).optional().default(''),
      adjustedScore: z.number().min(0, 'Adjusted score cannot be negative').optional(),
    })
    .strict(),
};
