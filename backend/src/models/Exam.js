import mongoose from 'mongoose';
import { resolveExamStatus } from '../utils/examStatus.js';

const examSettingsSchema = new mongoose.Schema(
  {
    shuffleQuestions: { type: Boolean, default: false },
    shuffleOptions: { type: Boolean, default: false },
    showScoreImmediately: { type: Boolean, default: false },
    allowLateStart: { type: Boolean, default: true },
    strictEnd: { type: Boolean, default: true },
    negativeMarkingEnabled: { type: Boolean, default: false },
  },
  { _id: false }
);

const examQuestionRefSchema = new mongoose.Schema(
  {
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question',
      required: true,
    },
    marks: {
      type: Number,
      required: true,
      min: [0.25, 'Question marks must be at least 0.25'],
    },
    order: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

const blueprintSchema = new mongoose.Schema(
  {
    easy: { type: Number, min: 0, default: 0 },
    medium: { type: Number, min: 0, default: 0 },
    hard: { type: Number, min: 0, default: 0 },
    poolMode: { type: Boolean, default: false },
  },
  { _id: false }
);

const examSchema = new mongoose.Schema(
  {
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Exam title is required'],
      trim: true,
      minlength: [3, 'Exam title must be at least 3 characters'],
      maxlength: [150, 'Exam title cannot exceed 150 characters'],
    },
    instructions: {
      type: String,
      trim: true,
      default: '',
    },
    startAt: {
      type: Date,
      required: [true, 'Start time is required'],
    },
    endAt: {
      type: Date,
      required: [true, 'End time is required'],
    },
    durationMinutes: {
      type: Number,
      required: [true, 'Duration is required'],
      min: [1, 'Duration must be at least 1 minute'],
    },
    totalMarks: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ['draft', 'published', 'completed', 'cancelled'],
      default: 'draft',
    },
    settings: {
      type: examSettingsSchema,
      default: () => ({}),
    },
    questions: {
      type: [examQuestionRefSchema],
      default: [],
    },
    blueprint: {
      type: blueprintSchema,
      default: () => ({}),
    },
    resultsPublished: {
      type: Boolean,
      default: false,
    },
    resultsPublishedAt: {
      type: Date,
      default: null,
    },
    publishedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

examSchema.index({ createdBy: 1, status: 1 });
examSchema.index({ startAt: 1, endAt: 1 });
examSchema.index({ status: 1 });

/**
 * Serializes an Exam document for examiner/admin endpoints with computed effectiveStatus.
 */
export const serializeExam = (exam, { currentTime, enrolledCount } = {}) => {
  const settingsObj = exam.settings?.toObject?.() ?? exam.settings ?? {};
  const blueprintObj = exam.blueprint?.toObject?.() ?? exam.blueprint ?? {};
  const questions = (exam.questions || []).map((q) => ({
    questionId: String(q.questionId),
    marks: q.marks,
    order: q.order,
  }));

  const dto = {
    id: String(exam._id ?? exam.id),
    createdBy: String(exam.createdBy),
    title: exam.title,
    instructions: exam.instructions ?? '',
    startAt: exam.startAt,
    endAt: exam.endAt,
    durationMinutes: exam.durationMinutes,
    totalMarks: exam.totalMarks ?? 0,
    status: exam.status,
    effectiveStatus: resolveExamStatus(exam, currentTime),
    settings: {
      shuffleQuestions: Boolean(settingsObj.shuffleQuestions),
      shuffleOptions: Boolean(settingsObj.shuffleOptions),
      showScoreImmediately: Boolean(settingsObj.showScoreImmediately),
      allowLateStart: settingsObj.allowLateStart ?? true,
      strictEnd: settingsObj.strictEnd ?? true,
      negativeMarkingEnabled: Boolean(settingsObj.negativeMarkingEnabled),
    },
    questions,
    questionCount: questions.length,
    blueprint: {
      easy: blueprintObj.easy ?? 0,
      medium: blueprintObj.medium ?? 0,
      hard: blueprintObj.hard ?? 0,
      poolMode: Boolean(blueprintObj.poolMode),
    },
    resultsPublished: Boolean(exam.resultsPublished),
    resultsPublishedAt: exam.resultsPublishedAt ?? null,
    publishedAt: exam.publishedAt ?? null,
    createdAt: exam.createdAt,
    updatedAt: exam.updatedAt,
  };

  if (enrolledCount !== undefined) {
    dto.enrolledCount = enrolledCount;
  }

  return dto;
};

export default mongoose.model('Exam', examSchema);
