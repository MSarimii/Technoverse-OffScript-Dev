import { z } from 'zod';

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid identifier');

const importPayloadBody = z
  .object({
    format: z.enum(['csv', 'json']),
    content: z.union([z.string(), z.array(z.record(z.string(), z.any()))]),
    dryRun: z.boolean().optional(),
    createMissingCandidates: z.boolean().optional(),
  })
  .strict();

const importQuery = z
  .object({
    dryRun: z.enum(['true', 'false']).optional(),
    createMissingCandidates: z.enum(['true', 'false']).optional(),
  })
  .strict();

export const importQuestionsSchema = {
  body: importPayloadBody,
  query: importQuery,
};

export const importEnrollmentsSchema = {
  params: z.object({ id: objectIdSchema }).strict(),
  body: importPayloadBody,
  query: importQuery,
};
