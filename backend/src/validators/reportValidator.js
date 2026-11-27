import { z } from 'zod';

export const verifyCodeParamSchema = {
  params: z
    .object({
      code: z.string().trim().min(1, 'Verification code is required').max(128),
    })
    .strict(),
};
