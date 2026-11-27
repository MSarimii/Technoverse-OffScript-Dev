import Announcement from '../models/Announcement.js';
import Attempt, { serializeAttemptForCandidate } from '../models/Attempt.js';
import Enrollment from '../models/Enrollment.js';
import Exam from '../models/Exam.js';
import Incident, { serializeIncident } from '../models/Incident.js';
import Question from '../models/Question.js';
import { ApiError } from '../utils/ApiError.js';
import { resolveExamStatus } from '../utils/examStatus.js';
import { buildFrozenPaper } from '../utils/paperBuilder.js';
import { now } from '../utils/time.js';
import { autoGradeAttempt } from './autoGrader.js';
import { assertExamAccess } from './examService.js';

const CONNECTION_GAP_THRESHOLD_MS = 60 * 1000;
const MAX_INCIDENTS_PER_ATTEMPT = 50;

const getOwnedAttempt = async (attemptId, user, { includeSession = false } = {}) => {
  const query = Attempt.findById(attemptId);
  if (includeSession) {
    query.select('+activeSessionId');
  }
  const attempt = await query;
  if (!attempt) {
    throw new ApiError(404, 'NOT_FOUND', 'Attempt not found');
  }
  if (!attempt.isSandbox) {
    if (user.role !== 'candidate' || !attempt.userId.equals(user._id)) {
      throw new ApiError(403, 'FORBIDDEN', 'You do not have permission to access this attempt');
    }
  } else if (user.role !== 'admin' && !attempt.userId.equals(user._id)) {
    throw new ApiError(
      403,
      'FORBIDDEN',
      'You do not have permission to access this sandbox attempt'
    );
  }
  return attempt;
};

const syncAttemptSession = async (attempt, sessionId, currentTime) => {
  if (!sessionId || attempt.isSandbox || attempt.status !== 'in_progress') {
    return false;
  }
  if (!attempt.activeSessionId) {
    attempt.activeSessionId = sessionId;
    return true;
  }
  if (attempt.activeSessionId !== sessionId) {
    attempt.activeSessionId = sessionId;
    const existingCount = await Incident.countDocuments({ attemptId: attempt._id });
    if (existingCount < MAX_INCIDENTS_PER_ATTEMPT) {
      await Incident.create({
        attemptId: attempt._id,
        examId: attempt.examId,
        userId: attempt.userId,
        type: 'multiple_sessions',
        details: 'Session switched to another tab or device',
        occurredAt: currentTime,
      });
    }
    return true;
  }
  return false;
};

/**
 * Atomically transitions an in_progress attempt to submitted or expired exactly once, then auto-grades it.
 */
export const finalizeAttempt = async (attemptId, finalizedBy = 'candidate', currentTime = now()) => {
  const nextStatus = finalizedBy === 'expiry' ? 'expired' : 'submitted';
  const updated = await Attempt.findOneAndUpdate(
    { _id: attemptId, status: 'in_progress' },
    {
      $set: {
        status: nextStatus,
        submittedAt: currentTime,
        finalizedBy,
      },
    },
    { new: true }
  );

  if (updated) {
    return autoGradeAttempt(updated._id);
  }
  return null;
};

const applyLazyExpiry = async (attempt, currentTime = now()) => {
  if (
    attempt.status === 'in_progress' &&
    new Date(currentTime).getTime() >= new Date(attempt.deadlineAt).getTime()
  ) {
    const updated = await finalizeAttempt(attempt._id, 'expiry', currentTime);
    return {
      attempt: updated || (await Attempt.findById(attempt._id)),
      expiredNow: true,
    };
  }
  return { attempt, expiredNow: false };
};

