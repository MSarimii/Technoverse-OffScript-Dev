/**
 * Validates critical environment variables at startup.
 * Halts server boot if required secrets are absent.
 */
export const validateEnv = () => {
  const required = ['JWT_SECRET'];
  const missing = [];

  for (const key of required) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    console.error(`[FATAL] Missing required environment variables: ${missing.join(', ')}`);
    console.error('Please configure them in your .env file before starting the server.');
    process.exit(1);
  }
};
