import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { AiError, AI_STATUS_MAP, formatStandardError } from '../services/ai/errors.js';

describe('AI Errors Module', () => {
  it('correctly maps codes to HTTP status codes', () => {
    assert.strictEqual(new AiError('VALIDATION_ERROR', 'invalid').statusCode, 400);
    assert.strictEqual(new AiError('FORBIDDEN', 'forbidden').statusCode, 403);
    assert.strictEqual(new AiError('NOT_FOUND', 'not found').statusCode, 404);
    assert.strictEqual(new AiError('AI_NOT_APPLICABLE', 'n/a').statusCode, 422);
    assert.strictEqual(new AiError('AI_RATE_LIMITED', 'too many').statusCode, 429);
    assert.strictEqual(new AiError('AI_BAD_OUTPUT', 'malformed').statusCode, 502);
    assert.strictEqual(new AiError('AI_UNAVAILABLE', 'down').statusCode, 503);
  });

  it('formats error into standard shape { error: { code, message, fields } }', () => {
    const err = new AiError('AI_NOT_APPLICABLE', 'Add a rubric to use AI suggestions.');
    const formatted = formatStandardError(err);

    assert.strictEqual(formatted.success, false);
    assert.deepStrictEqual(formatted.error, {
      code: 'AI_NOT_APPLICABLE',
      message: 'Add a rubric to use AI suggestions.',
      fields: null,
    });
    assert.strictEqual(formatted.code, 'AI_NOT_APPLICABLE');
  });

  it('includes retryAfterSec for rate-limited errors', () => {
    const err = new AiError('AI_RATE_LIMITED', 'Rate limited', { retryAfterSec: 45 });
    const formatted = formatStandardError(err);

    assert.strictEqual(formatted.retryAfterSec, 45);
    assert.strictEqual(formatted.error.retryAfterSec, 45);
  });
});
