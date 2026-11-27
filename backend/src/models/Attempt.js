import mongoose from 'mongoose';
import { now } from '../utils/time.js';

const paperOptionSchema = new mongoose.Schema(
  {
    optionId: { type: mongoose.Schema.Types.ObjectId, required: true },
    text: { type: String, required: true },
  },
  { _id: false }
);

const paperSchemeSchema = new mongoose.Schema(
  {
    mode: {
      type: String,
      enum: ['all_or_nothing', 'partial'],
      default: 'all_or_nothing',
    },
    negativeMarks: {
      type: Number,
      min: 0,
      default: 0,
    },
  },
  { _id: false }
);

const paperItemSchema = new mongoose.Schema(
  {
    questionId: { type: mongoose.Schema.Types.ObjectId, required: true },
    type: { type: String, enum: ['single', 'multiple', 'written'], required: true },
    text: { type: String, required: true },
    marks: { type: Number, required: true, min: 0.25 },
    scheme: { type: paperSchemeSchema, default: () => ({}) },
    optionOrder: { type: [paperOptionSchema], default: [] },
    correctOptionIds: {
      type: [mongoose.Schema.Types.ObjectId],
      select: false,
      default: [],
    },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], required: true },
    topic: { type: String, required: true },
  },
  { _id: false }
);

const answerItemSchema = new mongoose.Schema(
  {
    questionId: { type: mongoose.Schema.Types.ObjectId, required: true },
    selectedOptionIds: { type: [mongoose.Schema.Types.ObjectId], default: [] },
    text: { type: String, default: '' },
    markedForReview: { type: Boolean, default: false },
    seq: { type: Number, required: true, min: 0 },
    savedAt: { type: Date, required: true },
  },
  { _id: false }
);

const connectionGapSchema = new mongoose.Schema(
  {
    from: { type: Date, required: true },
    to: { type: Date, required: true },
  },
  { _id: false }
);

const gradeItemSchema = new mongoose.Schema(
  {
    questionId: { type: mongoose.Schema.Types.ObjectId, required: true },
    autoScore: { type: Number, default: 0 },
    manualScore: { type: Number, default: null },
    finalScore: { type: Number, default: 0 },
    maxMarks: { type: Number, required: true },
    graderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    feedback: { type: String, default: '' },
    gradedAt: { type: Date, default: null },
  },
  { _id: false }
);

const attemptSchema = new mongoose.Schema(
  {
    examId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Exam',
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    isSandbox: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ['in_progress', 'submitted', 'expired', 'graded'],
      default: 'in_progress',
    },
    startedAt: { type: Date, required: true },
    deadlineAt: { type: Date, required: true },
    submittedAt: { type: Date, default: null },
    finalizedBy: {
      type: String,
      enum: ['candidate', 'expiry', 'examiner', null],
      default: null,
    },
    paper: { type: [paperItemSchema], default: [] },
    paperFingerprint: { type: String, default: '' },
    paperDifficultyIndex: { type: Number, default: 0 },
    answers: { type: [answerItemSchema], default: [] },
    scratchpad: { type: String, default: '' },
    activeSessionId: { type: String, default: null, select: false },
    lastHeartbeatAt: { type: Date, default: null },
    connectionGaps: { type: [connectionGapSchema], default: [] },
    grades: { type: [gradeItemSchema], default: [] },
    totalScore: { type: Number, default: 0 },
    maxScore: { type: Number, default: 0 },
    percentage: { type: Number, default: 0 },
    gradingStatus: {
      type: String,
      enum: ['pending', 'auto_done', 'pending_manual', 'complete'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

attemptSchema.index(
  { examId: 1, userId: 1 },
  { unique: true, partialFilterExpression: { isSandbox: false } }
);
attemptSchema.index({ examId: 1, status: 1 });
attemptSchema.index({ status: 1, deadlineAt: 1 });
attemptSchema.index({ userId: 1 });

/**
 * Serializes an Attempt exclusively with candidate-safe fields (never exposes answer keys).
 */
export const serializeAttemptForCandidate = (attempt, currentTime = now()) => {
  const serverNow = new Date(currentTime);
  const remainingMs =
    attempt.status === 'in_progress'
      ? Math.max(0, new Date(attempt.deadlineAt).getTime() - serverNow.getTime())
      : 0;

  return {
    id: String(attempt._id ?? attempt.id),
    examId: String(attempt.examId),
    isSandbox: Boolean(attempt.isSandbox),
    status: attempt.status,
    startedAt: attempt.startedAt,
    deadlineAt: attempt.deadlineAt,
    submittedAt: attempt.submittedAt ?? null,
    serverNow,
    remainingMs,
    paper: (attempt.paper || []).map((item) => ({
      id: String(item.questionId),
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
    scratchpad: attempt.scratchpad ?? '',
    lastHeartbeatAt: attempt.lastHeartbeatAt ?? null,
    ...(attempt.isSandbox && attempt.status !== 'in_progress'
      ? {
          gradingStatus: attempt.gradingStatus,
          totalScore: attempt.totalScore ?? 0,
          maxScore: attempt.maxScore ?? 0,
          percentage: attempt.percentage ?? 0,
        }
      : {}),
  };
};

export default mongoose.model('Attempt', attemptSchema);
