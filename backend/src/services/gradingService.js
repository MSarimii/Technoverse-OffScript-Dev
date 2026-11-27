import Attempt from '../models/Attempt.js';
import AuditLog from '../models/AuditLog.js';
import Enrollment from '../models/Enrollment.js';
import Exam from '../models/Exam.js';
import Question from '../models/Question.js';
import { ApiError } from '../utils/ApiError.js';
import { computeAttemptTotals, round2 } from '../utils/scoring.js';
import { now } from '../utils/time.js';
import { sweepExamOverdueAttempts } from './attemptSweeper.js';
import { autoGradeAttempt } from './autoGrader.js';
import { assertExamAccess } from './examService.js';

export { autoGradeAttempt };

const getAuthorizedExam = async (examId, user) => {
  const exam = await Exam.findById(examId);
  assertExamAccess(exam, user);
  return exam;
};

const formatCandidateSummary = (userDoc) => {
  if (!userDoc || typeof userDoc !== 'object' || !userDoc.email) return null;
  return {
    id: String(userDoc._id),
    name: userDoc.name,
    email: userDoc.email,
    ...(userDoc.rollNo !== undefined ? { rollNo: userDoc.rollNo } : {}),
  };
};

const formatGradingDetail = (attempt) => ({
  id: String(attempt._id),
  examId: String(attempt.examId),
  userId:
    attempt.userId && typeof attempt.userId === 'object' && attempt.userId._id
      ? String(attempt.userId._id)
      : String(attempt.userId),
  ...(attempt.userId && typeof attempt.userId === 'object' && attempt.userId.email
    ? { candidate: formatCandidateSummary(attempt.userId) }
    : {}),
  status: attempt.status,
  gradingStatus: attempt.gradingStatus,
  startedAt: attempt.startedAt,
  deadlineAt: attempt.deadlineAt,
  submittedAt: attempt.submittedAt ?? null,
  finalizedBy: attempt.finalizedBy ?? null,
  totalScore: attempt.totalScore ?? 0,
  maxScore: attempt.maxScore ?? 0,
  percentage: attempt.percentage ?? 0,
  paper: (attempt.paper || []).map((item) => ({
    questionId: String(item.questionId),
    type: item.type,
    text: item.text,
    marks: item.marks,
    scheme: {
      mode: item.scheme?.mode ?? 'all_or_nothing',
      negativeMarks: item.scheme?.negativeMarks ?? 0,
    },
    optionOrder: (item.optionOrder || []).map((opt) => ({
      optionId: String(opt.optionId),
      text: opt.text,
    })),
    correctOptionIds: (item.correctOptionIds || []).map(String),
    difficulty: item.difficulty,
    topic: item.topic,
  })),
  answers: (attempt.answers || []).map((ans) => ({
    questionId: String(ans.questionId),
    selectedOptionIds: (ans.selectedOptionIds || []).map(String),
    text: ans.text ?? '',
    markedForReview: Boolean(ans.markedForReview),
    seq: ans.seq,
    savedAt: ans.savedAt,
  })),
  grades: (attempt.grades || []).map((g) => ({
    questionId: String(g.questionId),
    autoScore: g.autoScore ?? null,
    manualScore: g.manualScore ?? null,
    finalScore: g.finalScore ?? 0,
    maxMarks: g.maxMarks,
    graderId: g.graderId ? String(g.graderId) : null,
    feedback: g.feedback ?? '',
    gradedAt: g.gradedAt ?? null,
  })),
});

/**
 * Lists all real attempts for an exam with candidate metadata and score summaries.
 */
