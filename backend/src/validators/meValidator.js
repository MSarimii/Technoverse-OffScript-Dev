import { z } from 'zod';

export const updatePreferencesSchema = {
  body: z
    .object({
      theme: z.enum(['light', 'dark', 'system']).optional(),
      fontScale: z.enum(['sm', 'md', 'lg']).optional(),
      layout: z.enum(['standard', 'compact', 'split']).optional(),
      showTimer: z.boolean().optional(),
      highContrast: z.boolean().optional(),
    })
    .strict(),
};
