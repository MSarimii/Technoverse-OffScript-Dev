import Attempt from '../models/Attempt.js';
import Enrollment from '../models/Enrollment.js';
import Exam, { serializeExam } from '../models/Exam.js';
import Question from '../models/Question.js';
import { ApiError } from '../utils/ApiError.js';
import { resolveExamStatus } from '../utils/examStatus.js';
import { now } from '../utils/time.js';
import { autoGradeAttempt } from './autoGrader.js';

/**
 * Verifies that an exam exists and the requesting examiner owns it (admins bypass ownership).
 */
export const assertExamAccess = (exam, user) => {
  if (!exam) {
    throw new ApiError(404, 'NOT_FOUND', 'Exam not found');
  }
  if (user.role !== 'admin' && !exam.createdBy.equals(user._id)) {
    throw new ApiError(403, 'FORBIDDEN', 'You do not have permission to access this exam');
  }
};

const getAuthorizedExam = async (examId, user) => {
  const exam = await Exam.findById(examId);
  assertExamAccess(exam, user);
  return exam;
};

const buildStatusFilter = (status, currentTime) => {
  if (!status) return {};
  if (status === 'draft' || status === 'cancelled') return { status };
  if (status === 'published') return { status: 'published', startAt: { $gt: currentTime } };
  if (status === 'ongoing') {
    return { status: 'published', startAt: { $lte: currentTime }, endAt: { $gt: currentTime } };
  }
  return {
    $or: [{ status: 'completed' }, { status: 'published', endAt: { $lte: currentTime } }],
  };
};

const computeReadinessChecks = async (exam) => {
  const currentTime = now();
  const questionIds = (exam.questions || []).map((q) => q.questionId);

  const [activeEnrollments, questionDocs] = await Promise.all([
    Enrollment.countDocuments({ examId: exam._id, status: 'active' }),
    questionIds.length
      ? Question.find({ _id: { $in: questionIds } }).select('type isArchived difficulty')
      : Promise.resolve([]),
  ]);

  const startMs = new Date(exam.startAt).getTime();
  const endMs = new Date(exam.endAt).getTime();
  const currentMs = new Date(currentTime).getTime();

  let hasSufficientPoolStrata = true;
  if (exam.blueprint?.poolMode) {
    const counts = { easy: 0, medium: 0, hard: 0 };
    for (const qDoc of questionDocs) {
      if (!qDoc.isArchived && qDoc.difficulty in counts) {
        counts[qDoc.difficulty] += 1;
      }
    }
    const reqEasy = exam.blueprint.easy ?? 0;
    const reqMedium = exam.blueprint.medium ?? 0;
    const reqHard = exam.blueprint.hard ?? 0;
    hasSufficientPoolStrata =
      reqEasy + reqMedium + reqHard > 0 &&
      counts.easy >= reqEasy &&
      counts.medium >= reqMedium &&
      counts.hard >= reqHard;
  }

  const checks = {
    hasQuestions: questionIds.length > 0,
    validWindow: endMs > Math.max(startMs, currentMs),
    positiveTotalMarks: (exam.totalMarks ?? 0) > 0,
    hasEnrollments: activeEnrollments > 0,
    hasWrittenQuestions: questionDocs.some((q) => q.type === 'written'),
    hasSufficientPoolStrata,
  };

  const blockers = [];
  if (!checks.hasQuestions) blockers.push('Exam must have at least one assigned question before publishing');
  if (!checks.validWindow) blockers.push('Exam end time must be in the future and after start time');
  if (!checks.positiveTotalMarks) blockers.push('Exam total marks must be greater than zero');
  if (!checks.hasSufficientPoolStrata) {
    blockers.push('Assigned questions do not satisfy configured difficulty blueprint counts');
  }

  const warnings = [];
  if (!checks.hasEnrollments) warnings.push('No candidates are currently enrolled in this exam');
  if (checks.hasWrittenQuestions) warnings.push('Exam includes written questions that require manual grading');

  return {
    ready: blockers.length === 0,
    checks,
    blockers,
    warnings,
  };
};

/**
 * Lists exams scoped by ownership (examiner sees own, admin sees all) with pagination and status filtering.
 */
