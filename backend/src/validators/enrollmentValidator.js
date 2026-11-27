import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;
const objectIdSchema = z.string().regex(objectIdRegex, 'Invalid identifier');

export const listEnrollmentsQuerySchema = {
  params: z.object({ id: objectIdSchema }).strict(),
  query: z
    .object({
      status: z.enum(['active', 'removed']).optional(),
    })
    .strict(),
};

export const enrollCandidatesSchema = {
  params: z.object({ id: objectIdSchema }).strict(),
  body: z
    .object({
      userIds: z.array(objectIdSchema).optional(),
      emails: z.array(z.string().trim().email('Valid email is required')).optional(),
    })
    .strict()
    .refine((data) => (data.userIds?.length || 0) + (data.emails?.length || 0) > 0, {
      message: 'Provide at least one userId or email',
    }),
};

export const removeEnrollmentParamSchema = {
  params: z
    .object({
      id: objectIdSchema,
      userId: objectIdSchema,
    })
    .strict(),
};

export const searchCandidatesQuerySchema = {
  query: z
    .object({
      q: z.string().trim().max(100).optional(),
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(20),
    })
    .strict(),
};
