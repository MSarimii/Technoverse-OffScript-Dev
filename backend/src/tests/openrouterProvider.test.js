import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { suggestGrade, testConnection, cleanJsonFences } from '../services/ai/providers/openrouterProvider.js';

describe('AI OpenRouter Provider Module', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.USE_MOCK_AI = 'false';
    process.env.OPENROUTER_API_KEY = 'sk-or-test-mocked';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('cleanJsonFences strips markdown code blocks', () => {
    const raw = '```json\n{"a":1}\n```';
    assert.strictEqual(cleanJsonFences(raw), '{"a":1}');
  });

  it('processes valid AI response and clamps marks', async () => {
    const mockPayload = {
      suggestedMarks: 8.7, // should round to 8.5
      matchedPoints: ['Point 1'],
      missingPoints: ['Point 2'],
      rationale: 'Solid explanation.',
      confidence: 'medium',
    };

    const mockFetch = async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [{ message: { content: JSON.stringify(mockPayload) } }],
      }),
    });

    const res = await suggestGrade(
      {
        questionText: 'Explain X',
        rubric: 'X concepts',
        maxMarks: 10,
        answerText: 'X is ...',
      },
      mockFetch
    );

    assert.strictEqual(res.meta.source, 'openrouter');
    assert.strictEqual(res.suggestion.suggestedMarks, 8.5);
    assert.strictEqual(res.suggestion.confidence, 'medium');
  });

  it('retries once on malformed JSON then throws AI_BAD_OUTPUT', async () => {
    let callCount = 0;
    const mockFetch = async () => {
      callCount++;
      return {
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{ message: { content: 'not valid json' } }],
        }),
      };
    };

    await assert.rejects(
      () =>
        suggestGrade(
          {
            questionText: 'Explain X',
            rubric: 'X',
            maxMarks: 5,
            answerText: 'Y',
          },
          mockFetch
        ),
      (err) => err.code === 'AI_BAD_OUTPUT'
    );

    // Initial call + exactly 1 repair attempt
    assert.strictEqual(callCount, 2);
  });

  it('throws AI_RATE_LIMITED with retryAfterSec when 429 exceeds 3s budget', async () => {
    const mockFetch = async () => ({
      ok: false,
      status: 429,
      headers: { get: (name) => (name === 'Retry-After' ? '30' : null) },
      json: async () => ({ error: 'rate limited' }),
    });

    await assert.rejects(
      () =>
        suggestGrade(
          { questionText: 'Q', rubric: 'R', maxMarks: 5, answerText: 'A' },
          mockFetch
        ),
      (err) => err.code === 'AI_RATE_LIMITED' && err.retryAfterSec === 30
    );
  });

  it('maps AbortError / timeout to AI_UNAVAILABLE', async () => {
    const mockFetch = async () => {
      const err = new Error('The operation was aborted');
      err.name = 'AbortError';
      throw err;
    };

    await assert.rejects(
      () => testConnection(mockFetch),
      (err) => err.code === 'AI_UNAVAILABLE'
    );
  });
});