export const listExams = async ({ user, query }) => {
  const { status, page = 1, limit = 20 } = query;
  const currentTime = now();
  const filter = {
    ...(user.role !== 'admin' ? { createdBy: user._id } : {}),
    ...buildStatusFilter(status, currentTime),
  };

  const skip = (page - 1) * limit;
  const [docs, total] = await Promise.all([
    Exam.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Exam.countDocuments(filter),
  ]);

  let countMap = new Map();
  if (docs.length > 0) {
    const counts = await Enrollment.aggregate([
      { $match: { examId: { $in: docs.map((d) => d._id) }, status: 'active' } },
      { $group: { _id: '$examId', count: { $sum: 1 } } },
    ]);
    countMap = new Map(counts.map((c) => [String(c._id), c.count]));
  }

  return {
    exams: docs.map((exam) =>
      serializeExam(exam, { currentTime, enrolledCount: countMap.get(String(exam._id)) ?? 0 })
    ),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
};

/**
 * Creates a new draft exam owned by the requesting examiner or admin.
 */
export const createExam = async ({ user, payload }) => {
  const exam = await Exam.create({
    ...payload,
    createdBy: user._id,
    status: 'draft',
    totalMarks: 0,
  });

  return { exam: serializeExam(exam, { enrolledCount: 0 }) };
};

/**
 * Retrieves a single exam by ID with its active enrollment count.
 */
export const getExamById = async ({ user, examId }) => {
  const exam = await getAuthorizedExam(examId, user);
  const enrolledCount = await Enrollment.countDocuments({ examId: exam._id, status: 'active' });
  return { exam: serializeExam(exam, { enrolledCount }) };
};

/**
 * Updates an exam respecting lifecycle transition restrictions (restricted fields locked once published).
 */
export const updateExam = async ({ user, examId, payload }) => {
  const exam = await getAuthorizedExam(examId, user);
  const effective = resolveExamStatus(exam);

  if (effective === 'completed' || effective === 'cancelled') {
    throw new ApiError(409, 'CONFLICT', `Cannot modify an exam with status '${effective}'`);
  }

  if (exam.status === 'published') {
    const allowedPublishedKeys = new Set(['title', 'instructions', 'endAt', 'settings']);
    const disallowed = Object.keys(payload).filter((key) => !allowedPublishedKeys.has(key));
    if (disallowed.length > 0) {
      throw new ApiError(
        409,
        'CONFLICT',
        `Cannot modify ${disallowed.join(', ')} after an exam has been published`
      );
    }

    if (payload.settings) {
      const settingKeys = Object.keys(payload.settings);
      const lockedSettings = settingKeys.filter((k) => k !== 'showScoreImmediately');
      if (lockedSettings.length > 0) {
        throw new ApiError(
          409,
          'CONFLICT',
          `Cannot modify settings (${lockedSettings.join(', ')}) after an exam has been published`
        );
      }
      if (payload.settings.showScoreImmediately !== undefined) {
        exam.settings.showScoreImmediately = payload.settings.showScoreImmediately;
      }
    }

    if (payload.endAt !== undefined) {
      const nextEnd = new Date(payload.endAt);
      if (nextEnd < new Date(exam.endAt)) {
        throw new ApiError(409, 'CONFLICT', 'Published exam end time can only be extended');
      }
      exam.endAt = nextEnd;
    }

    if (payload.title !== undefined) exam.title = payload.title;
    if (payload.instructions !== undefined) exam.instructions = payload.instructions;
  } else {
    const nextStart = payload.startAt ? new Date(payload.startAt) : new Date(exam.startAt);
    const nextEnd = payload.endAt ? new Date(payload.endAt) : new Date(exam.endAt);
    if (nextEnd <= nextStart) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'endAt must be after startAt');
    }

    if (payload.title !== undefined) exam.title = payload.title;
    if (payload.instructions !== undefined) exam.instructions = payload.instructions;
    if (payload.startAt !== undefined) exam.startAt = nextStart;
    if (payload.endAt !== undefined) exam.endAt = nextEnd;
    if (payload.durationMinutes !== undefined) exam.durationMinutes = payload.durationMinutes;
    if (payload.settings) {
      Object.assign(exam.settings, payload.settings);
    }
  }

  await exam.save();
  const enrolledCount = await Enrollment.countDocuments({ examId: exam._id, status: 'active' });
  return { exam: serializeExam(exam, { enrolledCount }) };
};

/**
 * Permanently deletes a draft exam (and its enrollments) or cancels an active published exam.
 */
export const deleteExam = async ({ user, examId }) => {
  const exam = await getAuthorizedExam(examId, user);
  const effective = resolveExamStatus(exam);

  if (exam.status === 'draft') {
    await Promise.all([
      Enrollment.deleteMany({ examId: exam._id }),
      Exam.deleteOne({ _id: exam._id }),
    ]);
    return { deleted: true, examId: String(exam._id) };
  }

  if (effective === 'completed' || exam.status === 'cancelled') {
    throw new ApiError(409, 'CONFLICT', `Cannot delete or cancel an exam with status '${effective}'`);
  }

  exam.status = 'cancelled';
  await exam.save();
  return { exam: serializeExam(exam) };
};