const resolveCandidateAccess = (exam, attempt, currentTime) => {
  const effectiveStatus = resolveExamStatus(exam, currentTime);

  if (exam.status === 'cancelled' || effectiveStatus === 'cancelled') {
    return {
      effectiveStatus,
      accessStatus: 'cancelled',
      accessReason: 'This exam has been cancelled',
    };
  }

  if (attempt) {
    if (attempt.status === 'in_progress') {
      if (new Date(currentTime).getTime() >= new Date(attempt.deadlineAt).getTime()) {
        return {
          effectiveStatus,
          accessStatus: 'expired',
          accessReason: 'Your attempt time has expired',
        };
      }
      return {
        effectiveStatus,
        accessStatus: 'in_progress',
        accessReason: 'Resume your active attempt',
      };
    }

    if (attempt.status === 'expired') {
      return {
        effectiveStatus,
        accessStatus: 'expired',
        accessReason: 'Your attempt time expired',
      };
    }

    return {
      effectiveStatus,
      accessStatus: 'submitted',
      accessReason: 'Your attempt has been submitted',
    };
  }

  if (exam.status !== 'published' || effectiveStatus === 'draft') {
    return {
      effectiveStatus,
      accessStatus: 'upcoming',
      accessReason: 'Exam is not published yet',
    };
  }

  if (effectiveStatus === 'published') {
    return {
      effectiveStatus,
      accessStatus: 'upcoming',
      accessReason: 'Exam has not started yet',
    };
  }

  if (effectiveStatus === 'completed') {
    return {
      effectiveStatus,
      accessStatus: 'closed',
      accessReason: 'Exam window has closed',
    };
  }

  return {
    effectiveStatus,
    accessStatus: 'ready',
    accessReason: 'Exam is open and ready to start',
  };
};

const serializeCandidateExamSummary = (exam, attempt, currentTime) => {
  const access = resolveCandidateAccess(exam, attempt, currentTime);
  return {
    id: String(exam._id),
    title: exam.title,
    instructions: exam.instructions ?? '',
    startAt: exam.startAt,
    endAt: exam.endAt,
    durationMinutes: exam.durationMinutes,
    totalMarks: exam.totalMarks ?? 0,
    questionCount: (exam.questions || []).length,
    status: access.effectiveStatus,
    effectiveStatus: access.effectiveStatus,
    accessStatus: access.accessStatus,
    accessReason: access.accessReason,
    attemptId: attempt ? String(attempt._id) : null,
    attemptStatus: attempt?.status ?? null,
    deadlineAt: attempt?.deadlineAt ?? null,
    resultsPublished: Boolean(exam.resultsPublished),
  };
};

/**
 * Lists candidate's actively enrolled published/cancelled exams grouped into available, upcoming, and completed buckets.
 */
export const listCandidateExams = async ({ user }) => {
  const currentTime = now();
  const enrollments = await Enrollment.find({ userId: user._id, status: 'active' })
    .select('examId')
    .lean();
  const examIds = enrollments.map((e) => e.examId);

  if (examIds.length === 0) {
    return { available: [], upcoming: [], completed: [], serverNow: currentTime };
  }

  const [exams, attempts] = await Promise.all([
    Exam.find({ _id: { $in: examIds }, status: { $ne: 'draft' } })
      .sort({ startAt: 1 })
      .lean(),
    Attempt.find({ examId: { $in: examIds }, userId: user._id, isSandbox: false }).lean(),
  ]);

  const attemptByExam = new Map(attempts.map((a) => [String(a.examId), a]));
  const available = [];
  const upcoming = [];
  const completed = [];

  for (const exam of exams) {
    const attempt = attemptByExam.get(String(exam._id)) || null;
    const summary = serializeCandidateExamSummary(exam, attempt, currentTime);

    if (summary.accessStatus === 'ready' || summary.accessStatus === 'in_progress') {
      available.push(summary);
    } else if (summary.accessStatus === 'upcoming') {
      upcoming.push(summary);
    } else {
      completed.push(summary);
    }
  }

  return {
    available,
    upcoming,
    completed,
    serverNow: currentTime,
  };
};

/**
 * Returns instructions, timing window, and access status for an enrolled candidate (without question items).
 */