export const listExamSubmissions = async ({ user, examId }) => {
  const exam = await getAuthorizedExam(examId, user);
  await sweepExamOverdueAttempts(exam._id);

  const attempts = await Attempt.find({ examId: exam._id, isSandbox: false })
    .populate('userId', 'name email rollNo')
    .sort({ submittedAt: -1, createdAt: -1 })
    .lean();

  return {
    submissions: attempts.map((a) => ({
      id: String(a._id),
      attemptId: String(a._id),
      examId: String(a.examId),
      userId: a.userId?._id ? String(a.userId._id) : String(a.userId),
      candidate: formatCandidateSummary(a.userId),
      status: a.status,
      gradingStatus: a.gradingStatus,
      totalScore: a.totalScore ?? 0,
      maxScore: a.maxScore ?? 0,
      percentage: a.percentage ?? 0,
      submittedAt: a.submittedAt ?? null,
      finalizedBy: a.finalizedBy ?? null,
    })),
  };
};

/**
 * Loads full attempt detail including correctOptionIds for examiner/admin grading review.
 */
export const getAttemptForGrading = async ({ user, attemptId }) => {
  const attempt = await Attempt.findById(attemptId)
    .select('+paper.correctOptionIds')
    .populate('userId', 'name email rollNo');
  if (!attempt) {
    throw new ApiError(404, 'NOT_FOUND', 'Attempt not found');
  }

  await getAuthorizedExam(attempt.examId, user);
  return { attempt: formatGradingDetail(attempt) };
};

/**
 * Assigns manual score and feedback to a single question within an attempt and recomputes totals.
 */
export const gradeManualQuestion = async ({ user, attemptId, questionId, score, feedback = '' }) => {
  let attempt = await Attempt.findById(attemptId)
    .select('+paper.correctOptionIds')
    .populate('userId', 'name email rollNo');
  if (!attempt) {
    throw new ApiError(404, 'NOT_FOUND', 'Attempt not found');
  }

  const exam = await getAuthorizedExam(attempt.examId, user);
  if (attempt.status === 'in_progress') {
    throw new ApiError(409, 'CONFLICT', 'Cannot grade an in-progress attempt before submission');
  }

  const paperItem = (attempt.paper || []).find((p) => String(p.questionId) === String(questionId));
  if (!paperItem) {
    throw new ApiError(404, 'NOT_FOUND', 'Question does not belong to this attempt');
  }

  if (score < 0 || score > paperItem.marks) {
    throw new ApiError(
      400,
      'SCORE_OUT_OF_RANGE',
      `Score must be between 0 and ${paperItem.marks}`
    );
  }

  if (!attempt.grades || attempt.grades.length === 0) {
    await autoGradeAttempt(attempt._id, { preserveManual: true });
    attempt = await Attempt.findById(attempt._id)
      .select('+paper.correctOptionIds')
      .populate('userId', 'name email rollNo');
  }

  const gradeEntry = attempt.grades.find((g) => String(g.questionId) === String(questionId));
  const gradedAt = now();
  const normalizedScore = round2(score);

  if (gradeEntry) {
    gradeEntry.manualScore = normalizedScore;
    gradeEntry.finalScore = normalizedScore;
    gradeEntry.graderId = user._id;
    gradeEntry.feedback = feedback;
    gradeEntry.gradedAt = gradedAt;
  } else {
    attempt.grades.push({
      questionId: paperItem.questionId,
      autoScore: null,
      manualScore: normalizedScore,
      finalScore: normalizedScore,
      maxMarks: paperItem.marks,
      graderId: user._id,
      feedback,
      gradedAt,
    });
  }

  const maxScore = attempt.maxScore || round2(attempt.paper.reduce((sum, p) => sum + p.marks, 0));
  const totals = computeAttemptTotals(attempt.grades, maxScore, attempt.paper);
  attempt.totalScore = totals.totalScore;
  attempt.percentage = totals.percentage;
  attempt.gradingStatus = totals.gradingStatus;
  if (totals.gradingStatus === 'complete') {
    attempt.status = 'graded';
  }

  await attempt.save();
  await AuditLog.create({
    actorId: user._id,
    action: 'manual_grade',
    entityType: 'Attempt',
    entityId: attempt._id,
    meta: { examId: exam._id, questionId, score: normalizedScore },
    at: gradedAt,
  });

  return { attempt: formatGradingDetail(attempt) };
};

