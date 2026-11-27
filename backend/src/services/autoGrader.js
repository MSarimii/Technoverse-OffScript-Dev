import Attempt from '../models/Attempt.js';
import Exam from '../models/Exam.js';
import { computeAttemptTotals, round2, scoreQuestion } from '../utils/scoring.js';

/**
 * Auto-grades all objective items on a finalized attempt idempotently, preserving manual scores if configured.
 */
export const autoGradeAttempt = async (attemptId, { preserveManual = true } = {}) => {
  const attempt = await Attempt.findById(attemptId).select('+paper.correctOptionIds');
  if (!attempt || attempt.status === 'in_progress') {
    return attempt;
  }

  const exam = await Exam.findById(attempt.examId).select('settings').lean();
  const examSettings = exam?.settings || {};

  const answerMap = new Map((attempt.answers || []).map((a) => [String(a.questionId), a]));
  const prevGradeMap = new Map((attempt.grades || []).map((g) => [String(g.questionId), g]));

  const grades = (attempt.paper || []).map((item) => {
    const qIdStr = String(item.questionId);
    const prev = prevGradeMap.get(qIdStr);
    const scored = scoreQuestion(item, answerMap.get(qIdStr), examSettings);

    if (preserveManual && prev && prev.manualScore !== null && prev.manualScore !== undefined) {
      return {
        questionId: item.questionId,
        autoScore: scored.autoScore,
        manualScore: prev.manualScore,
        finalScore: round2(prev.manualScore),
        maxMarks: item.marks,
        graderId: prev.graderId ?? null,
        feedback: prev.feedback ?? '',
        gradedAt: prev.gradedAt ?? null,
      };
    }

    return {
      questionId: item.questionId,
      autoScore: scored.autoScore,
      manualScore: null,
      finalScore: scored.finalScore,
      maxMarks: item.marks,
      graderId: prev?.graderId ?? null,
      feedback: prev?.feedback ?? '',
      gradedAt: prev?.gradedAt ?? null,
    };
  });

  const maxScore = round2((attempt.paper || []).reduce((sum, item) => sum + item.marks, 0));
  const { totalScore, percentage, gradingStatus } = computeAttemptTotals(
    grades,
    maxScore,
    attempt.paper
  );

  attempt.grades = grades;
  attempt.maxScore = maxScore;
  attempt.totalScore = totalScore;
  attempt.percentage = percentage;
  attempt.gradingStatus = gradingStatus;

  if (gradingStatus === 'complete') {
    attempt.status = 'graded';
  }

  await attempt.save();
  return attempt;
};