export const getCandidateExamDetail = async ({ user, examId }) => {
  const currentTime = now();
  const enrollment = await Enrollment.findOne({ examId, userId: user._id, status: 'active' });
  if (!enrollment) {
    throw new ApiError(403, 'NOT_ENROLLED', 'You are not enrolled in this exam');
  }

  const exam = await Exam.findById(examId).lean();
  if (!exam) {
    throw new ApiError(404, 'NOT_FOUND', 'Exam not found');
  }
  if (exam.status === 'draft') {
    throw new ApiError(409, 'EXAM_NOT_PUBLISHED', 'Exam is not published');
  }

  const attempt = await Attempt.findOne({
    examId: exam._id,
    userId: user._id,
    isSandbox: false,
  }).lean();

  const summary = serializeCandidateExamSummary(exam, attempt, currentTime);

  return {
    exam: {
      ...summary,
      settings: {
        shuffleQuestions: Boolean(exam.settings?.shuffleQuestions),
        shuffleOptions: Boolean(exam.settings?.shuffleOptions),
        showScoreImmediately: Boolean(exam.settings?.showScoreImmediately),
        allowLateStart: exam.settings?.allowLateStart ?? true,
        strictEnd: exam.settings?.strictEnd ?? true,
        negativeMarkingEnabled: Boolean(exam.settings?.negativeMarkingEnabled),
      },
    },
    serverNow: currentTime,
  };
};

/**
 * Idempotently starts a fresh exam attempt (snapshotting questions cleanly) or resumes an active attempt.
 */
export const startOrResumeAttempt = async ({ user, examId, sessionId = null }) => {
  const currentTime = now();
  const enrollment = await Enrollment.findOne({ examId, userId: user._id, status: 'active' });
  if (!enrollment) {
    throw new ApiError(403, 'NOT_ENROLLED', 'You are not enrolled in this exam');
  }

  const exam = await Exam.findById(examId);
  if (!exam) {
    throw new ApiError(404, 'NOT_FOUND', 'Exam not found');
  }
  if (exam.status !== 'published') {
    throw new ApiError(409, 'EXAM_NOT_PUBLISHED', 'Exam is not published');
  }

  const existing = await Attempt.findOne({
    examId: exam._id,
    userId: user._id,
    isSandbox: false,
  }).select('+activeSessionId');
  if (existing) {
    const { attempt: checked } = await applyLazyExpiry(existing, currentTime);
    if (checked.status === 'in_progress') {
      if (await syncAttemptSession(checked, sessionId, currentTime)) {
        await checked.save();
      }
      return { attempt: serializeAttemptForCandidate(checked, currentTime), resumed: true };
    }
    if (checked.status === 'expired') {
      throw new ApiError(409, 'ATTEMPT_EXPIRED', 'Your attempt time has expired');
    }
    throw new ApiError(409, 'ATTEMPT_ALREADY_SUBMITTED', 'You have already submitted this exam');
  }

  const effectiveStatus = resolveExamStatus(exam, currentTime);
  if (effectiveStatus !== 'ongoing') {
    throw new ApiError(409, 'EXAM_NOT_AVAILABLE', 'Exam is not available to start right now');
  }

  const startedAt = new Date(currentTime);
  const durationMs = exam.durationMinutes * 60 * 1000;
  const rawDeadlineMs = startedAt.getTime() + durationMs;
  const deadlineMs =
    exam.settings?.strictEnd !== false
      ? Math.min(rawDeadlineMs, new Date(exam.endAt).getTime())
      : rawDeadlineMs;
  const deadlineAt = new Date(deadlineMs);

  if (deadlineAt.getTime() <= startedAt.getTime()) {
    throw new ApiError(409, 'EXAM_NOT_AVAILABLE', 'Exam window has closed');
  }

  const questionIds = (exam.questions || []).map((q) => q.questionId);
  const questionDocs = await Question.find({ _id: { $in: questionIds } }).select('+correctOptionIds');
  const { paper, paperFingerprint, paperDifficultyIndex, maxScore } = buildFrozenPaper(
    exam,
    questionDocs
  );

  try {
    const created = await Attempt.create({
      examId: exam._id,
      userId: user._id,
      isSandbox: false,
      status: 'in_progress',
      startedAt,
      deadlineAt,
      paper,
      paperFingerprint,
      paperDifficultyIndex,
      maxScore,
      ...(sessionId ? { activeSessionId: sessionId } : {}),
      lastHeartbeatAt: startedAt,
    });
    return { attempt: serializeAttemptForCandidate(created, currentTime), resumed: false };
  } catch (err) {
    if (err?.code === 11000) {
      const raced = await Attempt.findOne({
        examId: exam._id,
        userId: user._id,
        isSandbox: false,
      }).select('+activeSessionId');
      if (raced) {
        const { attempt: checked } = await applyLazyExpiry(raced, currentTime);
        if (checked.status === 'in_progress') {
          if (await syncAttemptSession(checked, sessionId, currentTime)) {
            await checked.save();
          }
          return { attempt: serializeAttemptForCandidate(checked, currentTime), resumed: true };
        }
        if (checked.status === 'expired') {
          throw new ApiError(409, 'ATTEMPT_EXPIRED', 'Your attempt time has expired');
        }
        throw new ApiError(409, 'ATTEMPT_ALREADY_SUBMITTED', 'You have already submitted this exam');
      }
    }
    throw err;
  }
};

