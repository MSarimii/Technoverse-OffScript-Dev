import Attempt from '../models/Attempt.js';
import Enrollment, { serializeEnrollment } from '../models/Enrollment.js';
import Exam from '../models/Exam.js';
import User, { serializeUser } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { resolveExamStatus } from '../utils/examStatus.js';
import { escapeRegex } from '../utils/sanitize.js';
import { assertExamAccess } from './examService.js';

/**
 * Lists enrollments for an exam with populated candidate summaries.
 */
export const listEnrollments = async ({ user, examId, query }) => {
  const exam = await Exam.findById(examId);
  assertExamAccess(exam, user);

  const filter = { examId: exam._id };
  if (query.status) {
    filter.status = query.status;
  }

  const docs = await Enrollment.find(filter).populate('userId').sort({ createdAt: -1 });
  return { enrollments: docs.map(serializeEnrollment) };
};

/**
 * Idempotently enrolls active candidate users (by userIds and/or emails) into an exam.
 */
export const enrollCandidates = async ({ user, examId, payload }) => {
  const exam = await Exam.findById(examId);
  assertExamAccess(exam, user);

  const effective = resolveExamStatus(exam);
  if (effective === 'cancelled' || effective === 'completed') {
    throw new ApiError(409, 'CONFLICT', `Cannot enroll candidates in an exam with status '${effective}'`);
  }

  const requestedIds = [...new Set((payload.userIds || []).map(String))];
  const requestedEmails = [...new Set((payload.emails || []).map((email) => email.trim().toLowerCase()))];

  const orClauses = [];
  if (requestedIds.length > 0) orClauses.push({ _id: { $in: requestedIds } });
  if (requestedEmails.length > 0) orClauses.push({ email: { $in: requestedEmails } });

  const matchedUsers = await User.find({ $or: orClauses });
  const byId = new Map(matchedUsers.map((u) => [String(u._id), u]));
  const byEmail = new Map(matchedUsers.map((u) => [u.email.toLowerCase(), u]));

  const missingIds = requestedIds.filter((id) => !byId.has(id));
  const missingEmails = requestedEmails.filter((email) => !byEmail.has(email));
  if (missingIds.length > 0 || missingEmails.length > 0) {
    throw new ApiError(400, 'BAD_REQUEST', 'One or more specified users do not exist');
  }

  const uniqueCandidates = new Map();
  for (const id of requestedIds) {
    const candidate = byId.get(id);
    uniqueCandidates.set(String(candidate._id), candidate);
  }
  for (const email of requestedEmails) {
    const candidate = byEmail.get(email);
    uniqueCandidates.set(String(candidate._id), candidate);
  }

  for (const candidate of uniqueCandidates.values()) {
    if (candidate.role !== 'candidate') {
      throw new ApiError(400, 'BAD_REQUEST', `User ${candidate.email} is not a candidate`);
    }
    if (!candidate.isActive) {
      throw new ApiError(400, 'BAD_REQUEST', `Candidate ${candidate.email} is inactive`);
    }
  }

  const candidateIds = [...uniqueCandidates.keys()];
  const existingDocs = await Enrollment.find({
    examId: exam._id,
    userId: { $in: candidateIds },
  });
  const existingMap = new Map(existingDocs.map((doc) => [String(doc.userId), doc]));

  let enrolledCount = 0;
  let alreadyEnrolledCount = 0;

  for (const candidateId of candidateIds) {
    const existing = existingMap.get(candidateId);
    if (existing) {
      if (existing.status === 'active') {
        alreadyEnrolledCount += 1;
      } else {
        existing.status = 'active';
        existing.enrolledBy = user._id;
        await existing.save();
        enrolledCount += 1;
      }
    } else {
      await Enrollment.create({
        examId: exam._id,
        userId: candidateId,
        enrolledBy: user._id,
        status: 'active',
      });
      enrolledCount += 1;
    }
  }

  const updatedDocs = await Enrollment.find({
    examId: exam._id,
    userId: { $in: candidateIds },
  })
    .populate('userId')
    .sort({ createdAt: -1 });

  return {
    enrolledCount,
    alreadyEnrolledCount,
    enrollments: updatedDocs.map(serializeEnrollment),
  };
};

/**
 * Soft-removes an enrollment by marking its status as 'removed'.
 */
export const removeEnrollment = async ({ user, examId, userId }) => {
  const exam = await Exam.findById(examId);
  assertExamAccess(exam, user);

  const enrollment = await Enrollment.findOne({ examId: exam._id, userId }).populate('userId');
  if (!enrollment) {
    throw new ApiError(404, 'NOT_FOUND', 'Enrollment not found');
  }

  const startedAttempt = await Attempt.exists({ examId: exam._id, userId, isSandbox: false });
  if (startedAttempt) {
    throw new ApiError(409, 'CONFLICT', 'Cannot remove a candidate who has already started this exam');
  }

  enrollment.status = 'removed';
  await enrollment.save();

  return { enrollment: serializeEnrollment(enrollment) };
};

/**
 * Searches active candidate accounts for enrollment selection.
 */
export const searchCandidates = async ({ query }) => {
  const { q, page = 1, limit = 20 } = query;
  const filter = { role: 'candidate', isActive: true };

  if (q && q.trim() !== '') {
    const regex = new RegExp(escapeRegex(q.trim()), 'i');
    filter.$or = [{ name: regex }, { email: regex }, { rollNo: regex }];
  }

  const skip = (page - 1) * limit;
  const [docs, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);

  return {
    candidates: docs.map(serializeUser),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
};
