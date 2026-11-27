import mongoose from 'mongoose';

const announcementSchema = new mongoose.Schema(
  {
    examId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Exam',
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    message: {
      type: String,
      required: [true, 'Announcement message is required'],
      trim: true,
      minlength: [1, 'Announcement message cannot be empty'],
      maxlength: [500, 'Announcement message cannot exceed 500 characters'],
    },
  },
  { timestamps: true }
);

announcementSchema.index({ examId: 1, createdAt: -1 });

/**
 * Serializes an Announcement document cleanly for API and heartbeat responses.
 */
export const serializeAnnouncement = (doc) => ({
  id: String(doc._id ?? doc.id),
  examId: String(doc.examId),
  createdBy: String(doc.createdBy),
  message: doc.message,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
});

export default mongoose.model('Announcement', announcementSchema);
