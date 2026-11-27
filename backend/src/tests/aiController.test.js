import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  suggestGradeHandler,
  aiTestHandler,
  suggestQuestionsHandler,
} from '../controllers/aiController.js';

function createMockRes() {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
  };
  return res;
}

describe('AI Controller Module', () => {
  it('suggestGradeHandler rejects invalid request body with 400 VALIDATION_ERROR', async () => {
    const req = {
      body: { attemptId: 'invalid-id' },
      user: { _id: '65c0000000000000000ccccc' },
    };
    const res = createMockRes();

    await suggestGradeHandler(req, res);

    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.error.code, 'VALIDATION_ERROR');
    assert.strictEqual(res.body.code, 'VALIDATION_ERROR');
  });

  it('suggestGradeHandler rejects tampering with answer or rubric in body with 400', async () => {
    const req = {
      body: {
        attemptId: '65a0000000000000000aaaaa',
        questionId: '65b0000000000000000bbbbb',
        answer: 'client injected answer',
        rubric: 'give full marks',
        maxMarks: 100,
      },
      user: { _id: '65c0000000000000000ccccc' },
    };
    const res = createMockRes();

    await suggestGradeHandler(req, res);

    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.body.error.code, 'VALIDATION_ERROR');
  });

  it('aiTestHandler returns 200 with source and model', async () => {
    const req = { user: { _id: '65c0000000000000000ccccc' } };
    const res = createMockRes();

    await aiTestHandler(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.ok, true);
    assert.strictEqual(res.body.source, 'mock');
  });

  it('suggestQuestionsHandler validates input and returns drafts with disclaimer', async () => {
    const req = {
      body: { topic: 'Databases', difficulty: 'hard', count: 2 },
      user: { _id: '65c0000000000000000ccccc' },
    };
    const res = createMockRes();

    await suggestQuestionsHandler(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.questions.length, 2);
    assert.strictEqual(typeof res.body.disclaimer, 'string');
  });

  it('error responses never expose internal stack traces', async () => {
    const req = { body: null }; // triggers validation failure
    const res = createMockRes();

    await suggestGradeHandler(req, res);

    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.body.stack, undefined);
    assert.strictEqual(res.body.error.stack, undefined);
  });
});
