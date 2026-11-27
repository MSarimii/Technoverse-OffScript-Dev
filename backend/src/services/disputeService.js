import Attempt from '../models/Attempt.js';
import AuditLog from '../models/AuditLog.js';
import Dispute, { serializeDispute } from '../models/Dispute.js';
import Exam from '../models/Exam.js';
import ReportVerification from '../models/ReportVerification.js';
import { ApiError } from '../utils/ApiError.js';
import { computeAttemptTotals, round2 } from '../utils/scoring.js';
import { now } from '../utils/time.js';
import { autoGradeAttempt } from './autoGrader.js';
import { assertExamAccess } from './examService.js';
import { getOrCreateVerification } from './reportService.js';

/**
 * Allows a candidate to submit one dispute per question once exam results are published.
 */
export const createDispute = async ({ user, attemptId, questionId, reason }) => {
  const attempt = await Attempt.findById(attemptId);
  if (!attempt) {
    throw new ApiError(404, 'NOT_FOUND', 'Attempt not found');
  }
  if (user.role !== 'candidate' || !attempt.userId.equals(user._id)) {
    throw new ApiError(403, 'FORBIDDEN', 'You do not have permission to dispute this attempt');
  }
  if (attempt.isSandbox) {
    throw new ApiError(409, 'CONFLICT', 'Sandbox attempts cannot be disputed');
  }
  if (attempt.status === 'in_progress') {
    throw new ApiError(409, 'CONFLICT', 'Cannot submit a dispute before the attempt is finalized');
  }

  const exam = await Exam.findById(attempt.examId);
  if (!exam) {
    throw new ApiError(404, 'NOT_FOUND', 'Exam not found');
  }
  if (!exam.resultsPublished) {
    throw new ApiError(
      403,
      'RESULTS_NOT_PUBLISHED',
      'Results must be published before submitting a dispute'
    );
  }

  const paperItem = (attempt.paper || []).find((p) => String(p.questionId) === String(questionId));
  if (!paperItem) {
    throw new ApiError(404, 'NOT_FOUND', 'Question does not belong to this attempt');
  }

  const existing = await Dispute.findOne({ attemptId: attempt._id, questionId: paperItem.questionId });
  if (existing) {
    throw new ApiError(409, 'CONFLICT', 'A dispute for this question has already been submitted');
  }

  try {
    const dispute = await Dispute.create({
      attemptId: attempt._id,
      examId: exam._id,
      userId: user._id,
      questionId: paperItem.questionId,
      reason,
    });
    return { dispute: serializeDispute(dispute) };
  } catch (err) {
    if (err?.code === 11000) {
      throw new ApiError(409, 'CONFLICT', 'A dispute for this question has already been submitted');
    }
    throw err;
  }
};

/**
 * Lists disputes belonging to an attempt for the owning candidate or authorized examiner/admin.
 */
export const listAttemptDisputes = async ({ user, attemptId }) => {
  const attempt = await Attempt.findById(attemptId);
  if (!attempt) {
    throw new ApiError(404, 'NOT_FOUND', 'Attempt not found');
  }

  if (user.role === 'candidate') {
    if (!attempt.userId.equals(user._id)) {
      throw new ApiError(403, 'FORBIDDEN', 'You do not have permission to view these disputes');
    }
  } else {
    const exam = await Exam.findById(attempt.examId);
    assertExamAccess(exam, user);
  }

  const docs = await Dispute.find({ attemptId: attempt._id }).sort({ createdAt: -1 }).lean();
  return {
    disputes: docs.map(serializeDispute),
  };
};

/**
 * Lists all disputes across an exam for its owning examiner or admin with optional status filter.
 */
export const listExamDisputes = async ({ user, examId, status }) => {
  const exam = await Exam.findById(examId);
  assertExamAccess(exam, user);

  const filter = { examId: exam._id };
  if (status) {
    filter.status = status;
  }

  const docs = await Dispute.find(filter)
    .populate('userId', 'name email rollNo')
    .populate('attemptId', 'paper.questionId paper.text paper.type paper.marks totalScore maxScore')
    .sort({ createdAt: -1 })
    .lean();

  const disputes = docs.map((doc) => {
    const base = serializeDispute(doc);
    const paperItems = doc.attemptId?.paper || [];
    const matched = paperItems.find((p) => String(p.questionId) === String(doc.questionId));
    return {
      ...base,
      ...(matched
        ? {
            question: {
              questionId: String(matched.questionId),
              text: matched.text,
              type: matched.type,
              marks: matched.marks,
            },
          }
        : {}),
    };
  });

  return { disputes };
};