/**
 * Re-runs objective auto-grading across all finalized attempts for an exam while preserving manual scores.
 */
export const regradeExam = async ({ user, examId }) => {
  const exam = await getAuthorizedExam(examId, user);
  await sweepExamOverdueAttempts(exam._id);

  const finalized = await Attempt.find({
    examId: exam._id,
    isSandbox: false,
    status: { $in: ['submitted', 'expired', 'graded'] },
  }).select('_id');

  for (const doc of finalized) {
    await autoGradeAttempt(doc._id, { preserveManual: true });
  }

  await AuditLog.create({
    actorId: user._id,
    action: 'regrade',
    entityType: 'Exam',
    entityId: exam._id,
    meta: { regradedCount: finalized.length },
    at: now(),
  });

  return {
    examId: String(exam._id),
    regradedCount: finalized.length,
  };
};

const computePublishReadiness = async (examId) => {
  const attempts = await Attempt.find({ examId, isSandbox: false })
    .select('status gradingStatus')
    .lean();

  const totalAttempts = attempts.length;
  const inProgressCount = attempts.filter((a) => a.status === 'in_progress').length;
  const pendingManualCount = attempts.filter(
    (a) => a.status !== 'in_progress' && a.gradingStatus !== 'complete'
  ).length;
  const gradedCount = attempts.filter(
    (a) => a.status !== 'in_progress' && a.gradingStatus === 'complete'
  ).length;

  const blockers = [];
  if (pendingManualCount > 0) {
    blockers.push(`${pendingManualCount} attempt(s) still require manual grading`);
  }

  return {
    totalAttempts,
    gradedCount,
    pendingManualCount,
    inProgressCount,
    blockers,
    readyToPublish: pendingManualCount === 0,
  };
};

/**
 * Summarizes grading completion and blockers prior to publishing exam results.
 */
export const getResultsPreview = async ({ user, examId }) => {
  const exam = await getAuthorizedExam(examId, user);
  await sweepExamOverdueAttempts(exam._id);
  return computePublishReadiness(exam._id);
};

/**
 * Publishes exam results to enrolled candidates once grading is complete (or when forced).
 */
export const publishResults = async ({ user, examId, force = false }) => {
  const exam = await getAuthorizedExam(examId, user);
  await sweepExamOverdueAttempts(exam._id);

  const preview = await computePublishReadiness(exam._id);
  if (preview.pendingManualCount > 0 && !force) {
    throw new ApiError(
      409,
      'GRADING_INCOMPLETE',
      'Cannot publish results while written questions await manual grading',
      preview.blockers
    );
  }

  const publishedAt = now();
  exam.resultsPublished = true;
  exam.resultsPublishedAt = publishedAt;
  await exam.save();

  await AuditLog.create({
    actorId: user._id,
    action: 'publish_results',
    entityType: 'Exam',
    entityId: exam._id,
    meta: { force: Boolean(force), ...preview },
    at: publishedAt,
  });

  return {
    examId: String(exam._id),
    resultsPublished: true,
    resultsPublishedAt: publishedAt,
    preview,
  };
};

/**
 * Retracts published exam results from candidate visibility.
 */
export const unpublishResults = async ({ user, examId }) => {
  const exam = await getAuthorizedExam(examId, user);
  exam.resultsPublished = false;
  await exam.save();

  await AuditLog.create({
    actorId: user._id,
    action: 'unpublish_results',
    entityType: 'Exam',
    entityId: exam._id,
    meta: {},
    at: now(),
  });

  return {
    examId: String(exam._id),
    resultsPublished: false,
  };
};

/**
 * Computes score statistics, pass rate, histogram, completion rate, and avg duration on real finalized attempts.
 */
