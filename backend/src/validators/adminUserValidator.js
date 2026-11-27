import { z } from 'zod';

const objectIdParam = z
  .object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid user ID'),
  })
  .strict();

const roleEnum = z.enum(['admin', 'examiner', 'candidate']);

export const listUsersQuerySchema = {
  query: z
    .object({
      role: roleEnum.optional(),
      isActive: z.enum(['true', 'false']).optional(),
      q: z.string().trim().max(100).optional(),
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(20),
    })
    .strict(),
};

export const createUserSchema = {
  body: z
    .object({
      name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80),
      email: z.string().trim().email('Valid email is required'),
      password: z.string().min(6, 'Password must be at least 6 characters').max(128),
      role: roleEnum,
      rollNo: z.string().trim().min(1).max(40).optional(),
    })
    .strict(),
};

export const updateUserSchema = {
  params: objectIdParam,
  body: z
    .object({
      name: z.string().trim().min(2).max(80).optional(),
      role: roleEnum.optional(),
      isActive: z.boolean().optional(),
      rollNo: z.string().trim().max(40).nullable().optional(),
    })
    .strict()
    .refine((data) => Object.keys(data).length > 0, {
      message: 'At least one updatable field is required',
    }),
};

export const resetPasswordSchema = {
  params: objectIdParam,
  body: z
    .object({
      newPassword: z.string().min(6, 'New password must be at least 6 characters').max(128),
    })
    .strict(),
};
