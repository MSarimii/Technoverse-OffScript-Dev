/**
 * config.js — Centralized AI Module Configuration
 * Validates and exposes AI environment settings with safe defaults.
 */

export const AI_CONFIG_DEFAULTS = Object.freeze({
  MODEL: 'google/gemini-2.5-flash',
  SITE_URL: 'http://localhost:5173',
  SITE_NAME: 'TechnoVerse-SEMS',
  ENDPOINT: 'https://openrouter.ai/api/v1/chat/completions',
  TIMEOUT_MS: 15_000,
  MAX_TOKENS: 512,
  MAX_ANSWER_CHARS: 4_000,
  CACHE_MAX: 200,
  CACHE_TTL_MS: 30 * 60 * 1_000, // 30 minutes
});

/**
 * Returns the current validated AI configuration.
 * Evaluated at call time to support dynamic runtime or test env changes.
 */
export function getAiConfig() {
  const isMock = process.env.USE_MOCK_AI !== 'false'; // default: true
  const apiKey = (process.env.OPENROUTER_API_KEY || '').trim();
  const model = (process.env.OPENROUTER_MODEL || '').trim() || AI_CONFIG_DEFAULTS.MODEL;
  const siteUrl = (process.env.OPENROUTER_SITE_URL || '').trim() || AI_CONFIG_DEFAULTS.SITE_URL;
  const siteName = (process.env.OPENROUTER_SITE_NAME || '').trim() || AI_CONFIG_DEFAULTS.SITE_NAME;

  return {
    isMock,
    apiKey,
    model,
    siteUrl,
    siteName,
    endpoint: AI_CONFIG_DEFAULTS.ENDPOINT,
    timeoutMs: AI_CONFIG_DEFAULTS.TIMEOUT_MS,
    maxTokens: AI_CONFIG_DEFAULTS.MAX_TOKENS,
    maxAnswerChars: AI_CONFIG_DEFAULTS.MAX_ANSWER_CHARS,
    cacheMax: AI_CONFIG_DEFAULTS.CACHE_MAX,
    cacheTtlMs: AI_CONFIG_DEFAULTS.CACHE_TTL_MS,
  };
}

/**
 * Validates that live mode has an API key configured.
 * @throws {Error} if USE_MOCK_AI is false but key is missing.
 */
export function assertLiveKeyAvailable() {
  const config = getAiConfig();
  if (!config.isMock && !config.apiKey) {
    const error = new Error('AI is not available: USE_MOCK_AI is false but OPENROUTER_API_KEY is not set');
    error.code = 'AI_UNAVAILABLE';
    throw error;
  }
}