export const getExamAnalytics = async ({ user, examId }) => {
  const exam = await getAuthorizedExam(examId, user);
  await sweepExamOverdueAttempts(exam._id);

  const [finalized, activeEnrollments] = await Promise.all([
    Attempt.find({
      examId: exam._id,
      isSandbox: false,
      status: { $in: ['submitted', 'expired', 'graded'] },
    }).lean(),
    Enrollment.countDocuments({ examId: exam._id, status: 'active' }),
  ]);

  const attemptCount = finalized.length;
  const gradedCount = finalized.filter((a) => a.gradingStatus === 'complete').length;

  const histogramBuckets = [
    { range: '0-19%', count: 0 },
    { range: '20-39%', count: 0 },
    { range: '40-59%', count: 0 },
    { range: '60-79%', count: 0 },
    { range: '80-100%', count: 0 },
  ];

  if (attemptCount === 0) {
    return {
      attemptCount: 0,
      gradedCount: 0,
      mean: 0,
      median: 0,
      min: 0,
      max: 0,
      passRate: 0,
      scoreHistogram: histogramBuckets,
      completionRate: 0,
      avgTimeMinutes: 0,
    };
  }

  const scores = finalized.map((a) => a.totalScore ?? 0).sort((a, b) => a - b);
  const sum = scores.reduce((acc, s) => acc + s, 0);
  const mean = round2(sum / attemptCount);
  const mid = Math.floor(attemptCount / 2);
  const median =
    attemptCount % 2 === 1 ? round2(scores[mid]) : round2((scores[mid - 1] + scores[mid]) / 2);
  const min = round2(scores[0]);
  const max = round2(scores[scores.length - 1]);

  let passed = 0;
  let durationMinutesSum = 0;
  for (const a of finalized) {
    const pct = a.percentage ?? 0;
    if (pct >= 50) passed += 1;

    if (pct < 20) histogramBuckets[0].count += 1;
    else if (pct < 40) histogramBuckets[1].count += 1;
    else if (pct < 60) histogramBuckets[2].count += 1;
    else if (pct < 80) histogramBuckets[3].count += 1;
    else histogramBuckets[4].count += 1;

    const endMs = new Date(a.submittedAt || a.updatedAt).getTime();
    const startMs = new Date(a.startedAt).getTime();
    durationMinutesSum += Math.max(0, (endMs - startMs) / 60000);
  }

  return {
    attemptCount,
    gradedCount,
    mean,
    median,
    min,
    max,
    passRate: round2((passed / attemptCount) * 100),
    scoreHistogram: histogramBuckets,
    completionRate: activeEnrollments > 0 ? round2((attemptCount / activeEnrollments) * 100) : 100,
    avgTimeMinutes: round2(durationMinutesSum / attemptCount),
  };
};

/**
 * Lists published exam results belonging to the authenticated candidate.
 */
export const listCandidateResults = async ({ user }) => {
  const attempts = await Attempt.find({
    userId: user._id,
    isSandbox: false,
    status: { $in: ['submitted', 'expired', 'graded'] },
  })
    .sort({ submittedAt: -1 })
    .lean();

  if (attempts.length === 0) {
    return { results: [] };
  }

  const exams = await Exam.find({
    _id: { $in: attempts.map((a) => a.examId) },
    resultsPublished: true,
  })
    .select('title totalMarks resultsPublished resultsPublishedAt')
    .lean();

  const publishedExamMap = new Map(exams.map((e) => [String(e._id), e]));
  const results = [];

  for (const attempt of attempts) {
    const exam = publishedExamMap.get(String(attempt.examId));
    if (!exam) continue;
    results.push({
      attemptId: String(attempt._id),
      examId: String(exam._id),
      examTitle: exam.title,
      status: attempt.status,
      gradingStatus: attempt.gradingStatus,
      totalScore: attempt.totalScore ?? 0,
      maxScore: attempt.maxScore ?? 0,
      percentage: attempt.percentage ?? 0,
      submittedAt: attempt.submittedAt ?? null,
      resultsPublishedAt: exam.resultsPublishedAt ?? null,
    });
  }

  return { results };
};