/**
 * Replaces a draft exam's ordered question list after verifying ownership/active state and recomputing totalMarks.
 */
export const setExamQuestions = async ({ user, examId, questions }) => {
  const exam = await getAuthorizedExam(examId, user);

  if (exam.status !== 'draft') {
    throw new ApiError(409, 'CONFLICT', 'Exam questions can only be edited while in draft status');
  }

  const seen = new Set();
  for (const item of questions) {
    if (seen.has(item.questionId)) {
      throw new ApiError(400, 'BAD_REQUEST', 'Duplicate questionId in exam question list');
    }
    seen.add(item.questionId);
  }

  if (questions.length === 0) {
    exam.questions = [];
    exam.totalMarks = 0;
    await exam.save();
    return { exam: serializeExam(exam) };
  }

  const docs = await Question.find({ _id: { $in: [...seen] } });
  const docMap = new Map(docs.map((doc) => [String(doc._id), doc]));

  let totalMarks = 0;
  const assigned = questions.map((item, order) => {
    const doc = docMap.get(item.questionId);
    if (!doc) {
      throw new ApiError(400, 'BAD_REQUEST', `Question ${item.questionId} does not exist`);
    }
    if (user.role !== 'admin' && !doc.createdBy.equals(user._id)) {
      throw new ApiError(403, 'FORBIDDEN', 'Cannot assign another examiner question to this exam');
    }
    if (doc.isArchived) {
      throw new ApiError(400, 'BAD_REQUEST', `Question ${item.questionId} is archived`);
    }

    const marks = item.marks ?? doc.marks;
    totalMarks += marks;
    return {
      questionId: doc._id,
      marks,
      order,
    };
  });

  exam.questions = assigned;
  exam.totalMarks = Math.round(totalMarks * 100) / 100;
  await exam.save();

  return { exam: serializeExam(exam) };
};

/**
 * Evaluates pre-publish readiness checks, blockers, and warnings for an exam.
 */
export const getExamReadiness = async ({ user, examId }) => {
  const exam = await getAuthorizedExam(examId, user);
  return computeReadinessChecks(exam);
};

/**
 * Publishes a draft exam if all pre-publish readiness blockers pass.
 */
export const publishExam = async ({ user, examId }) => {
  const exam = await getAuthorizedExam(examId, user);

  if (exam.status !== 'draft') {
    throw new ApiError(409, 'CONFLICT', `Only draft exams can be published (current status: '${exam.status}')`);
  }

  const readiness = await computeReadinessChecks(exam);
  if (!readiness.ready) {
    throw new ApiError(
      409,
      'CONFLICT',
      readiness.blockers[0] || 'Exam is not ready to publish',
      readiness.blockers
    );
  }

  const publishedAt = now();
  exam.status = 'published';
  exam.publishedAt = publishedAt;
  await exam.save();

  const enrolledCount = await Enrollment.countDocuments({ examId: exam._id, status: 'active' });
  return {
    exam: serializeExam(exam, { currentTime: publishedAt, enrolledCount }),
    readiness,
  };
};

/**
 * Explicitly marks a published exam as completed and finalizes any still-active attempts.
 */
export const completeExam = async ({ user, examId }) => {
  const exam = await getAuthorizedExam(examId, user);

  if (exam.status !== 'published') {
    throw new ApiError(409, 'CONFLICT', `Only published exams can be completed (current status: '${exam.status}')`);
  }

  const completedAt = now();
  exam.status = 'completed';
  await exam.save();

  const activeAttempts = await Attempt.find({ examId: exam._id, status: 'in_progress' }).select(
    '_id'
  );
  if (activeAttempts.length > 0) {
    await Attempt.updateMany(
      { _id: { $in: activeAttempts.map((a) => a._id) }, status: 'in_progress' },
      { $set: { status: 'submitted', submittedAt: completedAt, finalizedBy: 'examiner' } }
    );
    for (const doc of activeAttempts) {
      await autoGradeAttempt(doc._id);
    }
  }

  return { exam: serializeExam(exam, { currentTime: completedAt }) };
};

/**
 * Updates randomized pool blueprint quotas on a draft exam.
 */
export const updateBlueprint = async ({ user, examId, payload }) => {
  const exam = await getAuthorizedExam(examId, user);

  if (exam.status !== 'draft') {
    throw new ApiError(409, 'CONFLICT', 'Blueprint configuration can only be updated while in draft status');
  }

  exam.blueprint = payload;
  await exam.save();
  return { exam: serializeExam(exam) };
};
