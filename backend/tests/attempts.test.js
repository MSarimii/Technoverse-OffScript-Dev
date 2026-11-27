import 'dotenv/config';
import mongoose from 'mongoose';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import Attempt from '../src/models/Attempt.js';
import Enrollment from '../src/models/Enrollment.js';
import Exam from '../src/models/Exam.js';
import Incident from '../src/models/Incident.js';
import Question from '../src/models/Question.js';
import User from '../src/models/User.js';
import { sweepExpiredAttempts } from '../src/services/attemptSweeper.js';
import { resetClock, setClock } from '../src/utils/time.js';

const TEST_RUN_TAG = `p5_${Date.now()}`;
const testEmail = (label) => `${TEST_RUN_TAG}_${label}@test.sems.edu`;

const app = createApp();

describe('Phase 5 Candidate Attempt Engine & Server Timer', () => {
  const originalJwtSecret = process.env.JWT_SECRET;
  let adminUser;
  let examiner;
  let candEnrolled;
  let candOther;
  let candUnenrolled;
  let adminToken;
  let examinerToken;
  let candEnrolledToken;
  let candOtherToken;
  let candUnenrolledToken;
  let qSingle;
  let optRight;
  let optWrong;
  let qWritten;

  const baseNow = new Date('2026-11-27T10:00:00.000Z');
  const setMockTime = (offsetMs = 0) => setClock(() => new Date(baseNow.getTime() + offsetMs));

  const loginAs = async (email, password = 'Password123!') => {
    const res = await request(app).post('/api/auth/login').send({ email, password });
    return res.body.data.token;
  };

  const createPublishedExam = async ({
    startOffsetMs = -5 * 60 * 1000,
    endOffsetMs = 55 * 60 * 1000,
    durationMinutes = 30,
    strictEnd = true,
    enrollCandidates = [candEnrolled._id, candOther._id],
  } = {}) => {
    const exam = await Exam.create({
      createdBy: examiner._id,
      title: 'Systems Midterm',
      instructions: 'Read carefully before answering.',
      startAt: new Date(baseNow.getTime() + startOffsetMs),
      endAt: new Date(baseNow.getTime() + endOffsetMs),
      durationMinutes,
      totalMarks: 10,
      status: 'published',
      publishedAt: new Date(baseNow.getTime() - 60 * 60 * 1000),
      settings: {
        shuffleQuestions: true,
        shuffleOptions: true,
        strictEnd,
      },
      questions: [
        { questionId: qSingle._id, marks: 4, order: 0 },
        { questionId: qWritten._id, marks: 6, order: 1 },
      ],
    });

    if (enrollCandidates.length > 0) {
      await Enrollment.insertMany(
        enrollCandidates.map((userId) => ({
          examId: exam._id,
          userId,
          enrolledBy: examiner._id,
          status: 'active',
        }))
      );
    }

    return exam;
  };

  beforeAll(async () => {
    const testUri = process.env.MONGODB_TEST_URI;
    if (!testUri) {
      throw new Error('MONGODB_TEST_URI must be set to run Phase 5 attempt tests');
    }
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'phase5_vitest_secret_key_min_32_chars';
    await mongoose.connect(testUri, { serverSelectionTimeoutMS: 5000 });
    await Promise.all([
      User.init(),
      Question.init(),
      Exam.init(),
      Enrollment.init(),
      Attempt.init(),
      Incident.init(),
    ]);

    await User.deleteMany({ email: { $regex: `^${TEST_RUN_TAG}_` } });

    [adminUser, examiner, candEnrolled, candOther, candUnenrolled] = await Promise.all([
      User.create({ name: 'Admin P5', email: testEmail('admin'), passwordHash: 'Password123!', role: 'admin' }),
      User.create({ name: 'Examiner P5', email: testEmail('examiner'), passwordHash: 'Password123!', role: 'examiner' }),
      User.create({ name: 'Candidate A P5', email: testEmail('cand_a'), passwordHash: 'Password123!', role: 'candidate' }),
      User.create({ name: 'Candidate B P5', email: testEmail('cand_b'), passwordHash: 'Password123!', role: 'candidate' }),
      User.create({ name: 'Candidate C P5', email: testEmail('cand_c'), passwordHash: 'Password123!', role: 'candidate' }),
    ]);

    [adminToken, examinerToken, candEnrolledToken, candOtherToken, candUnenrolledToken] =
      await Promise.all([
        loginAs(adminUser.email),
        loginAs(examiner.email),
        loginAs(candEnrolled.email),
        loginAs(candOther.email),
        loginAs(candUnenrolled.email),
      ]);
  });

  beforeEach(async () => {
    setMockTime(0);

    const examIds = await Exam.find({ createdBy: examiner._id }).distinct('_id');
    await Promise.all([
      Incident.deleteMany({ examId: { $in: examIds } }),
      Attempt.deleteMany({ examId: { $in: examIds } }),
      Enrollment.deleteMany({ examId: { $in: examIds } }),
      Exam.deleteMany({ _id: { $in: examIds } }),
      Question.deleteMany({ createdBy: examiner._id }),
    ]);

    optWrong = new mongoose.Types.ObjectId();
    optRight = new mongoose.Types.ObjectId();
    [qSingle, qWritten] = await Promise.all([
      Question.create({
        createdBy: examiner._id,
        type: 'single',
        text: 'Original HTTP idempotent verb?',
        options: [
          { _id: optWrong, text: 'POST' },
          { _id: optRight, text: 'PUT' },
        ],
        correctOptionIds: [optRight],
        topic: 'Web',
        difficulty: 'easy',
        marks: 4,
      }),
      Question.create({
        createdBy: examiner._id,
        type: 'written',
        text: 'Describe two-phase locking.',
        topic: 'DB',
        difficulty: 'hard',
        marks: 6,
      }),
    ]);
  });

  afterEach(() => {
    resetClock();
  });

  afterAll(async () => {
    if (mongoose.connection.readyState === 1) {
      const examIds = await Exam.find({ createdBy: examiner._id }).distinct('_id');
      await Promise.all([
        Incident.deleteMany({ examId: { $in: examIds } }),
        Attempt.deleteMany({ examId: { $in: examIds } }),
        Enrollment.deleteMany({ examId: { $in: examIds } }),
        Exam.deleteMany({ _id: { $in: examIds } }),
        Question.deleteMany({ createdBy: examiner._id }),
        User.deleteMany({ email: { $regex: `^${TEST_RUN_TAG}_` } }),
      ]);
      await mongoose.disconnect();
    }
    process.env.JWT_SECRET = originalJwtSecret;
  });

  it('blocks early/late exam access with 409 EXAM_NOT_AVAILABLE, blocks unenrolled with 403 NOT_ENROLLED, and lists buckets', async () => {
    const upcomingExam = await createPublishedExam({
      startOffsetMs: 30 * 60 * 1000,
      endOffsetMs: 90 * 60 * 1000,
    });
    const ongoingExam = await createPublishedExam();
    const closedExam = await createPublishedExam({
      startOffsetMs: -90 * 60 * 1000,
      endOffsetMs: -30 * 60 * 1000,
    });

    const earlyStart = await request(app)
      .post(`/api/candidate/exams/${upcomingExam._id}/start`)
      .set('Authorization', `Bearer ${candEnrolledToken}`);
    expect(earlyStart.status).toBe(409);
    expect(earlyStart.body.error.code).toBe('EXAM_NOT_AVAILABLE');

    const lateStart = await request(app)
      .post(`/api/candidate/exams/${closedExam._id}/start`)
      .set('Authorization', `Bearer ${candEnrolledToken}`);
    expect(lateStart.status).toBe(409);
    expect(lateStart.body.error.code).toBe('EXAM_NOT_AVAILABLE');

    const unenrolledStart = await request(app)
      .post(`/api/candidate/exams/${ongoingExam._id}/start`)
      .set('Authorization', `Bearer ${candUnenrolledToken}`);
    expect(unenrolledStart.status).toBe(403);
    expect(unenrolledStart.body.error.code).toBe('NOT_ENROLLED');

    const listRes = await request(app)
      .get('/api/candidate/exams')
      .set('Authorization', `Bearer ${candEnrolledToken}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.data.available.some((e) => e.id === String(ongoingExam._id) && e.accessStatus === 'ready')).toBe(true);
    expect(listRes.body.data.upcoming.some((e) => e.id === String(upcomingExam._id) && e.accessStatus === 'upcoming')).toBe(true);
    expect(listRes.body.data.completed.some((e) => e.id === String(closedExam._id) && e.accessStatus === 'closed')).toBe(true);

    const detailRes = await request(app)
      .get(`/api/candidate/exams/${ongoingExam._id}`)
      .set('Authorization', `Bearer ${candEnrolledToken}`);
    expect(detailRes.status).toBe(200);
    expect(detailRes.body.data.exam.instructions).toBe('Read carefully before answering.');
    expect(detailRes.body.data.exam.questions).toBeUndefined();
  });

  it('freezes paper without correctOptionIds, resists post-start bank edits, resumes same order, and blocks enrollment removal', async () => {
    const exam = await createPublishedExam();

    const startRes = await request(app)
      .post(`/api/candidate/exams/${exam._id}/start`)
      .set('Authorization', `Bearer ${candEnrolledToken}`);
    expect(startRes.status).toBe(201);
    expect(startRes.body.data.resumed).toBe(false);
    expect(JSON.stringify(startRes.body)).not.toContain('correctOptionIds');
    expect(JSON.stringify(startRes.body)).not.toContain('isCorrect');
    expect(startRes.body.data.attempt.paper.every((q) => !('correctOptionIds' in q))).toBe(true);

    const firstPaperOrder = startRes.body.data.attempt.paper.map((q) => ({
      questionId: q.questionId,
      optionOrder: q.optionOrder.map((o) => o.optionId),
      text: q.text,
    }));

    // Mutate question text in Question Bank after attempt has already started
    await Question.findByIdAndUpdate(qSingle._id, { text: 'MUTATED QUESTION TEXT AFTER START' });

    // Advance clock by 5 minutes and resume
    setMockTime(5 * 60 * 1000);
    const resumeRes = await request(app)
      .post(`/api/candidate/exams/${exam._id}/start`)
      .set('Authorization', `Bearer ${candEnrolledToken}`);
    expect(resumeRes.status).toBe(200);
    expect(resumeRes.body.data.resumed).toBe(true);
    expect(JSON.stringify(resumeRes.body)).not.toContain('correctOptionIds');
    expect(resumeRes.body.data.attempt.remainingMs).toBe(25 * 60 * 1000);

    const resumedPaperOrder = resumeRes.body.data.attempt.paper.map((q) => ({
      questionId: q.questionId,
      optionOrder: q.optionOrder.map((o) => o.optionId),
      text: q.text,
    }));
    expect(resumedPaperOrder).toEqual(firstPaperOrder);
    expect(JSON.stringify(resumeRes.body)).not.toContain('MUTATED QUESTION TEXT AFTER START');

    // Removing enrollment once candidate started must fail with 409 CONFLICT
    const removeRes = await request(app)
      .delete(`/api/exams/${exam._id}/enrollments/${candEnrolled._id}`)
      .set('Authorization', `Bearer ${examinerToken}`);
    expect(removeRes.status).toBe(409);
    expect(removeRes.body.error.code).toBe('CONFLICT');
  });

  it('caps deadlineAt at exam.endAt when strictEnd is enabled on a late start', async () => {
    const exam = await createPublishedExam({
      startOffsetMs: -50 * 60 * 1000,
      endOffsetMs: 10 * 60 * 1000,
      durationMinutes: 60,
      strictEnd: true,
    });

    const res = await request(app)
      .post(`/api/candidate/exams/${exam._id}/start`)
      .set('Authorization', `Bearer ${candEnrolledToken}`);
    expect(res.status).toBe(201);
    expect(new Date(res.body.data.attempt.deadlineAt).getTime()).toBe(exam.endAt.getTime());
    expect(res.body.data.attempt.remainingMs).toBe(10 * 60 * 1000);
  });

  it('enforces seq-idempotent autosave, rejects stale seq, and lazy-expires overdue writes with 409 ATTEMPT_EXPIRED', async () => {
    const exam = await createPublishedExam({ durationMinutes: 15 });
    const startRes = await request(app)
      .post(`/api/candidate/exams/${exam._id}/start`)
      .set('Authorization', `Bearer ${candEnrolledToken}`);
    const attemptId = startRes.body.data.attempt.id;

    const singlePaperItem = startRes.body.data.attempt.paper.find(
      (q) => q.questionId === String(qSingle._id)
    );
    const chosenOptId = singlePaperItem.optionOrder[0].optionId;

    const save2 = await request(app)
      .put(`/api/attempts/${attemptId}/answers`)
      .set('Authorization', `Bearer ${candEnrolledToken}`)
      .send({
        answers: [{ questionId: String(qSingle._id), selectedOptionIds: [chosenOptId], seq: 2 }],
      });
    expect(save2.status).toBe(200);
    expect(save2.body.data.saved).toEqual([String(qSingle._id)]);
    expect(save2.body.data.rejected).toEqual([]);

    const staleSave = await request(app)
      .put(`/api/attempts/${attemptId}/answers`)
      .set('Authorization', `Bearer ${candEnrolledToken}`)
      .send({
        answers: [{ questionId: String(qSingle._id), selectedOptionIds: [], seq: 2 }],
      });
    expect(staleSave.status).toBe(200);
    expect(staleSave.body.data.saved).toEqual([]);
    expect(staleSave.body.data.rejected).toEqual([
      { questionId: String(qSingle._id), reason: 'STALE_SAVE' },
    ]);

    const getAfterStale = await request(app)
      .get(`/api/attempts/${attemptId}`)
      .set('Authorization', `Bearer ${candEnrolledToken}`);
    const persistedAnswer = getAfterStale.body.data.attempt.answers.find(
      (a) => a.questionId === String(qSingle._id)
    );
    expect(persistedAnswer.selectedOptionIds).toEqual([chosenOptId]);
    expect(persistedAnswer.seq).toBe(2);

    // Advance past 15 minute duration deadline -> lazy expiry triggers on save
    setMockTime(16 * 60 * 1000);
    const expiredSave = await request(app)
      .put(`/api/attempts/${attemptId}/answers`)
      .set('Authorization', `Bearer ${candEnrolledToken}`)
      .send({
        answers: [{ questionId: String(qWritten._id), text: 'Too late', seq: 3 }],
      });
    expect(expiredSave.status).toBe(409);
    expect(expiredSave.body.error.code).toBe('ATTEMPT_EXPIRED');

    const dbAttempt = await Attempt.findById(attemptId);
    expect(dbAttempt.status).toBe('expired');
    expect(dbAttempt.finalizedBy).toBe('expiry');
  });

  it('persists scratchpad updates, heartbeat connection gaps, and neutral incident events', async () => {
    const exam = await createPublishedExam();
    const startRes = await request(app)
      .post(`/api/candidate/exams/${exam._id}/start`)
      .set('Authorization', `Bearer ${candEnrolledToken}`);
    const attemptId = startRes.body.data.attempt.id;

    const padRes = await request(app)
      .put(`/api/attempts/${attemptId}/scratchpad`)
      .set('Authorization', `Bearer ${candEnrolledToken}`)
      .send({ text: 'Reminder: revisit ACID isolation question.' });
    expect(padRes.status).toBe(200);
    expect(padRes.body.data.scratchpad).toBe('Reminder: revisit ACID isolation question.');

    // Advance clock by 2 minutes to trigger a recorded connection gap on next heartbeat
    setMockTime(2 * 60 * 1000);
    const hbRes = await request(app)
      .post(`/api/attempts/${attemptId}/heartbeat`)
      .set('Authorization', `Bearer ${candEnrolledToken}`);
    expect(hbRes.status).toBe(200);
    expect(hbRes.body.data.remainingMs).toBe(28 * 60 * 1000);
    expect(hbRes.body.data.announcements).toEqual([]);

    const evtRes = await request(app)
      .post(`/api/attempts/${attemptId}/events`)
      .set('Authorization', `Bearer ${candEnrolledToken}`)
      .send({ type: 'tab_hidden', details: 'Browser tab lost visibility for 3s' });
    expect(evtRes.status).toBe(201);
    expect(evtRes.body.data.incident.type).toBe('tab_hidden');

    const dbAttempt = await Attempt.findById(attemptId);
    expect(dbAttempt.connectionGaps).toHaveLength(1);
    expect(dbAttempt.scratchpad).toBe('Reminder: revisit ACID isolation question.');

    const dbIncident = await Incident.findOne({ attemptId });
    expect(dbIncident).not.toBeNull();
    expect(dbIncident.details).toBe('Browser tab lost visibility for 3s');
  });

  it('handles concurrent and sequential double submits atomically and updates admin overview attempt count', async () => {
    const exam = await createPublishedExam();
    const startRes = await request(app)
      .post(`/api/candidate/exams/${exam._id}/start`)
      .set('Authorization', `Bearer ${candEnrolledToken}`);
    const attemptId = startRes.body.data.attempt.id;

    const [resA, resB] = await Promise.all([
      request(app)
        .post(`/api/attempts/${attemptId}/submit`)
        .set('Authorization', `Bearer ${candEnrolledToken}`),
      request(app)
        .post(`/api/attempts/${attemptId}/submit`)
        .set('Authorization', `Bearer ${candEnrolledToken}`),
    ]);

    expect(resA.status).toBe(200);
    expect(resB.status).toBe(200);
    const flags = [resA.body.data.alreadySubmitted, resB.body.data.alreadySubmitted].sort();
    expect(flags).toEqual([false, true]);

    const seqThird = await request(app)
      .post(`/api/attempts/${attemptId}/submit`)
      .set('Authorization', `Bearer ${candEnrolledToken}`);
    expect(seqThird.status).toBe(200);
    expect(seqThird.body.data.alreadySubmitted).toBe(true);
    expect(seqThird.body.data.attempt.status).toBe('submitted');

    const overviewRes = await request(app)
      .get('/api/admin/overview')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(overviewRes.status).toBe(200);
    expect(overviewRes.body.data.attempts).toBeGreaterThanOrEqual(1);
  });

  it('sweeps overdue attempts cleanly and blocks cross-candidate attempt access with 403', async () => {
    const exam = await createPublishedExam({ durationMinutes: 10 });
    const startRes = await request(app)
      .post(`/api/candidate/exams/${exam._id}/start`)
      .set('Authorization', `Bearer ${candEnrolledToken}`);
    const attemptId = startRes.body.data.attempt.id;

    // Candidate B cannot read or mutate Candidate A's attempt
    const crossGet = await request(app)
      .get(`/api/attempts/${attemptId}`)
      .set('Authorization', `Bearer ${candOtherToken}`);
    expect(crossGet.status).toBe(403);

    const crossSubmit = await request(app)
      .post(`/api/attempts/${attemptId}/submit`)
      .set('Authorization', `Bearer ${candOtherToken}`);
    expect(crossSubmit.status).toBe(403);

    const exam2 = await createPublishedExam({ durationMinutes: 20 });
    const startB = await request(app)
      .post(`/api/candidate/exams/${exam2._id}/start`)
      .set('Authorization', `Bearer ${candOtherToken}`);
    const attemptBId = startB.body.data.attempt.id;

    // Advance past exam's 10-minute deadline and sweep -> expires Candidate A's attempt
    setMockTime(11 * 60 * 1000);
    const swept = await sweepExpiredAttempts();
    expect(swept).toBeGreaterThanOrEqual(1);

    const dbAttempt = await Attempt.findById(attemptId);
    expect(dbAttempt.status).toBe('expired');
    expect(dbAttempt.finalizedBy).toBe('expiry');

    // Completing exam2 while Candidate B is still in_progress finalizes with finalizedBy: 'examiner'
    const completeRes = await request(app)
      .post(`/api/exams/${exam2._id}/complete`)
      .set('Authorization', `Bearer ${examinerToken}`);
    expect(completeRes.status).toBe(200);
    const finalizedB = await Attempt.findById(attemptBId);
    expect(finalizedB.status).toBe('submitted');
    expect(finalizedB.finalizedBy).toBe('examiner');
  });
});
