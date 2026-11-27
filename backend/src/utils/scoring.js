export const round2 = (value) => {
  const rounded = Math.round((value + Number.EPSILON) * 100) / 100;
  return Object.is(rounded, -0) ? 0 : rounded;
};

/**
 * Computes auto-grading outcome for a single paper item and candidate answer.
 */
export const scoreQuestion = (paperItem, answerItem, examSettings = {}) => {
  const marks = paperItem.marks;
  const negEnabled = Boolean(examSettings.negativeMarkingEnabled);
  const negativeMarks = paperItem.scheme?.negativeMarks || 0;

  if (paperItem.type === 'written') {
    return {
      autoScore: null,
      manualScore: null,
      finalScore: 0,
      pendingManual: true,
    };
  }

  const selected = [...new Set((answerItem?.selectedOptionIds || []).map(String))];
  if (selected.length === 0) {
    return {
      autoScore: 0,
      manualScore: null,
      finalScore: 0,
      pendingManual: false,
    };
  }

  const correctSet = new Set((paperItem.correctOptionIds || []).map(String));

  if (paperItem.type === 'single') {
    const isExactMatch = selected.length === 1 && correctSet.size === 1 && correctSet.has(selected[0]);
    const score = isExactMatch ? round2(marks) : negEnabled ? round2(-negativeMarks) : 0;
    return {
      autoScore: score,
      manualScore: null,
      finalScore: score,
      pendingManual: false,
    };
  }

  const mode = paperItem.scheme?.mode || 'all_or_nothing';
  if (mode === 'partial') {
    const correctSelected = selected.filter((id) => correctSet.has(id)).length;
    const wrongSelected = selected.filter((id) => !correctSet.has(id)).length;
    const totalCorrect = Math.max(1, correctSet.size);
    const ratio = Math.max(0, (correctSelected - wrongSelected) / totalCorrect);
    const score = round2(marks * ratio);
    return {
      autoScore: score,
      manualScore: null,
      finalScore: score,
      pendingManual: false,
    };
  }

  const isExactMultiMatch =
    selected.length === correctSet.size && selected.every((id) => correctSet.has(id));
  const score = isExactMultiMatch ? round2(marks) : negEnabled ? round2(-negativeMarks) : 0;
  return {
    autoScore: score,
    manualScore: null,
    finalScore: score,
    pendingManual: false,
  };
};

/**
 * Aggregates final scores into clamped totalScore, percentage, and overall gradingStatus.
 */
export const computeAttemptTotals = (grades, maxScore, paper = []) => {
  const sum = grades.reduce((acc, g) => acc + (g.finalScore ?? 0), 0);
  const totalScore = Math.max(0, round2(sum));
  const percentage = maxScore > 0 ? round2((totalScore / maxScore) * 100) : 0;

  const paperTypeByQ = new Map(paper.map((item) => [String(item.questionId), item.type]));
  const hasPendingManual = grades.some((g) => {
    const qType = paperTypeByQ.get(String(g.questionId));
    const isWritten = qType ? qType === 'written' : g.autoScore === null;
    return isWritten && (g.manualScore === null || g.manualScore === undefined);
  });

  return {
    totalScore,
    percentage,
    gradingStatus: hasPendingManual ? 'pending_manual' : 'complete',
  };
};
