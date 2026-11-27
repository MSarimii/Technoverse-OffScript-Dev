/**
 * context.js — Attempt Paper/Snapshot Context Loader & Authorization
 * The ONLY file in the AI module that accesses Attempt / Question / Exam / User models.
 * Validates examiner/admin ownership, sandbox permission, and question preconditions.
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

async function resolveFindById(Model, id, selectFields) {
  const queryOrResult = Model.findById(id);
  if (!queryOrResult) return null;
  if (typeof queryOrResult.exec === 'function') {
    const q = selectFields && typeof queryOrResult.select === 'function' ? queryOrResult.select(selectFields) : queryOrResult;
    return typeof q.lean === 'function' ? q.lean() : q.exec();
  }
  if (typeof queryOrResult.populate === 'function') {
    return queryOrResult.populate('exam');
  }
  return queryOrResult;
}

/**
 * Loads and validates attempt context for AI grading.
 * Supports both production SEMS schema (`examId`, `paper[]`, `answers[]`, `Question.rubric`)
 * and unit-test mock snapshot Map/Object fixtures.
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
    attempt = await resolveFindById(AttemptModel, attemptId);
  } catch {
    throw new AiError('NOT_FOUND', 'Attempt not found');
  }

  if (!attempt) {
    throw new AiError('NOT_FOUND', 'Attempt not found');
  }

  let exam = attempt.exam;
  if (!exam && attempt.examId) {
    const ExamModel = deps.ExamModel || (await getMongooseModel('Exam'));
    if (ExamModel) {
      exam = await resolveFindById(ExamModel, attempt.examId, 'createdBy');
    }
  }
  if (!exam) {
    throw new AiError('NOT_FOUND', 'Associated exam not found for this attempt');
  }

  // 1. Authorization: owning examiner, admin user, or sandbox attempt
  const isOwner = Boolean(exam.createdBy && examinerId && exam.createdBy.toString() === examinerId.toString());
  const isSandbox = attempt.isSandbox === true;
  let isAdmin = false;

  if (!isOwner && !isSandbox && examinerId) {
    const UserModel = deps.UserModel || (await getMongooseModel('User'));
    if (UserModel) {
      const caller = await resolveFindById(UserModel, examinerId, 'role');
      isAdmin = caller?.role === 'admin';
    }
  }

  if (!isOwner && !isAdmin && !isSandbox) {
    throw new AiError('FORBIDDEN', 'You are not authorized to view AI suggestions for this attempt');
  }

  // 2. Question lookup (`attempt.paper[]` in live SEMS, fallback to `attempt.snapshot` in mocks)
  const qidStr = String(questionId);
  const paperQ = Array.isArray(attempt.paper)
    ? attempt.paper.find((item) => String(item.questionId ?? item._id) === qidStr)
    : null;
  const snapshotQ =
    paperQ ||
    (attempt.snapshot?.get ? attempt.snapshot.get(questionId) : attempt.snapshot?.[questionId]);

  if (!snapshotQ) {
    throw new AiError('NOT_FOUND', `Question ${questionId} not found in this attempt's snapshot`);
  }

  // 3. Precondition: Question must be of type 'written'
  if (snapshotQ.type !== 'written') {
    throw new AiError('AI_NOT_APPLICABLE', 'AI grading suggestions are only available for written questions');
  }

  // 4. Precondition: Non-empty rubric (stored on Question doc in live SEMS, or inline on mock snapshot)
  let rubric = String(snapshotQ.rubric || '').trim();
  if (!rubric) {
    const QuestionModel = deps.QuestionModel || (await getMongooseModel('Question'));
    if (QuestionModel) {
      const questionDoc = await resolveFindById(QuestionModel, questionId, 'rubric');
      rubric = String(questionDoc?.rubric || '').trim();
    }
  }
  if (!rubric) {
    throw new AiError('AI_NOT_APPLICABLE', 'Add a rubric to use AI suggestions. No rubric was set for this question');
  }

  // 5. Precondition: Candidate answer must be non-empty (`answers[]` in live SEMS, fallback to map/object)
  const answerEntry = Array.isArray(attempt.answers)
    ? attempt.answers.find((ans) => String(ans.questionId) === qidStr)
    : attempt.answers?.get
    ? attempt.answers.get(questionId)
    : attempt.answers?.[questionId];
  const answerText = String(answerEntry?.text ?? answerEntry?.value ?? '').trim();

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
