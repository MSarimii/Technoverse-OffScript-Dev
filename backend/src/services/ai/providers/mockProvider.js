/**
 * mockProvider.js — Deterministic Offline Mock AI Provider
 * Fully offline, reproducible keyword-coverage evaluation against the rubric.
 * Zero network dependencies and zero randomness.
 */

import { getAiConfig } from '../config.js';

const DISCLAIMER_TEXT = 'Suggestion only. The examiner decides.';

/**
 * Extracts normalized, unique keywords (length > 3) from rubric text.
 * @param {string} rubric
 * @returns {string[]}
 */
function extractKeywords(rubric) {
  return [
    ...new Set(
      String(rubric || '')
        .toLowerCase()
        .split(/\W+/)
        .filter((w) => w.length > 3)
    ),
  ];
}

/**
 * Clamps marks to [0, maxMarks] and rounds to nearest 0.5.
 * @param {number} val
 * @param {number} max
 * @returns {number}
 */
export function clampAndRound(val, max) {
  const numericVal = Number(val) || 0;
  const clamped = Math.min(Math.max(numericVal, 0), Number(max));
  return Math.round(clamped * 2) / 2;
}

/**
 * Generates a mock grading suggestion using deterministic keyword matching.
 *
 * @param {Object} params
 * @param {string} params.questionText
 * @param {string} params.rubric
 * @param {number} params.maxMarks
 * @param {string} params.answerText
 * @param {boolean} [params.wasTruncated]
 * @returns {Promise<{ suggestion: Object, meta: Object }>}
 */
export async function suggestGrade({ questionText, rubric, maxMarks, answerText, wasTruncated }) {
  const config = getAiConfig();
  const keywords = extractKeywords(rubric);
  const normalizedAnswer = String(answerText || '').toLowerCase();

  const matched = keywords.filter((kw) => normalizedAnswer.includes(kw));
  const missing = keywords.filter((kw) => !normalizedAnswer.includes(kw));
  const coverage = keywords.length > 0 ? matched.length / keywords.length : 0;

  const rawMarks = coverage * maxMarks;
  const suggestedMarks = clampAndRound(rawMarks, maxMarks);

  let confidence = 'low';
  if (coverage >= 0.7) confidence = 'high';
  else if (coverage >= 0.4) confidence = 'medium';

  let rationale = `Mock heuristic: answer covers ${matched.length}/${keywords.length} rubric keywords (${Math.round(coverage * 100)}%). No live AI was used.`;
  if (wasTruncated) {
    rationale = `[Truncated] ${rationale}`;
  }
  rationale = rationale.slice(0, 400);

  return {
    suggestion: {
      suggestedMarks,
      maxMarks,
      matchedPoints: matched.map((kw) => `Mentioned: "${kw}"`),
      missingPoints: missing.map((kw) => `Missing: "${kw}"`),
      rationale,
      confidence,
    },
    meta: {
      source: 'mock',
      model: `${config.model} (mock)`,
      cached: false,
      disclaimer: DISCLAIMER_TEXT,
    },
  };
}

/**
 * Returns mock connection health status.
 * @returns {Promise<{ ok: boolean, source: string, model: string, latencyMs: number }>}
 */
export async function testConnection() {
  const config = getAiConfig();
  return {
    ok: true,
    source: 'mock',
    model: `${config.model} (mock)`,
    latencyMs: 1,
  };
}

/**
 * Returns mock draft questions for topic exploration.
 * @param {Object} params
 * @param {string} params.topic
 * @param {string} params.difficulty
 * @param {number} params.count
 * @returns {Promise<{ questions: Array<Object>, meta: Object }>}
 */
export async function suggestQuestions({ topic, difficulty, count }) {
  const config = getAiConfig();
  const safeCount = Math.min(Math.max(Number(count) || 1, 1), 5);

  const questions = Array.from({ length: safeCount }, (_, i) => ({
    type: 'written',
    text: `[MOCK] ${difficulty} question ${i + 1} regarding "${topic}"`,
    marks: 5,
    rubric: `Comprehensive explanation of ${topic} concepts and principles.`,
    options: [],
  }));

  return {
    questions,
    meta: {
      source: 'mock',
      model: `${config.model} (mock)`,
    },
  };
}
