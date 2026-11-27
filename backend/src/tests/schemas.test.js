import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  gradeSuggestionSchema,
  suggestGradeRequestSchema,
  suggestQuestionsRequestSchema,
  testPromptSchema,
} from '../services/ai/schemas.js';

describe('AI Schemas Module', () => {
  it('validates a valid grade suggestion', () => {
    const valid = {
      suggestedMarks: 4.5,
      matchedPoints: ['Point A'],
      missingPoints: ['Point B'],
      rationale: 'Solid attempt.',
      confidence: 'high',
    };
    const result = gradeSuggestionSchema.safeParse(valid);
    assert.strictEqual(result.success, true);
  });

  it('rejects grade suggestion with invalid confidence', () => {
    const invalid = {
      suggestedMarks: 4.5,
      matchedPoints: [],
      missingPoints: [],
      rationale: 'OK',
      confidence: 'MAXIMUM', // invalid enum
    };
    const result = gradeSuggestionSchema.safeParse(invalid);
    assert.strictEqual(result.success, false);
  });

  it('rejects grade suggestion with rationale over 400 chars', () => {
    const invalid = {
      suggestedMarks: 2,
      matchedPoints: [],
      missingPoints: [],
      rationale: 'a'.repeat(401),
      confidence: 'low',
    };
    const result = gradeSuggestionSchema.safeParse(invalid);
    assert.strictEqual(result.success, false);
  });

  it('strictly rejects request body with extra fields (tampering protection)', () => {
    const payloadWithInjected = {
      attemptId: '65a000000000000000aaaaaa',
      questionId: '65b000000000000000bbbbbb',
      answer: 'injected answer text',
      maxMarks: 100,
    };
    const result = suggestGradeRequestSchema.safeParse(payloadWithInjected);
    assert.strictEqual(result.success, false);
  });

  it('accepts strictly valid request body (IDs only)', () => {
    const valid = {
      attemptId: '65a000000000000000aaaaaa',
      questionId: '65b000000000000000bbbbbb',
    };
    const result = suggestGradeRequestSchema.safeParse(valid);
    assert.strictEqual(result.success, true);
  });

  it('validates testPromptSchema rejects empty prompt', () => {
    assert.strictEqual(testPromptSchema.safeParse({ prompt: '' }).success, false);
    assert.strictEqual(testPromptSchema.safeParse({ prompt: 'Hello' }).success, true);
  });
});
