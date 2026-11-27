import mongoose from 'mongoose';

const scoreSnapshotSchema = new mongoose.Schema(
  {
    totalScore: { type: Number, required: true },
    maxScore: { type: Number, required: true },
    percentage: { type: Number, required: true },
  },
  { _id: false }
);

const reportVerificationSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    attemptId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Attempt',
      required: true,
      unique: true,
    },
    examId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Exam',
      required: true,
    },
    scoreSnapshot: {
      type: scoreSnapshotSchema,
      required: true,
    },
    issuedAt: {
      type: Date,
      required: true,
    },
    hmac: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model('ReportVerification', reportVerificationSchema);
