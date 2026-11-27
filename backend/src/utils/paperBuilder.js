import crypto from 'node:crypto';
import { ApiError } from './ApiError.js';

const DIFFICULTY_WEIGHT = { easy: 1, medium: 2, hard: 3 };

const shuffleArray = (items) => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

/**
 * Builds an immutable attempt question snapshot with optional shuffling and paper metrics.
 */
export const buildFrozenPaper = (exam, questionDocs) => {
  const docMap = new Map(questionDocs.map((doc) => [String(doc._id), doc]));
  const orderedRefs = [...(exam.questions || [])].sort((a, b) => a.order - b.order);

  const rawItems = orderedRefs.map((ref) => {
    const doc = docMap.get(String(ref.questionId));
    if (!doc) {
      throw new ApiError(500, 'INTERNAL_ERROR', 'Exam references a missing question document');
    }

    const baseOptions = (doc.options || []).map((opt) => ({
      optionId: opt._id,
      text: opt.text,
    }));
    const optionOrder = exam.settings?.shuffleOptions ? shuffleArray(baseOptions) : baseOptions;

    return {
      questionId: doc._id,
      type: doc.type,
      text: doc.text,
      marks: ref.marks ?? doc.marks,
      scheme: {
        mode: doc.scheme?.mode ?? 'all_or_nothing',
        negativeMarks: doc.scheme?.negativeMarks ?? 0,
      },
      optionOrder,
      correctOptionIds: doc.correctOptionIds || [],
      difficulty: doc.difficulty,
      topic: doc.topic,
    };
  });

  let selectedItems = rawItems;
  if (exam.blueprint?.poolMode) {
    const strata = { easy: [], medium: [], hard: [] };
    for (const item of rawItems) {
      if (item.difficulty in strata) {
        strata[item.difficulty].push(item);
      }
    }

    const reqEasy = exam.blueprint.easy ?? 0;
    const reqMedium = exam.blueprint.medium ?? 0;
    const reqHard = exam.blueprint.hard ?? 0;

    if (
      strata.easy.length < reqEasy ||
      strata.medium.length < reqMedium ||
      strata.hard.length < reqHard
    ) {
      throw new ApiError(
        409,
        'CONFLICT',
        'Exam question pool does not contain enough questions for the configured difficulty blueprint'
      );
    }

    selectedItems = [
      ...shuffleArray(strata.easy).slice(0, reqEasy),
      ...shuffleArray(strata.medium).slice(0, reqMedium),
      ...shuffleArray(strata.hard).slice(0, reqHard),
    ];
  }

  const paper = exam.settings?.shuffleQuestions ? shuffleArray(selectedItems) : selectedItems;

  const fingerprintPayload = paper.map((item) => ({
    q: String(item.questionId),
    o: item.optionOrder.map((opt) => String(opt.optionId)),
  }));
  const paperFingerprint = crypto
    .createHash('sha256')
    .update(JSON.stringify(fingerprintPayload))
    .digest('hex');

  const difficultySum = paper.reduce((sum, item) => sum + (DIFFICULTY_WEIGHT[item.difficulty] || 2), 0);
  const paperDifficultyIndex =
    paper.length > 0 ? Math.round((difficultySum / paper.length) * 100) / 100 : 0;

  const maxScore = Math.round(paper.reduce((sum, item) => sum + item.marks, 0) * 100) / 100;

  return {
    paper,
    paperFingerprint,
    paperDifficultyIndex,
    maxScore,
  };
};
