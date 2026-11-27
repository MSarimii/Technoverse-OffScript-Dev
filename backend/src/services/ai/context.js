/**
 * context.js — Attempt Snapshot Context Loader & Authorization
 * The ONLY file in the AI module that accesses Attempt / Question / Exam models.
 * Validates examiner ownership, sandbox permission, and question preconditions.
 */

import { AiError } from './errors.js';

/**
 * Safely resolves a Mongoose model dynamically.
 * Tolerates environments where mongoose is not yet loaded/installed.
 * @param {string} name
 * @returns {Promise<any>} Mongoose model or null
 */
async function getMongooseModel(name) {
  try {
    const mod = await import('mongoose');
    const m = mod.default || mod;
    if (m.models && m.models[name]) return m.models[name];
    return m.model(name);
  } catch {
    return null;
  }
}

/**
 * Loads and validates attempt snapshot context for AI grading.
 * Enforces:
 *  - Examiner ownership (or sandbox exception)
 *  - Snapshot question existence
 *  - Written question type
 *  - Non-empty rubric
 *  - Non-empty candidate answer
 *
 * @param {Object} params
 * @param {string} params.attemptId
 * @param {string} params.questionId
 * @param {string} params.examinerId
 * @param {Object} [deps] Injectable models for unit testing
 * @returns {Promise<Object>} Validated context for aiService
 */
export async function loadAttemptContext({ attemptId, questionId, examinerId }, deps = {}) {
  const AttemptModel = deps.AttemptModel || (await getMongooseModel('Attempt'));
  if (!AttemptModel) {
    throw new AiError('AI_UNAVAILABLE', 'Attempt database model is not initialized.');
  }

  let attempt;
  try {
    attempt = await AttemptModel.findById(attemptId).populate('exam');
  } catch {
    throw new AiError('NOT_FOUND', 'Attempt not found');
  }

  if (!attempt) {
    throw new AiError('NOT_FOUND', 'Attempt not found');
  }

  const exam = attempt.exam;
  if (!exam) {
    throw new AiError('NOT_FOUND', 'Associated exam not found for this attempt');
  }

  // 1. Authorization: examiner must own the exam, unless it is a sandbox attempt
  const isOwner = exam.createdBy && examinerId && exam.createdBy.toString() === examinerId.toString();
  const isSandbox = attempt.isSandbox === true;

  if (!isOwner && !isSandbox) {
    throw new AiError('FORBIDDEN', 'You are not authorized to view AI suggestions for this attempt');
  }

  // 2. Question Snapshot lookup (immutable data captured at submission)
  const snapshotQ = attempt.snapshot?.get
    ? attempt.snapshot.get(questionId)
    : attempt.snapshot?.[questionId];

  if (!snapshotQ) {
    throw new AiError('NOT_FOUND', `Question ${questionId} not found in this attempt's snapshot`);
  }

  // 3. Precondition: Question must be of type 'written'
  if (snapshotQ.type !== 'written') {
    throw new AiError('AI_NOT_APPLICABLE', 'AI grading suggestions are only available for written questions');
  }

  // 4. Precondition: Rubric must be non-empty
  const rubric = String(snapshotQ.rubric || '').trim();
  if (!rubric) {
    throw new AiError('AI_NOT_APPLICABLE', 'Add a rubric to use AI suggestions. No rubric was set for this question');
  }

  // 5. Precondition: Candidate answer must be non-empty
  const answerEntry = attempt.answers?.get
    ? attempt.answers.get(questionId)
    : attempt.answers?.[questionId];
  const answerText = String(answerEntry?.value || '').trim();

  if (!answerText) {
    throw new AiError('AI_NOT_APPLICABLE', 'The candidate has not provided an answer for this question');
  }

  return {
    attemptId,
    questionId,
    cacheId: `${attemptId}:${questionId}:${rubric}`,
    questionText: snapshotQ.text || '',
    rubric,
    maxMarks: Number(snapshotQ.marks) || 0,
    answerText,
    isSandbox,
  };
}
