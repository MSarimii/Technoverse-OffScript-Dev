import mongoose from 'mongoose';

const incidentSchema = new mongoose.Schema(
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
    type: {
      type: String,
      enum: [
        'tab_hidden',
        'window_blur',
        'fullscreen_exit',
        'copy_paste',
        'reconnect',
        'multiple_sessions',
        'other',
      ],
      required: true,
    },
    details: {
      type: String,
      trim: true,
      maxlength: [500, 'Incident details cannot exceed 500 characters'],
      default: '',
    },
    occurredAt: {
      type: Date,
      required: true,
    },
    reviewStatus: {
      type: String,
      enum: ['new', 'reviewed', 'dismissed'],
      default: 'new',
    },
    reviewerNote: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { timestamps: true }
);

incidentSchema.index({ examId: 1, occurredAt: -1 });
incidentSchema.index({ attemptId: 1 });

/**
 * Serializes an Incident document cleanly for API responses.
 */
export const serializeIncident = (incident) => ({
  id: String(incident._id ?? incident.id),
  attemptId: String(incident.attemptId),
  examId: String(incident.examId),
  userId: String(incident.userId),
  type: incident.type,
  details: incident.details ?? '',
  occurredAt: incident.occurredAt,
  reviewStatus: incident.reviewStatus,
  reviewerNote: incident.reviewerNote ?? '',
  createdAt: incident.createdAt,
});

export default mongoose.model('Incident', incidentSchema);
