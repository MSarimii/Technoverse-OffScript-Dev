import Attempt from '../models/Attempt.js';
import Exam from '../models/Exam.js';
import { round2 } from '../utils/scoring.js';
import { assertExamAccess } from './examService.js';

/**
 * Evaluates structural paper difficulty parity across all real candidate attempts for an exam.
 */
export const getExamFairnessReport = async ({ user, examId }) => {
  const exam = await Exam.findById(examId).lean();
  assertExamAccess(exam, user);

  const attempts = await Attempt.find({ examId: exam._id, isSandbox: false })
    .select('paperFingerprint paperDifficultyIndex')
    .lean();

  const attemptCount = attempts.length;
  const uniqueFingerprints = new Set(
    attempts.map((a) => a.paperFingerprint).filter(Boolean)
  ).size;

  const strataConfigured = {
    easy: exam.blueprint?.easy ?? 0,
    medium: exam.blueprint?.medium ?? 0,
    hard: exam.blueprint?.hard ?? 0,
    poolMode: Boolean(exam.blueprint?.poolMode),
  };

  if (attemptCount === 0) {
    return {
      attemptCount: 0,
      uniqueFingerprints: 0,
      strataConfigured,
      difficultyIndexStats: { min: 0, max: 0, mean: 0, spread: 0 },
      fairnessStatus: 'no_attempts',
    };
  }

  const indices = attempts.map((a) => a.paperDifficultyIndex ?? 0);
  const min = round2(Math.min(...indices));
  const max = round2(Math.max(...indices));
  const mean = round2(indices.reduce((sum, val) => sum + val, 0) / attemptCount);
  const spread = round2(max - min);

  let fairnessStatus = 'balanced';
  if (spread > 0.2) fairnessStatus = 'skewed';
  else if (spread > 0) fairnessStatus = 'within_tolerance';

  return {
    attemptCount,
    uniqueFingerprints,
    strataConfigured,
    difficultyIndexStats: { min, max, mean, spread },
    fairnessStatus,
  };
};
