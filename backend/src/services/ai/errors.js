/**
 * errors.js — Centralized AI Error Handling and Standardization
 * Maps internal AI error codes to HTTP status codes and standard API error shape.
 */

export const AI_STATUS_MAP = Object.freeze({
  VALIDATION_ERROR: 400,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  AI_NOT_APPLICABLE: 422,
  AI_RATE_LIMITED: 429,
  AI_BAD_OUTPUT: 502,
  AI_UNAVAILABLE: 503,
});

export class AiError extends Error {
  /**
   * @param {keyof typeof AI_STATUS_MAP | string} code
   * @param {string} message
   * @param {Object} [meta={}]
   * @param {number} [meta.retryAfterSec]
   * @param {any} [meta.fields]
   */
  constructor(code, message, meta = {}) {
    super(message);
    this.name = 'AiError';
    this.code = code;
    this.statusCode = AI_STATUS_MAP[code] || 500;
    this.retryAfterSec = meta.retryAfterSec ?? null;
    this.fields = meta.fields ?? null;
  }
}

/**
 * Formats an error into the project's standard error shape.
 * { error: { code, message, fields } } plus top-level compatibility fields.
 *
 * @param {Error|AiError|any} err
 * @returns {Object} Standard API error payload
 */
export function formatStandardError(err) {
  const code = err?.code || (err?.statusCode === 429 ? 'AI_RATE_LIMITED' : 'SERVER_ERROR');
  const message = err?.message || 'An unexpected error occurred.';
  const fields = err?.fields ?? null;

  const payload = {
    success: false,
    error: {
      code,
      message,
      fields,
    },
    // Top-level mirrors for client convenience
    code,
    message,
  };

  if (err?.retryAfterSec != null) {
    payload.retryAfterSec = err.retryAfterSec;
    payload.error.retryAfterSec = err.retryAfterSec;
  }

  return payload;
}
