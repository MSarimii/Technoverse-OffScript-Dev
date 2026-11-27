import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { loadAttemptContext } from '../services/ai/context.js';

describe('AI Context Loader Module', () => {
  const examinerId = '65c0000000000000000ccccc';
  const otherExaminerId = '65d0000000000000000ddddd';
  const qid = '65b0000000000000000bbbbb';
  const attemptId = '65a0000000000000000aaaaa';

  function createMockModel(attemptData) {
    return {
      findById: (id) => ({
        populate: async () => attemptData,
      }),
    };
  }

  it('successfully loads context for owner examiner with written question and rubric', async () => {
    const mockAttempt = {
      _id: attemptId,
      exam: { createdBy: examinerId },
      isSandbox: false,
      snapshot: {
        [qid]: { type: 'written', text: 'Explain photosynthesis', rubric: 'chlorophyll light', marks: 10 },
      },
      answers: {
        [qid]: { value: 'Uses chlorophyll and light' },
      },
    };

    const ctx = await loadAttemptContext(
      { attemptId, questionId: qid, examinerId },
      { AttemptModel: createMockModel(mockAttempt) }
    );

    assert.strictEqual(ctx.questionText, 'Explain photosynthesis');
    assert.strictEqual(ctx.rubric, 'chlorophyll light');
    assert.strictEqual(ctx.maxMarks, 10);
    assert.strictEqual(ctx.answerText, 'Uses chlorophyll and light');
    assert.strictEqual(ctx.isSandbox, false);
  });

  it('rejects with FORBIDDEN (403) when non-owner examiner requests a non-sandbox attempt', async () => {
    const mockAttempt = {
      _id: attemptId,
      exam: { createdBy: examinerId },
      isSandbox: false,
      snapshot: { [qid]: { type: 'written', rubric: 'r', marks: 5 } },
      answers: { [qid]: { value: 'a' } },
    };

    await assert.rejects(
      () =>
        loadAttemptContext(
          { attemptId, questionId: qid, examinerId: otherExaminerId },
          { AttemptModel: createMockModel(mockAttempt) }
        ),
      (err) => err.code === 'FORBIDDEN' && err.statusCode === 403
    );
  });

  it('allows non-owner examiner when attempt isSandbox: true (demo mode)', async () => {
    const mockAttempt = {
      _id: attemptId,
      exam: { createdBy: examinerId },
      isSandbox: true,
      snapshot: { [qid]: { type: 'written', rubric: 'r', marks: 5 } },
      answers: { [qid]: { value: 'a' } },
    };

    const ctx = await loadAttemptContext(
      { attemptId, questionId: qid, examinerId: otherExaminerId },
      { AttemptModel: createMockModel(mockAttempt) }
    );
    assert.strictEqual(ctx.isSandbox, true);
  });

  it('rejects with AI_NOT_APPLICABLE (422) if question is not written', async () => {
    const mockAttempt = {
      _id: attemptId,
      exam: { createdBy: examinerId },
      isSandbox: false,
      snapshot: { [qid]: { type: 'mcq', rubric: 'r', marks: 5 } },
      answers: { [qid]: { value: 'A' } },
    };

    await assert.rejects(
      () =>
        loadAttemptContext(
          { attemptId, questionId: qid, examinerId },
          { AttemptModel: createMockModel(mockAttempt) }
        ),
      (err) => err.code === 'AI_NOT_APPLICABLE' && err.statusCode === 422
    );
  });

  it('rejects with AI_NOT_APPLICABLE (422) if rubric is empty', async () => {
    const mockAttempt = {
      _id: attemptId,
      exam: { createdBy: examinerId },
      isSandbox: false,
      snapshot: { [qid]: { type: 'written', rubric: '   ', marks: 5 } },
      answers: { [qid]: { value: 'a' } },
    };

    await assert.rejects(
      () =>
        loadAttemptContext(
          { attemptId, questionId: qid, examinerId },
          { AttemptModel: createMockModel(mockAttempt) }
        ),
      (err) => err.code === 'AI_NOT_APPLICABLE' && err.message.includes('rubric')
    );
  });

  it('rejects with AI_NOT_APPLICABLE (422) if answer is empty', async () => {
    const mockAttempt = {
      _id: attemptId,
      exam: { createdBy: examinerId },
      isSandbox: false,
      snapshot: { [qid]: { type: 'written', rubric: 'r', marks: 5 } },
      answers: { [qid]: { value: '' } },
    };

    await assert.rejects(
      () =>
        loadAttemptContext(
          { attemptId, questionId: qid, examinerId },
          { AttemptModel: createMockModel(mockAttempt) }
        ),
      (err) => err.code === 'AI_NOT_APPLICABLE' && err.message.includes('answer')
    );
  });
});