/**
 * Returns full score breakdown for an owned candidate attempt once exam results are published.
 */
export const getCandidateResultDetail = async ({ user, attemptId }) => {
  const attempt = await Attempt.findById(attemptId).lean();
  if (!attempt) {
    throw new ApiError(404, 'NOT_FOUND', 'Attempt not found');
  }
  if (String(attempt.userId) !== String(user._id)) {
    throw new ApiError(403, 'FORBIDDEN', 'You do not have permission to view this result');
  }

  const exam = await Exam.findById(attempt.examId)
    .select('title resultsPublished resultsPublishedAt')
    .lean();
  if (!exam?.resultsPublished) {
    throw new ApiError(
      403,
      'RESULTS_NOT_PUBLISHED',
      'Results for this exam have not been published yet'
    );
  }

  return {
    result: {
      attemptId: String(attempt._id),
      examId: String(attempt.examId),
      examTitle: exam.title,
      status: attempt.status,
      gradingStatus: attempt.gradingStatus,
      totalScore: attempt.totalScore ?? 0,
      maxScore: attempt.maxScore ?? 0,
      percentage: attempt.percentage ?? 0,
      startedAt: attempt.startedAt,
      submittedAt: attempt.submittedAt ?? null,
      resultsPublishedAt: exam.resultsPublishedAt ?? null,
      paper: (attempt.paper || []).map((item) => ({
        questionId: String(item.questionId),
        type: item.type,
        text: item.text,
        marks: item.marks,
        optionOrder: (item.optionOrder || []).map((opt) => ({
          optionId: String(opt.optionId),
          text: opt.text,
        })),
        difficulty: item.difficulty,
        topic: item.topic,
      })),
      answers: (attempt.answers || []).map((ans) => ({
        questionId: String(ans.questionId),
        selectedOptionIds: (ans.selectedOptionIds || []).map(String),
        text: ans.text ?? '',
        markedForReview: Boolean(ans.markedForReview),
      })),
      grades: (attempt.grades || []).map((g) => ({
        questionId: String(g.questionId),
        autoScore: g.autoScore ?? null,
        manualScore: g.manualScore ?? null,
        finalScore: g.finalScore ?? 0,
        maxMarks: g.maxMarks,
        feedback: g.feedback ?? '',
        gradedAt: g.gradedAt ?? null,
      })),
    },
  };
};

/**
 * Computes per-question difficulty calibration and option selection distribution across real finalized attempts.
 */
