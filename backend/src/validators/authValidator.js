import { z } from 'zod';

export const loginSchema = {
  body: z
    .object({
      email: z.string().trim().email('Valid email is required'),
      password: z.string().min(1, 'Password is required'),
    })
    .strict(),
};

export const registerSchema = {
  body: z
    .object({
      name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80),
      email: z.string().trim().email('Valid email is required'),
      password: z.string().min(6, 'Password must be at least 6 characters').max(128),
      rollNo: z.string().trim().min(1).max(40).optional(),
    })
    .strict(),
};

export const changePasswordSchema = {
  body: z
    .object({
      currentPassword: z.string().min(1, 'Current password is required'),
      newPassword: z.string().min(6, 'New password must be at least 6 characters').max(128),
    })
    .strict(),
};
