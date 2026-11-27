import { z } from 'zod';

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid identifier');

const incidentTypeEnum = z.enum([
  'tab_hidden',
  'window_blur',
  'fullscreen_exit',
  'copy_paste',
  'reconnect',
  'multiple_sessions',
  'other',
]);

export const listIncidentsQuerySchema = {
  params: z.object({ id: objectIdSchema }).strict(),
  query: z
    .object({
      type: incidentTypeEnum.optional(),
      reviewStatus: z.enum(['new', 'reviewed', 'dismissed']).optional(),
      userId: objectIdSchema.optional(),
    })
    .strict(),
};

export const reviewIncidentSchema = {
  params: z.object({ id: objectIdSchema }).strict(),
  body: z
    .object({
      reviewStatus: z.enum(['new', 'reviewed', 'dismissed']),
      reviewerNote: z.string().trim().max(500).optional(),
    })
    .strict(),
};

export const createAnnouncementSchema = {
  params: z.object({ id: objectIdSchema }).strict(),
  body: z
    .object({
      message: z
        .string()
        .trim()
        .min(1, 'Announcement message cannot be empty')
        .max(500, 'Announcement message cannot exceed 500 characters'),
    })
    .strict(),
};
