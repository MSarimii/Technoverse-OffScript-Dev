import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { getAiConfig, assertLiveKeyAvailable, AI_CONFIG_DEFAULTS } from '../services/ai/config.js';

describe('AI Config Module', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.USE_MOCK_AI;
    delete process.env.OPENROUTER_API_KEY;
    delete process.env.OPENROUTER_MODEL;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('defaults USE_MOCK_AI to true when unset', () => {
    const config = getAiConfig();
    assert.strictEqual(config.isMock, true);
    assert.strictEqual(config.model, AI_CONFIG_DEFAULTS.MODEL);
  });

  it('respects USE_MOCK_AI=false', () => {
    process.env.USE_MOCK_AI = 'false';
    process.env.OPENROUTER_API_KEY = 'sk-or-test';
    const config = getAiConfig();
    assert.strictEqual(config.isMock, false);
    assert.strictEqual(config.apiKey, 'sk-or-test');
  });

  it('throws AI_UNAVAILABLE when USE_MOCK_AI=false and key is missing', () => {
    process.env.USE_MOCK_AI = 'false';
    process.env.OPENROUTER_API_KEY = '';
    assert.throws(
      () => assertLiveKeyAvailable(),
      (err) => err.code === 'AI_UNAVAILABLE'
    );
  });

  it('does not throw when USE_MOCK_AI=true even if key is missing', () => {
    process.env.USE_MOCK_AI = 'true';
    process.env.OPENROUTER_API_KEY = '';
    assert.doesNotThrow(() => assertLiveKeyAvailable());
  });
});