/**
 * Fetches an owned candidate attempt after running a lazy server-time expiry check.
 */
export const getAttemptById = async ({ user, attemptId }) => {
  const currentTime = now();
  const owned = await getOwnedAttempt(attemptId, user);
  const { attempt } = await applyLazyExpiry(owned, currentTime);
  return { attempt: serializeAttemptForCandidate(attempt, currentTime) };
};

const assertAttemptMutable = async (
  attemptId,
  user,
  currentTime,
  { includeSession = false } = {}
) => {
  const owned = await getOwnedAttempt(attemptId, user, { includeSession });
  const { attempt } = await applyLazyExpiry(owned, currentTime);

  if (attempt.status === 'expired') {
    throw new ApiError(409, 'ATTEMPT_EXPIRED', 'Attempt time has expired');
  }
  if (attempt.status !== 'in_progress') {
    throw new ApiError(409, 'ATTEMPT_ALREADY_SUBMITTED', 'Attempt has already been finalized');
  }
  return attempt;
};

/**
 * Performs sequence-checked idempotent autosave for candidate answers with bounded offline reconnect grace.
 */
export const autosaveAnswers = async ({
  user,
  attemptId,
  answers,
  offlineBuffered = false,
  clientSavedAt = null,
  sessionId = null,
}) => {
  const currentTime = new Date(now());
  const attempt = await getOwnedAttempt(attemptId, user, {
    includeSession: Boolean(sessionId),
  });

  if (attempt.status === 'expired') {
    throw new ApiError(409, 'ATTEMPT_EXPIRED', 'Attempt time has expired');
  }
  if (attempt.status !== 'in_progress') {
    throw new ApiError(409, 'ATTEMPT_ALREADY_SUBMITTED', 'Attempt has already been finalized');
  }

  const currentMs = currentTime.getTime();
  const deadlineMs = new Date(attempt.deadlineAt).getTime();
  const startedMs = new Date(attempt.startedAt).getTime();
  let finalizedByGrace = false;

  if (currentMs >= deadlineMs) {
    const graceSeconds = Math.max(0, Number(process.env.RECONNECT_GRACE_SECONDS ?? 30));
    const graceMs = graceSeconds * 1000;
    const withinGraceWindow = currentMs - deadlineMs <= graceMs;
    const clientSavedMs = clientSavedAt ? new Date(clientSavedAt).getTime() : NaN;
    const validClientSavedAt =
      !Number.isNaN(clientSavedMs) && clientSavedMs >= startedMs && clientSavedMs <= deadlineMs;
    const lastHeartbeatMs = attempt.lastHeartbeatAt
      ? new Date(attempt.lastHeartbeatAt).getTime()
      : startedMs;
    const validLastHeartbeat = lastHeartbeatMs <= deadlineMs;

    if (offlineBuffered === true && withinGraceWindow && validClientSavedAt && validLastHeartbeat) {
      finalizedByGrace = true;
    } else {
      await finalizeAttempt(attempt._id, 'expiry', currentTime);
      throw new ApiError(409, 'ATTEMPT_EXPIRED', 'Attempt time has expired');
    }
  }

  const paperMap = new Map(attempt.paper.map((item) => [String(item.questionId), item]));
  const answerMap = new Map(attempt.answers.map((ans) => [String(ans.questionId), ans]));

  for (const entry of answers) {
    const paperItem = paperMap.get(entry.questionId);
    if (!paperItem) {
      throw new ApiError(400, 'BAD_REQUEST', `Question ${entry.questionId} does not belong to this attempt`);
    }
    if (entry.selectedOptionIds && entry.selectedOptionIds.length > 0) {
      const validOptions = new Set(paperItem.optionOrder.map((opt) => String(opt.optionId)));
      for (const optId of entry.selectedOptionIds) {
        if (!validOptions.has(optId)) {
          throw new ApiError(400, 'BAD_REQUEST', 'Selected option does not belong to this question');
        }
      }
    }
  }

  const saved = [];
  const rejected = [];

  for (const entry of answers) {
    const existing = answerMap.get(entry.questionId);
    if (existing && entry.seq <= existing.seq) {
      rejected.push({ questionId: entry.questionId, reason: 'STALE_SAVE' });
      continue;
    }

    answerMap.set(entry.questionId, {
      questionId: entry.questionId,
      selectedOptionIds: entry.selectedOptionIds ?? existing?.selectedOptionIds ?? [],
      text: entry.text ?? existing?.text ?? '',
      markedForReview: entry.markedForReview ?? existing?.markedForReview ?? false,
      seq: entry.seq,
      savedAt: finalizedByGrace && clientSavedAt ? new Date(clientSavedAt) : currentTime,
    });
    saved.push(entry.questionId);
  }

  const sessionDirty = await syncAttemptSession(attempt, sessionId, currentTime);
  if (saved.length > 0 || sessionDirty) {
    if (saved.length > 0) {
      attempt.answers = [...answerMap.values()];
    }
    await attempt.save();
  }

  if (finalizedByGrace) {
    await finalizeAttempt(attempt._id, 'expiry', currentTime);
    return {
      saved,
      rejected,
      finalizedByGrace: true,
      remainingMs: 0,
      serverNow: currentTime,
    };
  }

  const remainingMs = Math.max(0, deadlineMs - currentMs);
  return {
    saved,
    rejected,
    remainingMs,
    serverNow: currentTime,
  };
};

