import Announcement, { serializeAnnouncement } from '../models/Announcement.js';
import Attempt from '../models/Attempt.js';
import AuditLog from '../models/AuditLog.js';
import Enrollment from '../models/Enrollment.js';
import Exam from '../models/Exam.js';
import Incident, { serializeIncident } from '../models/Incident.js';
import { ApiError } from '../utils/ApiError.js';
import { now } from '../utils/time.js';
import { sweepExamOverdueAttempts } from './attemptSweeper.js';
import { assertExamAccess } from './examService.js';

/**
 * Returns live per-candidate session progress, remaining time, heartbeats, and indicator counts for an exam.
 */
export const getExamMonitor = async ({ user, examId }) => {
  const exam = await Exam.findById(examId);
  assertExamAccess(exam, user);

  const currentTime = now();
  await sweepExamOverdueAttempts(exam._id, currentTime);

  const [attempts, incidentCounts] = await Promise.all([
    Attempt.find({ examId: exam._id, isSandbox: false })
      .populate('userId', 'name email rollNo')
      .sort({ startedAt: -1 })
      .lean(),
    Incident.aggregate([
      { $match: { examId: exam._id } },
      { $group: { _id: '$attemptId', count: { $sum: 1 } } },
    ]),
  ]);

  const incidentMap = new Map(incidentCounts.map((row) => [String(row._id), row.count]));
  const currentMs = new Date(currentTime).getTime();

  return {
    examId: String(exam._id),
    serverNow: currentTime,
    attempts: attempts.map((a) => {
      const remainingMs =
        a.status === 'in_progress'
          ? Math.max(0, new Date(a.deadlineAt).getTime() - currentMs)
          : 0;
      const cand = a.userId && typeof a.userId === 'object' && a.userId.email ? a.userId : null;

      return {
        attemptId: String(a._id),
        userId: cand ? String(cand._id) : String(a.userId),
        ...(cand
          ? {
              candidate: {
                id: String(cand._id),
                name: cand.name,
                email: cand.email,
                ...(cand.rollNo !== undefined ? { rollNo: cand.rollNo } : {}),
              },
            }
          : {}),
        status: a.status,
        gradingStatus: a.gradingStatus,
        answeredCount: (a.answers || []).length,
        totalQuestions: (a.paper || []).length,
        remainingMs,
        startedAt: a.startedAt,
        deadlineAt: a.deadlineAt,
        submittedAt: a.submittedAt ?? null,
        lastHeartbeatAt: a.lastHeartbeatAt ?? null,
        connectionGapCount: a.connectionGaps?.length || 0,
        incidentCount: incidentMap.get(String(a._id)) ?? 0,
        totalScore: a.totalScore ?? 0,
      };
    }),
  };
};

/**
 * Lists recorded session event indicators for an exam with optional filters.
 */
export const listExamIncidents = async ({ user, examId, query }) => {
  const exam = await Exam.findById(examId);
  assertExamAccess(exam, user);

  const realAttemptIds = await Attempt.find({ examId: exam._id, isSandbox: false }).distinct('_id');
  const filter = { examId: exam._id, attemptId: { $in: realAttemptIds } };
  if (query.type) filter.type = query.type;
  if (query.reviewStatus) filter.reviewStatus = query.reviewStatus;
  if (query.userId) filter.userId = query.userId;

  const docs = await Incident.find(filter).sort({ occurredAt: -1 }).lean();
  return {
    incidents: docs.map(serializeIncident),
  };
};

/**
 * Updates review status and neutral reviewer notes on a recorded event indicator.
 */
export const reviewIncident = async ({ user, incidentId, reviewStatus, reviewerNote }) => {
  const incident = await Incident.findById(incidentId);
  if (!incident) {
    throw new ApiError(404, 'NOT_FOUND', 'Incident record not found');
  }

  const exam = await Exam.findById(incident.examId);
  assertExamAccess(exam, user);

  incident.reviewStatus = reviewStatus;
  if (reviewerNote !== undefined) {
    incident.reviewerNote = reviewerNote;
  }
  await incident.save();

  await AuditLog.create({
    actorId: user._id,
    action: 'review_incident',
    entityType: 'Incident',
    entityId: incident._id,
    meta: { examId: exam._id, reviewStatus },
    at: now(),
  });

  return { incident: serializeIncident(incident) };
};

/**
 * Broadcasts an examiner/admin announcement to candidates taking an exam.
 */
export const createAnnouncement = async ({ user, examId, message }) => {
  const exam = await Exam.findById(examId);
  assertExamAccess(exam, user);

  const doc = await Announcement.create({
    examId: exam._id,
    createdBy: user._id,
    message,
  });

  return { announcement: serializeAnnouncement(doc) };
};

/**
 * Lists announcements for an exam owner/admin or actively enrolled candidate.
 */
export const listAnnouncements = async ({ user, examId }) => {
  const exam = await Exam.findById(examId);
  if (!exam) {
    throw new ApiError(404, 'NOT_FOUND', 'Exam not found');
  }

  if (user.role === 'candidate') {
    const enrolled = await Enrollment.exists({
      examId: exam._id,
      userId: user._id,
      status: 'active',
    });
    if (!enrolled) {
      throw new ApiError(403, 'NOT_ENROLLED', 'You are not enrolled in this exam');
    }
  } else {
    assertExamAccess(exam, user);
  }

  const docs = await Announcement.find({ examId: exam._id }).sort({ createdAt: -1 }).lean();
  return {
    announcements: docs.map(serializeAnnouncement),
  };
};
