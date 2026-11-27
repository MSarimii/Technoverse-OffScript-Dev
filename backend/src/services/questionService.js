import mongoose from 'mongoose';
import Question, { serializeQuestion } from '../models/Question.js';
import { ApiError } from '../utils/ApiError.js';
import { escapeRegex } from '../utils/sanitize.js';
import { validateQuestionConsistency } from '../validators/questionValidator.js';

const assertQuestionAccess = (question, user) => {
  if (!question) {
    throw new ApiError(404, 'NOT_FOUND', 'Question not found');
  }
  if (user.role !== 'admin' && !question.createdBy.equals(user._id)) {
    throw new ApiError(403, 'FORBIDDEN', 'You do not have permission to access this question');
  }
};

export const buildOptionSubdocs = (options = [], correctOptionIndexes = []) => {
  const optionDocs = options.map((opt) => ({
    _id: new mongoose.Types.ObjectId(),
    text: opt.text,
  }));
  const correctOptionIds = correctOptionIndexes.map((idx) => optionDocs[idx]._id);
  return { optionDocs, correctOptionIds };
};

/**
 * Lists questions scoped by ownership (examiner sees own, admin sees all) with filtering and pagination.
 */
export const listQuestions = async ({ user, query }) => {
  const { topic, difficulty, type, includeArchived, q, page = 1, limit = 20 } = query;
  const filter = {};

  if (user.role !== 'admin') {
    filter.createdBy = user._id;
  }
  if (includeArchived !== 'true') {
    filter.isArchived = false;
  }
  if (topic) filter.topic = topic;
  if (difficulty) filter.difficulty = difficulty;
  if (type) filter.type = type;
  if (q && q.trim() !== '') {
    const regex = new RegExp(escapeRegex(q.trim()), 'i');
    filter.$or = [{ text: regex }, { topic: regex }];
  }

  const skip = (page - 1) * limit;
  const [docs, total] = await Promise.all([
    Question.find(filter)
      .select('+correctOptionIds')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Question.countDocuments(filter),
  ]);

  return {
    questions: docs.map(serializeQuestion),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
};

/**
 * Creates a question in the question bank with freshly generated option ObjectIds.
 */
export const createQuestion = async ({ user, payload }) => {
  const { optionDocs, correctOptionIds } = buildOptionSubdocs(
    payload.options ?? [],
    payload.correctOptionIndexes ?? []
  );

  const question = await Question.create({
    createdBy: user._id,
    type: payload.type,
    text: payload.text,
    options: optionDocs,
    correctOptionIds,
    topic: payload.topic,
    difficulty: payload.difficulty,
    marks: payload.marks,
    scheme: payload.scheme ?? { mode: 'all_or_nothing', negativeMarks: 0 },
    rubric: payload.rubric ?? '',
    explanation: payload.explanation ?? '',
  });

  return { question: serializeQuestion(question) };
};

/**
 * Loads a single question with answer keys after checking ownership/admin role.
 */
export const getQuestionById = async ({ user, questionId }) => {
  const question = await Question.findById(questionId).select('+correctOptionIds');
  assertQuestionAccess(question, user);
  return { question: serializeQuestion(question) };
};

/**
 * Updates a question while re-validating combined (type, options, correctOptionIndexes) consistency.
 */
export const updateQuestion = async ({ user, questionId, payload }) => {
  const question = await Question.findById(questionId).select('+correctOptionIds');
  assertQuestionAccess(question, user);

  const nextType = payload.type ?? question.type;
  let nextOptions = question.options;
  let nextIndexes;

  if (payload.options !== undefined) {
    nextOptions = payload.options.map((opt) => ({
      _id: new mongoose.Types.ObjectId(),
      text: opt.text,
    }));
    nextIndexes = payload.correctOptionIndexes ?? [];
  } else if (payload.correctOptionIndexes !== undefined) {
    nextIndexes = payload.correctOptionIndexes;
  } else {
    const idToIndex = new Map(
      question.options.map((opt, idx) => [String(opt._id), idx])
    );
    nextIndexes = (question.correctOptionIds || [])
      .map((id) => idToIndex.get(String(id)))
      .filter((idx) => idx !== undefined);
  }

  const issues = validateQuestionConsistency({
    type: nextType,
    options: nextOptions,
    correctOptionIndexes: nextIndexes,
  });
  if (issues.length > 0) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Validation failed', issues);
  }

  question.type = nextType;
  question.options = nextOptions;
  question.correctOptionIds = nextIndexes.map((idx) => nextOptions[idx]._id);

  if (payload.text !== undefined) question.text = payload.text;
  if (payload.topic !== undefined) question.topic = payload.topic;
  if (payload.difficulty !== undefined) question.difficulty = payload.difficulty;
  if (payload.marks !== undefined) question.marks = payload.marks;
  if (payload.rubric !== undefined) question.rubric = payload.rubric;
  if (payload.explanation !== undefined) question.explanation = payload.explanation;
  if (payload.isArchived !== undefined) question.isArchived = payload.isArchived;
  if (payload.scheme !== undefined) {
    question.scheme = {
      mode: payload.scheme.mode ?? question.scheme?.mode ?? 'all_or_nothing',
      negativeMarks: payload.scheme.negativeMarks ?? question.scheme?.negativeMarks ?? 0,
    };
  }

  await question.save();
  return { question: serializeQuestion(question) };
};

/**
 * Soft-archives a question (isArchived=true) after checking ownership.
 */
export const archiveQuestion = async ({ user, questionId }) => {
  const question = await Question.findById(questionId).select('+correctOptionIds');
  assertQuestionAccess(question, user);

  question.isArchived = true;
  await question.save();

  return { question: serializeQuestion(question) };
};

/**
 * Returns sorted distinct active topics scoped to the caller (or all for admin).
 */
export const listTopics = async ({ user }) => {
  const filter = { isArchived: false };
  if (user.role !== 'admin') {
    filter.createdBy = user._id;
  }

  const rawTopics = await Question.distinct('topic', filter);
  const topics = rawTopics
    .filter((t) => typeof t === 'string' && t.trim() !== '')
    .sort((a, b) => a.localeCompare(b));

  return { topics };
};