export const getExamQuestionAnalytics = async ({ user, examId }) => {
  const exam = await getAuthorizedExam(examId, user);
  await sweepExamOverdueAttempts(exam._id);

  const questionRefs = [...(exam.questions || [])].sort((a, b) => a.order - b.order);
  const questionIds = questionRefs.map((q) => q.questionId);

  const [finalized, questionDocs] = await Promise.all([
    Attempt.find({
      examId: exam._id,
      isSandbox: false,
      status: { $in: ['submitted', 'expired', 'graded'] },
    })
      .select('paper answers grades totalScore')
      .lean(),
    questionIds.length
      ? Question.find({ _id: { $in: questionIds } }).select('text type topic difficulty options').lean()
      : Promise.resolve([]),
  ]);

  const qDocMap = new Map(questionDocs.map((q) => [String(q._id), q]));

  const questions = questionRefs.map((ref) => {
    const qIdStr = String(ref.questionId);
    const qDoc = qDocMap.get(qIdStr);
    let totalAttempts = 0;
    let answeredCount = 0;
    let correctCount = 0;
    let scoreSum = 0;
    const discriminationEntries = [];
    const optionCounts = new Map();

    const baseOptions = (qDoc?.options || []).map((opt) => ({
      optionId: String(opt._id),
      text: opt.text,
    }));
    for (const opt of baseOptions) {
      optionCounts.set(opt.optionId, 0);
    }

    for (const attempt of finalized) {
      const paperItem = (attempt.paper || []).find((p) => String(p.questionId) === qIdStr);
      if (!paperItem) continue;

      totalAttempts += 1;
      if (baseOptions.length === 0 && paperItem.optionOrder?.length) {
        for (const opt of paperItem.optionOrder) {
          const id = String(opt.optionId);
          if (!optionCounts.has(id)) {
            optionCounts.set(id, 0);
            baseOptions.push({ optionId: id, text: opt.text });
          }
        }
      }

      const ans = (attempt.answers || []).find((a) => String(a.questionId) === qIdStr);
      const grade = (attempt.grades || []).find((g) => String(g.questionId) === qIdStr);

      if (paperItem.type === 'written') {
        if (ans?.text && ans.text.trim() !== '') answeredCount += 1;
      } else if (ans?.selectedOptionIds && ans.selectedOptionIds.length > 0) {
        answeredCount += 1;
        for (const optId of ans.selectedOptionIds) {
          const key = String(optId);
          optionCounts.set(key, (optionCounts.get(key) ?? 0) + 1);
        }
      }

      const finalScore = grade?.finalScore ?? 0;
      scoreSum += finalScore;
      discriminationEntries.push({
        totalScore: attempt.totalScore ?? 0,
        questionScore: finalScore,
      });
      if (ref.marks > 0 && finalScore >= ref.marks) {
        correctCount += 1;
      }
    }

    const skippedCount = totalAttempts - answeredCount;
    const skippedRate = totalAttempts > 0 ? round2(skippedCount / totalAttempts) : 0;
    const correctRate = totalAttempts > 0 ? round2(correctCount / totalAttempts) : 0;
    const avgScore = totalAttempts > 0 ? round2(scoreSum / totalAttempts) : 0;

    let observedDifficulty = 'uncalibrated';
    if (totalAttempts > 0) {
      if (correctRate >= 0.7) observedDifficulty = 'easy';
      else if (correctRate >= 0.35) observedDifficulty = 'medium';
      else observedDifficulty = 'hard';
    }

    let flaggedAmbiguous = false;
    let ambiguityReason = null;
    if (totalAttempts >= 2 && correctRate !== null) {
      if (correctRate < 0.25) {
        flaggedAmbiguous = true;
        ambiguityReason = 'Low overall accuracy (<25%)';
      } else {
        const sorted = [...discriminationEntries].sort((a, b) => b.totalScore - a.totalScore);
        const half = Math.floor(sorted.length / 2);
        const topHalf = sorted.slice(0, half);
        const bottomHalf = sorted.slice(-half);
        const topAvg = topHalf.reduce((sum, item) => sum + item.questionScore, 0) / half;
        const bottomAvg = bottomHalf.reduce((sum, item) => sum + item.questionScore, 0) / half;
        if (
          topHalf[0].totalScore > bottomHalf[bottomHalf.length - 1].totalScore &&
          topAvg < bottomAvg
        ) {
          flaggedAmbiguous = true;
          ambiguityReason = 'Negative item discrimination';
        }
      }
    }

    const optionDistribution =
      (qDoc?.type ?? 'written') === 'written'
        ? []
        : baseOptions.map((opt) => {
            const count = optionCounts.get(opt.optionId) ?? 0;
            return {
              optionId: opt.optionId,
              text: opt.text,
              count,
              percentage: totalAttempts > 0 ? round2((count / totalAttempts) * 100) : 0,
            };
          });

    return {
      questionId: qIdStr,
      text: qDoc?.text ?? '',
      type: qDoc?.type ?? 'written',
      topic: qDoc?.topic ?? '',
      labeledDifficulty: qDoc?.difficulty ?? 'medium',
      maxMarks: ref.marks,
      totalAttempts,
      answeredCount,
      skippedCount,
      skippedRate,
      correctCount,
      correctRate,
      avgScore,
      observedDifficulty,
      flaggedAmbiguous,
      ambiguityReason,
      optionDistribution,
    };
  });

  return {
    examId: String(exam._id),
    questions,
  };
};
