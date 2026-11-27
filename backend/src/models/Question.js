import mongoose from 'mongoose';

const optionSchema = new mongoose.Schema({
  text: {
    type: String,
    required: [true, 'Option text is required'],
    trim: true,
    minlength: [1, 'Option text cannot be empty'],
  },
});

const schemeSchema = new mongoose.Schema(
  {
    mode: {
      type: String,
      enum: ['all_or_nothing', 'partial'],
      default: 'all_or_nothing',
    },
    negativeMarks: {
      type: Number,
      min: [0, 'Negative marks cannot be negative'],
      default: 0,
    },
  },
  { _id: false }
);

const questionSchema = new mongoose.Schema(
  {
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['single', 'multiple', 'written'],
      required: true,
    },
    text: {
      type: String,
      required: [true, 'Question text is required'],
      trim: true,
      minlength: [3, 'Question text must be at least 3 characters'],
    },
    options: {
      type: [optionSchema],
      default: [],
    },
    correctOptionIds: {
      type: [mongoose.Schema.Types.ObjectId],
      select: false,
      default: [],
    },
    topic: {
      type: String,
      required: [true, 'Topic is required'],
      trim: true,
    },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      required: true,
    },
    marks: {
      type: Number,
      required: [true, 'Marks are required'],
      min: [0.25, 'Marks must be at least 0.25'],
    },
    scheme: {
      type: schemeSchema,
      default: () => ({ mode: 'all_or_nothing', negativeMarks: 0 }),
    },
    rubric: {
      type: String,
      trim: true,
      default: '',
    },
    explanation: {
      type: String,
      trim: true,
      default: '',
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

questionSchema.index({ createdBy: 1, topic: 1, difficulty: 1 });
questionSchema.index({ text: 'text' });
questionSchema.index({ isArchived: 1 });

/**
 * Serializes a Question document for examiner/admin endpoints (includes answer keys and rubric).
 */
export const serializeQuestion = (question) => ({
  id: String(question._id ?? question.id),
  createdBy: String(question.createdBy),
  type: question.type,
  text: question.text,
  options: (question.options || []).map((opt) => ({
    id: String(opt._id),
    text: opt.text,
  })),
  correctOptionIds: (question.correctOptionIds || []).map(String),
  topic: question.topic,
  difficulty: question.difficulty,
  marks: question.marks,
  scheme: {
    mode: question.scheme?.mode ?? 'all_or_nothing',
    negativeMarks: question.scheme?.negativeMarks ?? 0,
  },
  rubric: question.rubric ?? '',
  explanation: question.explanation ?? '',
  isArchived: Boolean(question.isArchived),
  createdAt: question.createdAt,
  updatedAt: question.updatedAt,
});

export default mongoose.model('Question', questionSchema);
