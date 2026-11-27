import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  suggestGradeForAttempt,
  testConnection,
  getActiveProvider,
  generateStructured,
} from '../services/aiService.js';
import { LRUCache } from '../services/ai/cache.js';

describe('aiService Facade Module', () => {
  const originalEnv = { ...process.env };
  const examinerId = '65c0000000000000000ccccc';
  const qid = '65b0000000000000000bbbbb';
  const attemptId = '65a0000000000000000aaaaa';

  function createMockModel(attemptData) {
    return {
      findById: () => ({
        populate: async () => attemptData,
      }),
    };
  }

  const validAttempt = {
    _id: attemptId,
    exam: { createdBy: examinerId },
    isSandbox: false,
    snapshot: {
      [qid]: { type: 'written', text: 'Explain HTTP', rubric: 'hypertext transfer protocol', marks: 5 },
    },
    answers: {
      [qid]: { value: 'Hypertext Transfer Protocol' },
    },
  };

  beforeEach(() => {
    process.env.USE_MOCK_AI = 'true';
    delete process.env.OPENROUTER_API_KEY;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('selects mock provider when USE_MOCK_AI is true', () => {
    const provider = getActiveProvider();
    assert.strictEqual(typeof provider.suggestGrade, 'function');
  });

  it('suggestGradeForAttempt returns mock suggestion with disclaimer', async () => {
    const customCache = new LRUCache();
    const res = await suggestGradeForAttempt(
      { attemptId, questionId: qid, examinerId },
      { AttemptModel: createMockModel(validAttempt), cache: customCache }
    );

    assert.strictEqual(res.meta.source, 'mock');
    assert.strictEqual(res.meta.disclaimer, 'Suggestion only. The examiner decides.');
    assert.strictEqual(res.meta.cached, false);
    assert.strictEqual(res.suggestion.suggestedMarks >= 0, true);
  });

  it('returns cached suggestion on subsequent identical requests', async () => {
    const customCache = new LRUCache();
    const deps = { AttemptModel: createMockModel(validAttempt), cache: customCache };

    const res1 = await suggestGradeForAttempt({ attemptId, questionId: qid, examinerId }, deps);
    assert.strictEqual(res1.meta.cached, false);

    const res2 = await suggestGradeForAttempt({ attemptId, questionId: qid, examinerId }, deps);
    assert.strictEqual(res2.meta.cached, true);
    assert.strictEqual(res1.suggestion.suggestedMarks, res2.suggestion.suggestedMarks);
  });

  it('testConnection returns health status', async () => {
    const res = await testConnection();
    assert.strictEqual(res.ok, true);
    assert.strictEqual(res.source, 'mock');
  });
});
