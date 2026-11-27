import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { suggestGrade, testConnection, clampAndRound } from '../services/ai/providers/mockProvider.js';

describe('AI Mock Provider Module', () => {
  it('clamps and rounds marks to nearest 0.5', () => {
    assert.strictEqual(clampAndRound(-2, 10), 0);
    assert.strictEqual(clampAndRound(15, 10), 10);
    assert.strictEqual(clampAndRound(3.24, 10), 3);
    assert.strictEqual(clampAndRound(3.26, 10), 3.5);
    assert.strictEqual(clampAndRound(3.74, 10), 3.5);
    assert.strictEqual(clampAndRound(3.76, 10), 4);
  });

  it('produces deterministic grading suggestion with zero network calls', async () => {
    const input = {
      questionText: 'What is photosynthesis?',
      rubric: 'chlorophyll sunlight glucose carbon dioxide water',
      maxMarks: 10,
      answerText: 'Photosynthesis uses chlorophyll and sunlight to make glucose from water.',
    };

    const res1 = await suggestGrade(input);
    const res2 = await suggestGrade(input);

    assert.strictEqual(res1.meta.source, 'mock');
    assert.strictEqual(res1.suggestion.suggestedMarks, res2.suggestion.suggestedMarks);
    assert.deepStrictEqual(res1.suggestion.matchedPoints, res2.suggestion.matchedPoints);
    assert.strictEqual(res1.suggestion.suggestedMarks >= 0, true);
    assert.strictEqual(res1.suggestion.suggestedMarks <= 10, true);
    assert.strictEqual(res1.meta.disclaimer, 'Suggestion only. The examiner decides.');
  });

  it('sets high confidence when coverage is high (>=70%)', async () => {
    const res = await suggestGrade({
      questionText: 'Q',
      rubric: 'alpha beta gamma',
      maxMarks: 5,
      answerText: 'alpha beta gamma delta',
    });
    assert.strictEqual(res.suggestion.confidence, 'high');
    assert.strictEqual(res.suggestion.suggestedMarks, 5);
  });

  it('sets low confidence when coverage is low (<40%)', async () => {
    const res = await suggestGrade({
      questionText: 'Q',
      rubric: 'alpha beta gamma delta epsilon zeta',
      maxMarks: 10,
      answerText: 'unrelated topic text',
    });
    assert.strictEqual(res.suggestion.confidence, 'low');
    assert.strictEqual(res.suggestion.suggestedMarks, 0);
  });

  it('testConnection returns ok: true with source: mock', async () => {
    const res = await testConnection();
    assert.strictEqual(res.ok, true);
    assert.strictEqual(res.source, 'mock');
  });
});
