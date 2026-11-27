import { z } from 'zod';

const emptyToUndefined = (val) =>
  typeof val === 'string' && val.trim() === '' ? undefined : val;

const envSchema = z
  .object({
    NODE_ENV: z.preprocess(
      emptyToUndefined,
      z.enum(['development', 'test', 'production']).default('development')
    ),
    PORT: z.preprocess(
      emptyToUndefined,
      z.coerce.number().int().positive().default(5000)
    ),
    MONGO_URI: z.preprocess(emptyToUndefined, z.string().optional()),
    MONGODB_URI: z.preprocess(emptyToUndefined, z.string().optional()),
    MONGODB_TEST_URI: z.preprocess(emptyToUndefined, z.string().optional()),
    JWT_SECRET: z.preprocess(emptyToUndefined, z.string().optional()),
    JWT_EXPIRES_IN: z.preprocess(emptyToUndefined, z.string().default('8h')),
    CLIENT_URL: z.preprocess(emptyToUndefined, z.string().optional()),
    CORS_ORIGINS: z.preprocess(emptyToUndefined, z.string().optional()),
    USE_MOCK_AI: z.preprocess(
      emptyToUndefined,
      z.enum(['true', 'false']).default('true')
    ),
    OPENROUTER_API_KEY: z.preprocess(emptyToUndefined, z.string().optional()),
    OPENROUTER_MODEL: z.preprocess(
      emptyToUndefined,
      z.string().default('google/gemini-2.5-flash')
    ),
    VERIFY_HMAC_SECRET: z.preprocess(emptyToUndefined, z.string().optional()),
    ALLOW_SELF_REGISTER: z.preprocess(
      emptyToUndefined,
      z.enum(['true', 'false']).default('false')
    ),
    RECONNECT_GRACE_SECONDS: z.preprocess(
      emptyToUndefined,
      z.coerce.number().int().min(0).default(30)
    ),
  })
  .superRefine((data, ctx) => {
    if (!data.MONGO_URI && !data.MONGODB_URI) {
      ctx.addIssue({
        code: 'custom',
        path: ['MONGO_URI'],
        message: 'MONGO_URI (or MONGODB_URI) is required',
      });
    }
    if (!data.JWT_SECRET) {
      ctx.addIssue({
        code: 'custom',
        path: ['JWT_SECRET'],
        message: 'JWT_SECRET is required',
      });
    } else if (data.NODE_ENV === 'production' && data.JWT_SECRET.length < 16) {
      ctx.addIssue({
        code: 'custom',
        path: ['JWT_SECRET'],
        message: 'JWT_SECRET must be at least 16 characters in production',
      });
    }
    if (data.NODE_ENV === 'production' && !data.VERIFY_HMAC_SECRET) {
      ctx.addIssue({
        code: 'custom',
        path: ['VERIFY_HMAC_SECRET'],
        message: 'VERIFY_HMAC_SECRET is required in production',
      });
    }
    if (data.USE_MOCK_AI !== 'true' && !data.OPENROUTER_API_KEY) {
      ctx.addIssue({
        code: 'custom',
        path: ['OPENROUTER_API_KEY'],
        message: 'OPENROUTER_API_KEY is required when USE_MOCK_AI is false',
      });
    }
  });

/**
 * Parses a comma-separated CORS origin string into an array of trimmed origin strings.
 */
export const parseCorsOrigins = (rawOrigins = 'http://localhost:5173') =>
  String(rawOrigins)
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

/**
 * Validates required and optional environment variables using Zod without logging secret values.
 */
export const validateEnv = (rawEnv = process.env) => {
  const result = envSchema.safeParse(rawEnv);
  if (!result.success) {
    const details = result.error.issues.map(
      (issue) => `${issue.path.join('.') || 'env'}: ${issue.message}`
    );
    throw new Error(`Invalid environment configuration (${details.join('; ')})`);
  }

  const data = result.data;
  const mongoUri = data.MONGO_URI || data.MONGODB_URI;
  const clientUrl = data.CLIENT_URL || data.CORS_ORIGINS || 'http://localhost:5173';

  return {
    NODE_ENV: data.NODE_ENV,
    PORT: data.PORT,
    MONGO_URI: mongoUri,
    MONGODB_TEST_URI: data.MONGODB_TEST_URI,
    JWT_SECRET: data.JWT_SECRET,
    JWT_EXPIRES_IN: data.JWT_EXPIRES_IN,
    CLIENT_URL: clientUrl,
    corsOrigins: parseCorsOrigins(clientUrl),
    USE_MOCK_AI: data.USE_MOCK_AI === 'true',
    OPENROUTER_API_KEY: data.OPENROUTER_API_KEY,
    OPENROUTER_MODEL: data.OPENROUTER_MODEL,
    VERIFY_HMAC_SECRET: data.VERIFY_HMAC_SECRET,
    ALLOW_SELF_REGISTER: data.ALLOW_SELF_REGISTER === 'true',
    RECONNECT_GRACE_SECONDS: data.RECONNECT_GRACE_SECONDS,
  };
};