/**
 * Saves candidate scratchpad notes on an active attempt.
 */
export const saveScratchpad = async ({ user, attemptId, text }) => {
  const currentTime = new Date(now());
  const attempt = await assertAttemptMutable(attemptId, user, currentTime);

  attempt.scratchpad = text;
  await attempt.save();

  return {
    scratchpad: attempt.scratchpad,
    serverNow: currentTime,
  };
};

/**
 * Updates candidate heartbeat timestamp and records prolonged connection gaps.
 */
export const recordHeartbeat = async ({ user, attemptId, since, sessionId = null }) => {
  const currentTime = new Date(now());
  const attempt = await assertAttemptMutable(attemptId, user, currentTime, {
    includeSession: Boolean(sessionId),
  });

  await syncAttemptSession(attempt, sessionId, currentTime);

  if (
    attempt.lastHeartbeatAt &&
    currentTime.getTime() - new Date(attempt.lastHeartbeatAt).getTime() > CONNECTION_GAP_THRESHOLD_MS
  ) {
    attempt.connectionGaps.push({
      from: attempt.lastHeartbeatAt,
      to: currentTime,
    });
  }

  attempt.lastHeartbeatAt = currentTime;
  await attempt.save();

  const annFilter = { examId: attempt.examId };
  if (since) {
    annFilter.createdAt = { $gt: new Date(since) };
  }
  const announcementDocs = await Announcement.find(annFilter)
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  const remainingMs = Math.max(0, new Date(attempt.deadlineAt).getTime() - currentTime.getTime());
  return {
    remainingMs,
    serverNow: currentTime,
    announcements: announcementDocs.map((doc) => ({
      id: String(doc._id),
      examId: String(doc.examId),
      message: doc.message,
      createdAt: doc.createdAt,
    })),
  };
};

