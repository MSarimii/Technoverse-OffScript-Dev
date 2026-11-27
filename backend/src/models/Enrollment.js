import mongoose from 'mongoose';
import { serializeUser } from './User.js';

const enrollmentSchema = new mongoose.Schema(
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
    enrolledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'removed'],
      default: 'active',
    },
  },
  {
    timestamps: true,
  }
);

enrollmentSchema.index({ examId: 1, userId: 1 }, { unique: true });
enrollmentSchema.index({ userId: 1 });

/**
 * Serializes an Enrollment record and optionally formats a populated userId into a safe candidate DTO.
 */
export const serializeEnrollment = (enrollment) => {
  const populatedUser =
    enrollment.userId && typeof enrollment.userId === 'object' && enrollment.userId.email
      ? serializeUser(enrollment.userId)
      : undefined;

  return {
    id: String(enrollment._id ?? enrollment.id),
    examId: String(enrollment.examId),
    userId: populatedUser ? populatedUser.id : String(enrollment.userId),
    enrolledBy: String(enrollment.enrolledBy),
    status: enrollment.status,
    ...(populatedUser ? { candidate: populatedUser } : {}),
    createdAt: enrollment.createdAt,
    updatedAt: enrollment.updatedAt,
  };
};

export default mongoose.model('Enrollment', enrollmentSchema);
