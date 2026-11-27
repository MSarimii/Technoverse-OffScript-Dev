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

  it('supports production Attempt/Exam/Question array schema (examId, paper[], answers[], Question.rubric)', async () => {
    const examId = '65e0000000000000000eeeee';
    const liveAttempt = {
      _id: attemptId,
      examId,
      isSandbox: false,
      paper: [{ questionId: qid, type: 'written', text: 'Explain memoization', marks: 5 }],
      answers: [{ questionId: qid, text: 'Caches overlapping subproblems for O(n).' }],
    };
    const MockAttempt = { findById: async () => liveAttempt };
    const MockExam = { findById: async () => ({ _id: examId, createdBy: examinerId }) };
    const MockQuestion = { findById: async () => ({ _id: qid, rubric: 'overlapping subproblems O(n)' }) };

    const ctx = await loadAttemptContext(
      { attemptId, questionId: qid, examinerId },
      { AttemptModel: MockAttempt, ExamModel: MockExam, QuestionModel: MockQuestion }
    );

    assert.strictEqual(ctx.questionText, 'Explain memoization');
    assert.strictEqual(ctx.rubric, 'overlapping subproblems O(n)');
    assert.strictEqual(ctx.maxMarks, 5);
    assert.strictEqual(ctx.answerText, 'Caches overlapping subproblems for O(n).');
  });

  it('allows admin caller across another examiner exam when UserModel resolves admin role', async () => {
    const examId = '65e0000000000000000eeeee';
    const adminId = '65f0000000000000000fffff';
    const liveAttempt = {
      _id: attemptId,
      examId,
      isSandbox: false,
      paper: [{ questionId: qid, type: 'written', text: 'Explain memoization', marks: 5 }],
      answers: [{ questionId: qid, text: 'Caching subproblems.' }],
    };
    const MockAttempt = { findById: async () => liveAttempt };
    const MockExam = { findById: async () => ({ _id: examId, createdBy: examinerId }) };
    const MockQuestion = { findById: async () => ({ _id: qid, rubric: 'caching' }) };
    const MockUser = { findById: async () => ({ _id: adminId, role: 'admin' }) };

    const ctx = await loadAttemptContext(
      { attemptId, questionId: qid, examinerId: adminId },
      { AttemptModel: MockAttempt, ExamModel: MockExam, QuestionModel: MockQuestion, UserModel: MockUser }
    );

    assert.strictEqual(ctx.rubric, 'caching');
  });
});
