import mongoose from 'mongoose';

const disputeSchema = new mongoose.Schema(
  {
    attemptId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Attempt',
      required: true,
    },
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
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    reason: {
      type: String,
      required: [true, 'Dispute reason is required'],
      trim: true,
      minlength: [5, 'Dispute reason must be at least 5 characters'],
      maxlength: [1000, 'Dispute reason cannot exceed 1000 characters'],
    },
    status: {
      type: String,
      enum: ['open', 'under_review', 'accepted', 'rejected'],
      default: 'open',
    },
    resolutionNote: {
      type: String,
      trim: true,
      default: '',
    },
    adjustedScore: {
      type: Number,
      default: null,
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

disputeSchema.index({ attemptId: 1, questionId: 1 }, { unique: true });
disputeSchema.index({ examId: 1, status: 1 });

/**
 * Serializes a Dispute document into a clean API response object.
 */
export const serializeDispute = (doc) => {
  const userObj = doc.userId && typeof doc.userId === 'object' && doc.userId.email ? doc.userId : null;
  return {
    id: String(doc._id ?? doc.id),
    attemptId: String(doc.attemptId?._id ?? doc.attemptId),
    examId: String(doc.examId),
    userId: userObj ? String(userObj._id) : String(doc.userId),
    ...(userObj
      ? {
          candidate: {
            id: String(userObj._id),
            name: userObj.name,
            email: userObj.email,
            ...(userObj.rollNo !== undefined ? { rollNo: userObj.rollNo } : {}),
          },
        }
      : {}),
    questionId: String(doc.questionId),
    reason: doc.reason,
    status: doc.status,
    resolutionNote: doc.resolutionNote ?? '',
    adjustedScore: doc.adjustedScore ?? null,
    resolvedBy: doc.resolvedBy ? String(doc.resolvedBy) : null,
    resolvedAt: doc.resolvedAt ?? null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
};

export default mongoose.model('Dispute', disputeSchema);