/**
 * Resolves a dispute, optionally adjusting item score, recomputing totals, and refreshing HMAC verification.
 */
export const resolveDispute = async ({
  user,
  disputeId,
  status,
  resolutionNote = '',
  adjustedScore,
}) => {
  const dispute = await Dispute.findById(disputeId);
  if (!dispute) {
    throw new ApiError(404, 'NOT_FOUND', 'Dispute not found');
  }

  const exam = await Exam.findById(dispute.examId);
  assertExamAccess(exam, user);

  let attempt = await Attempt.findById(dispute.attemptId).select('+paper.correctOptionIds');
  if (!attempt) {
    throw new ApiError(404, 'NOT_FOUND', 'Attempt not found');
  }

  const resolvedAt = now();
  let finalAdjustedScore = null;

  if (status === 'accepted' && adjustedScore !== undefined) {
    const paperItem = (attempt.paper || []).find(
      (p) => String(p.questionId) === String(dispute.questionId)
    );
    if (!paperItem) {
      throw new ApiError(404, 'NOT_FOUND', 'Disputed question does not belong to this attempt');
    }

    if (adjustedScore < 0 || adjustedScore > paperItem.marks) {
      throw new ApiError(
        400,
        'SCORE_OUT_OF_RANGE',
        `Adjusted score must be between 0 and ${paperItem.marks}`
      );
    }

    if (!attempt.grades || attempt.grades.length === 0) {
      await autoGradeAttempt(attempt._id, { preserveManual: true });
      attempt = await Attempt.findById(attempt._id).select('+paper.correctOptionIds');
    }

    finalAdjustedScore = round2(adjustedScore);
    const gradeEntry = attempt.grades.find(
      (g) => String(g.questionId) === String(dispute.questionId)
    );

    if (gradeEntry) {
      gradeEntry.manualScore = finalAdjustedScore;
      gradeEntry.finalScore = finalAdjustedScore;
      gradeEntry.graderId = user._id;
      gradeEntry.feedback = resolutionNote || gradeEntry.feedback || '';
      gradeEntry.gradedAt = resolvedAt;
    } else {
      attempt.grades.push({
        questionId: paperItem.questionId,
        autoScore: null,
        manualScore: finalAdjustedScore,
        finalScore: finalAdjustedScore,
        maxMarks: paperItem.marks,
        graderId: user._id,
        feedback: resolutionNote,
        gradedAt: resolvedAt,
      });
    }

    const maxScore = attempt.maxScore || round2(attempt.paper.reduce((sum, p) => sum + p.marks, 0));
    const totals = computeAttemptTotals(attempt.grades, maxScore, attempt.paper);
    attempt.maxScore = maxScore;
    attempt.totalScore = totals.totalScore;
    attempt.percentage = totals.percentage;
    attempt.gradingStatus = totals.gradingStatus;
    if (totals.gradingStatus === 'complete') {
      attempt.status = 'graded';
    }

    await attempt.save();

    if (await ReportVerification.exists({ attemptId: attempt._id })) {
      await getOrCreateVerification(attempt);
    }
  }

  dispute.status = status;
  dispute.resolutionNote = resolutionNote;
  dispute.adjustedScore = finalAdjustedScore;
  dispute.resolvedBy = user._id;
  dispute.resolvedAt = resolvedAt;
  await dispute.save();

  await AuditLog.create({
    actorId: user._id,
    action: 'resolve_dispute',
    entityType: 'Dispute',
    entityId: dispute._id,
    meta: {
      examId: exam._id,
      attemptId: attempt._id,
      questionId: dispute.questionId,
      status,
      ...(finalAdjustedScore !== null ? { adjustedScore: finalAdjustedScore } : {}),
    },
    at: resolvedAt,
  });

  return {
    dispute: serializeDispute(dispute),
    attemptTotalScore: attempt.totalScore ?? 0,
    attemptPercentage: attempt.percentage ?? 0,
  };
};
