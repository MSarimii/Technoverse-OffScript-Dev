/**
 * Validates critical environment variables at startup.
 * Halts server boot if required secrets are absent.
 */
export const validateEnv = () => {
  const required = ['JWT_SECRET'];
  
  if (process.env.USE_MOCK_AI !== 'true') {
    required.push('OPENROUTER_API_KEY');
  }

  const missing = [];

  for (const key of required) {
    if (!process.env[key] || process.env[key].trim() === '') {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    console.error(`[FATAL] Missing required environment variables: ${missing.join(', ')}`);
    if (missing.includes('OPENROUTER_API_KEY')) {
      console.error('Note: Set OPENROUTER_API_KEY in backend/.env, or set USE_MOCK_AI=true to enable offline mock mode.');
    }
    console.error('Please configure them in your .env file before starting the server.');
    process.exit(1);
  }
};
