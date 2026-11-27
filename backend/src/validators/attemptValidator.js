import { z } from 'zod';

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid identifier');

export const examIdParamSchema = {
  params: z.object({ id: objectIdSchema }).strict(),
};

export const attemptIdParamSchema = {
  params: z.object({ id: objectIdSchema }).strict(),
};

const emptyStrictBodySchema = z.preprocess(
  (val) => (val === undefined ? {} : val),
  z.object({}).strict()
);

export const startAttemptSchema = {
  params: examIdParamSchema.params,
  body: emptyStrictBodySchema,
};

export const submitAttemptSchema = {
  params: attemptIdParamSchema.params,
  body: emptyStrictBodySchema,
};

export const autosaveAnswersSchema = {
  params: attemptIdParamSchema.params,
  body: z
    .object({
      answers: z
        .array(
          z
            .object({
              questionId: objectIdSchema,
              selectedOptionIds: z.array(objectIdSchema).optional(),
              text: z.string().max(20000).optional(),
              markedForReview: z.boolean().optional(),
              seq: z.number().int().min(0),
            })
            .strict()
        )
        .min(1, 'At least one answer entry is required'),
      offlineBuffered: z.boolean().optional(),
      clientSavedAt: z.coerce.date().optional(),
    })
    .strict(),
};

export const scratchpadSchema = {
  params: attemptIdParamSchema.params,
  body: z
    .object({
      text: z.string().max(10000, 'Scratchpad cannot exceed 10000 characters'),
    })
    .strict(),
};

export const heartbeatSchema = {
  params: attemptIdParamSchema.params,
  body: z.preprocess(
    (val) => (val === undefined ? {} : val),
    z
      .object({
        clientSeq: z.number().int().min(0).optional(),
        since: z.coerce.date().optional(),
      })
      .strict()
  ),
};

export const incidentEventSchema = {
  params: attemptIdParamSchema.params,
  body: z
    .object({
      type: z.enum([
        'tab_hidden',
        'window_blur',
        'fullscreen_exit',
        'copy_paste',
        'reconnect',
        'multiple_sessions',
        'other',
      ]),
      details: z.string().trim().max(500).optional(),
    })
    .strict(),
};