/**
 * Records a neutral session event indicator on an active attempt for examiner review.
 */
export const reportIncident = async ({ user, attemptId, type, details = '' }) => {
  const currentTime = new Date(now());
  const attempt = await assertAttemptMutable(attemptId, user, currentTime);

  const existingCount = await Incident.countDocuments({ attemptId: attempt._id });
  if (existingCount >= MAX_INCIDENTS_PER_ATTEMPT) {
    throw new ApiError(429, 'RATE_LIMITED', 'Incident event cap reached for this attempt');
  }

  const incident = await Incident.create({
    attemptId: attempt._id,
    examId: attempt.examId,
    userId: user._id,
    type,
    details,
    occurredAt: currentTime,
  });

  return {
    incident: serializeIncident(incident),
  };
};

/**
 * Atomically submits an active attempt (or finalizes as expired if past deadline) idempotently.
 */
export const submitAttempt = async ({ user, attemptId }) => {
  const currentTime = new Date(now());
  const owned = await getOwnedAttempt(attemptId, user);

  if (owned.status !== 'in_progress') {
    return {
      attempt: serializeAttemptForCandidate(owned, currentTime),
      alreadySubmitted: true,
    };
  }

  const finalizedBy =
    currentTime.getTime() >= new Date(owned.deadlineAt).getTime() ? 'expiry' : 'candidate';
  const finalized = await finalizeAttempt(owned._id, finalizedBy, currentTime);

  if (!finalized) {
    const latest = await Attempt.findById(owned._id);
    return {
      attempt: serializeAttemptForCandidate(latest, currentTime),
      alreadySubmitted: true,
    };
  }

  return {
    attempt: serializeAttemptForCandidate(finalized, currentTime),
    alreadySubmitted: false,
  };
};

/**
 * Starts a sandbox rehearsal attempt for the exam owner or admin on a draft or published exam.
 */
export const startSandboxAttempt = async ({ user, examId }) => {
  const currentTime = new Date(now());
  const exam = await Exam.findById(examId);
  assertExamAccess(exam, user);

  if (!['draft', 'published'].includes(exam.status)) {
    throw new ApiError(409, 'CONFLICT', `Cannot start sandbox on a '${exam.status}' exam`);
  }
  if (!exam.questions || exam.questions.length === 0) {
    throw new ApiError(409, 'CONFLICT', 'Cannot start sandbox on an exam with no questions');
  }

  const deadlineAt = new Date(currentTime.getTime() + exam.durationMinutes * 60 * 1000);
  const questionIds = exam.questions.map((q) => q.questionId);
  const questionDocs = await Question.find({ _id: { $in: questionIds } }).select('+correctOptionIds');
  const { paper, paperFingerprint, paperDifficultyIndex, maxScore } = buildFrozenPaper(
    exam,
    questionDocs
  );

  const created = await Attempt.create({
    examId: exam._id,
    userId: user._id,
    isSandbox: true,
    status: 'in_progress',
    startedAt: currentTime,
    deadlineAt,
    paper,
    paperFingerprint,
    paperDifficultyIndex,
    maxScore,
    lastHeartbeatAt: currentTime,
  });

  return { attempt: serializeAttemptForCandidate(created, currentTime) };
};

/**
 * Deletes all sandbox attempts and associated sandbox incidents created by this user on an exam.
 */
export const deleteExamSandbox = async ({ user, examId }) => {
  const exam = await Exam.findById(examId);
  assertExamAccess(exam, user);

  const sandboxIds = await Attempt.find({
    examId: exam._id,
    userId: user._id,
    isSandbox: true,
  }).distinct('_id');

  if (sandboxIds.length > 0) {
    await Promise.all([
      Incident.deleteMany({ attemptId: { $in: sandboxIds } }),
      Attempt.deleteMany({ _id: { $in: sandboxIds } }),
    ]);
  }

  return { deletedCount: sandboxIds.length };
};
