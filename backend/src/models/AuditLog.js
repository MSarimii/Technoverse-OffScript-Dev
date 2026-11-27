import mongoose from 'mongoose';
import { now } from '../utils/time.js';

const auditLogSchema = new mongoose.Schema({
  actorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  action: {
    type: String,
    required: true,
    trim: true,
  },
  entityType: {
    type: String,
    required: true,
    trim: true,
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  meta: {
    type: Object,
    default: {},
  },
  at: {
    type: Date,
    default: () => now(),
  },
});

auditLogSchema.index({ entityType: 1, entityId: 1 });

export default mongoose.model('AuditLog', auditLogSchema);
