import 'dotenv/config';
import mongoose from 'mongoose';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import Enrollment from '../src/models/Enrollment.js';
import Exam from '../src/models/Exam.js';
import Question from '../src/models/Question.js';
import User from '../src/models/User.js';
import { resolveExamStatus } from '../src/utils/examStatus.js';
import { resetClock, setClock } from '../src/utils/time.js';

const TEST_RUN_TAG = `p4_${Date.now()}`;
const testEmail = (label) => `${TEST_RUN_TAG}_${label}@test.sems.edu`;

const app = createApp();

describe('Phase 4 Exams, Lifecycle & Enrollment', () => {
  const originalJwtSecret = process.env.JWT_SECRET;
  let adminUser;
  let examinerA;
  let examinerB;
  let candidate1;
  let candidate2;
  let inactiveCandidate;
  let adminToken;
  let examinerAToken;
  let examinerBToken;
  let candidateToken;
  let qSingleA;
  let qWrittenA;
  let qArchivedA;
  let qOtherB;

  const loginAs = async (email, password = 'Password123!') => {
    const res = await request(app).post('/api/auth/login').send({ email, password });
    return res.body.data.token;
  };

  beforeAll(async () => {
    const testUri = process.env.MONGODB_TEST_URI;
    if (!testUri) {
      throw new Error('MONGODB_TEST_URI must be set to run Phase 4 exam tests');
    }
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'phase4_vitest_secret_key_min_32_chars';
    await mongoose.connect(testUri, { serverSelectionTimeoutMS: 5000 });
    await Promise.all([User.init(), Question.init(), Exam.init(), Enrollment.init()]);

    await User.deleteMany({ email: { $regex: `^${TEST_RUN_TAG}_` } });

    [adminUser, examinerA, examinerB, candidate1, candidate2, inactiveCandidate] = await Promise.all([
      User.create({ name: 'Admin P4', email: testEmail('admin'), passwordHash: 'Password123!', role: 'admin' }),
      User.create({ name: 'Examiner A P4', email: testEmail('exam_a'), passwordHash: 'Password123!', role: 'examiner' }),
      User.create({ name: 'Examiner B P4', email: testEmail('exam_b'), passwordHash: 'Password123!', role: 'examiner' }),
      User.create({ name: 'Candidate One P4', email: testEmail('cand1'), passwordHash: 'Password123!', role: 'candidate', rollNo: `${TEST_RUN_TAG}-01` }),
      User.create({ name: 'Candidate Two P4', email: testEmail('cand2'), passwordHash: 'Password123!', role: 'candidate', rollNo: `${TEST_RUN_TAG}-02` }),
      User.create({ name: 'Inactive Cand P4', email: testEmail('cand_off'), passwordHash: 'Password123!', role: 'candidate', isActive: false }),
    ]);

    [adminToken, examinerAToken, examinerBToken, candidateToken] = await Promise.all([
      loginAs(adminUser.email),
      loginAs(examinerA.email),
      loginAs(examinerB.email),
      loginAs(candidate1.email),
    ]);

    const opt1 = new mongoose.Types.ObjectId();
    const opt2 = new mongoose.Types.ObjectId();
    [qSingleA, qWrittenA, qArchivedA, qOtherB] = await Promise.all([
      Question.create({
        createdBy: examinerA._id,
        type: 'single',
        text: 'What is 2 + 2?',
        options: [{ _id: opt1, text: '3' }, { _id: opt2, text: '4' }],
        correctOptionIds: [opt2],
        topic: 'Math',
        difficulty: 'easy',
        marks: 2,
      }),
      Question.create({
        createdBy: examinerA._id,
        type: 'written',
        text: 'Explain ACID properties.',
        topic: 'Databases',
        difficulty: 'medium',
        marks: 8,
      }),
      Question.create({
        createdBy: examinerA._id,
        type: 'written',
        text: 'Archived question',
        topic: 'Legacy',
        difficulty: 'easy',
        marks: 5,
        isArchived: true,
      }),
      Question.create({
        createdBy: examinerB._id,
        type: 'written',
        text: 'Examiner B question',
        topic: 'Other',
        difficulty: 'hard',
        marks: 5,
      }),
    ]);
  });

  beforeEach(async () => {
    resetClock();
    const examIds = await Exam.find({
      createdBy: { $in: [adminUser._id, examinerA._id, examinerB._id] },
    }).distinct('_id');
    await Enrollment.deleteMany({ examId: { $in: examIds } });
    await Exam.deleteMany({ _id: { $in: examIds } });
  });

  afterEach(() => {
    resetClock();
  });

  afterAll(async () => {
    if (mongoose.connection.readyState === 1) {
      const examIds = await Exam.find({
        createdBy: { $in: [adminUser._id, examinerA._id, examinerB._id] },
      }).distinct('_id');
      await Enrollment.deleteMany({ examId: { $in: examIds } });
      await Exam.deleteMany({ _id: { $in: examIds } });
      await Question.deleteMany({
        createdBy: { $in: [adminUser._id, examinerA._id, examinerB._id] },
      });
      await User.deleteMany({ email: { $regex: `^${TEST_RUN_TAG}_` } });
      await mongoose.disconnect();
    }
    process.env.JWT_SECRET = originalJwtSecret;
  });

  const futureWindow = () => ({
    startAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    endAt: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
  });

  it('resolveExamStatus derives draft, cancelled, completed, and time-based published/ongoing/completed accurately', () => {
    const startAt = new Date('2026-11-27T10:00:00.000Z');
    const endAt = new Date('2026-11-27T12:00:00.000Z');

    expect(resolveExamStatus({ status: 'draft', startAt, endAt }, new Date('2026-11-27T11:00:00.000Z'))).toBe('draft');
    expect(resolveExamStatus({ status: 'cancelled', startAt, endAt }, new Date('2026-11-27T11:00:00.000Z'))).toBe('cancelled');
    expect(resolveExamStatus({ status: 'completed', startAt, endAt }, new Date('2026-11-27T09:00:00.000Z'))).toBe('completed');

    expect(resolveExamStatus({ status: 'published', startAt, endAt }, new Date('2026-11-27T09:59:59.000Z'))).toBe('published');
    expect(resolveExamStatus({ status: 'published', startAt, endAt }, new Date('2026-11-27T10:00:00.000Z'))).toBe('ongoing');
    expect(resolveExamStatus({ status: 'published', startAt, endAt }, new Date('2026-11-27T11:30:00.000Z'))).toBe('ongoing');
    expect(resolveExamStatus({ status: 'published', startAt, endAt }, new Date('2026-11-27T12:00:00.000Z'))).toBe('completed');
    expect(resolveExamStatus({ status: 'published', startAt, endAt }, new Date('2026-11-27T13:00:00.000Z'))).toBe('completed');
  });

  it('creates draft exam, assigns ordered questions, recomputes totalMarks, and rejects duplicate/archived/other questions', async () => {
    const win = futureWindow();
    const createRes = await request(app)
      .post('/api/exams')
      .set('Authorization', `Bearer ${examinerAToken}`)
      .send({
        title: 'Midterm Assessment',
        instructions: 'Answer all questions.',
        startAt: win.startAt,
        endAt: win.endAt,
        durationMinutes: 60,
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.data.exam.status).toBe('draft');
    expect(createRes.body.data.exam.totalMarks).toBe(0);
    const examId = createRes.body.data.exam.id;

    // Duplicate questionId rejected
    const dupRes = await request(app)
      .put(`/api/exams/${examId}/questions`)
      .set('Authorization', `Bearer ${examinerAToken}`)
      .send({
        questions: [{ questionId: String(qSingleA._id) }, { questionId: String(qSingleA._id) }],
      });
    expect(dupRes.status).toBe(400);

    // Archived question rejected
    const archRes = await request(app)
      .put(`/api/exams/${examId}/questions`)
      .set('Authorization', `Bearer ${examinerAToken}`)
      .send({
        questions: [{ questionId: String(qArchivedA._id) }],
      });
    expect(archRes.status).toBe(400);

    // Other examiner's question rejected
    const otherQRes = await request(app)
      .put(`/api/exams/${examId}/questions`)
      .set('Authorization', `Bearer ${examinerAToken}`)
      .send({
        questions: [{ questionId: String(qOtherB._id) }],
      });
    expect(otherQRes.status).toBe(403);

    // Valid assignment recomputes totalMarks (override marks 3 + default marks 8 = 11)
    const assignRes = await request(app)
      .put(`/api/exams/${examId}/questions`)
      .set('Authorization', `Bearer ${examinerAToken}`)
      .send({
        questions: [
          { questionId: String(qSingleA._id), marks: 3 },
          { questionId: String(qWrittenA._id) },
        ],
      });
    expect(assignRes.status).toBe(200);
    expect(assignRes.body.data.exam.totalMarks).toBe(11);
    expect(assignRes.body.data.exam.questions).toEqual([
      { questionId: String(qSingleA._id), marks: 3, order: 0 },
      { questionId: String(qWrittenA._id), marks: 8, order: 1 },
    ]);
  });

  it('blocks publishing with 409 when readiness fails and succeeds once ready', async () => {
    const win = futureWindow();
    const createRes = await request(app)
      .post('/api/exams')
      .set('Authorization', `Bearer ${examinerAToken}`)
      .send({
        title: 'Readiness Gate Exam',
        startAt: win.startAt,
        endAt: win.endAt,
        durationMinutes: 45,
      });
    const examId = createRes.body.data.exam.id;

    const notReadyRes = await request(app)
      .get(`/api/exams/${examId}/readiness`)
      .set('Authorization', `Bearer ${examinerAToken}`);
    expect(notReadyRes.status).toBe(200);
    expect(notReadyRes.body.data.ready).toBe(false);
    expect(notReadyRes.body.data.checks.hasQuestions).toBe(false);

    const blockedPublish = await request(app)
      .post(`/api/exams/${examId}/publish`)
      .set('Authorization', `Bearer ${examinerAToken}`);
    expect(blockedPublish.status).toBe(409);
    expect(blockedPublish.body.error.code).toBe('CONFLICT');

    await request(app)
      .put(`/api/exams/${examId}/questions`)
      .set('Authorization', `Bearer ${examinerAToken}`)
      .send({ questions: [{ questionId: String(qSingleA._id) }, { questionId: String(qWrittenA._id) }] });

    await request(app)
      .put(`/api/exams/${examId}/blueprint`)
      .set('Authorization', `Bearer ${examinerAToken}`)
      .send({ easy: 1, medium: 1, hard: 0, poolMode: true });

    const readyRes = await request(app)
      .get(`/api/exams/${examId}/readiness`)
      .set('Authorization', `Bearer ${examinerAToken}`);
    expect(readyRes.status).toBe(200);
    expect(readyRes.body.data.ready).toBe(true);
    expect(readyRes.body.data.checks.hasWrittenQuestions).toBe(true);
    expect(readyRes.body.data.warnings.length).toBeGreaterThanOrEqual(2);

    const publishRes = await request(app)
      .post(`/api/exams/${examId}/publish`)
      .set('Authorization', `Bearer ${examinerAToken}`);
    expect(publishRes.status).toBe(200);
    expect(publishRes.body.data.exam.status).toBe('published');
    expect(publishRes.body.data.exam.publishedAt).toBeTruthy();

    // Past-end window blocks publish even with questions
    const pastExam = await request(app)
      .post('/api/exams')
      .set('Authorization', `Bearer ${examinerAToken}`)
      .send({
        title: 'Expired Draft',
        startAt: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
        endAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        durationMinutes: 30,
      });
    await request(app)
      .put(`/api/exams/${pastExam.body.data.exam.id}/questions`)
      .set('Authorization', `Bearer ${examinerAToken}`)
      .send({ questions: [{ questionId: String(qSingleA._id) }] });
    const expiredPublish = await request(app)
      .post(`/api/exams/${pastExam.body.data.exam.id}/publish`)
      .set('Authorization', `Bearer ${examinerAToken}`);
    expect(expiredPublish.status).toBe(409);
  });

  it('rejects restricted edits on published exam (409) and cancels on DELETE instead of deleting', async () => {
    const win = futureWindow();
    const createRes = await request(app)
      .post('/api/exams')
      .set('Authorization', `Bearer ${examinerAToken}`)
      .send({
        title: 'Published Guard Exam',
        startAt: win.startAt,
        endAt: win.endAt,
        durationMinutes: 60,
      });
    const examId = createRes.body.data.exam.id;

    await request(app)
      .put(`/api/exams/${examId}/questions`)
      .set('Authorization', `Bearer ${examinerAToken}`)
      .send({ questions: [{ questionId: String(qSingleA._id) }] });
    await request(app)
      .post(`/api/exams/${examId}/publish`)
      .set('Authorization', `Bearer ${examinerAToken}`);

    const badEdit = await request(app)
      .patch(`/api/exams/${examId}`)
      .set('Authorization', `Bearer ${examinerAToken}`)
      .send({ durationMinutes: 90 });
    expect(badEdit.status).toBe(409);

    const okEdit = await request(app)
      .patch(`/api/exams/${examId}`)
      .set('Authorization', `Bearer ${examinerAToken}`)
      .send({
        title: 'Published Guard Exam Revised',
        endAt: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString(),
      });
    expect(okEdit.status).toBe(200);
    expect(okEdit.body.data.exam.title).toBe('Published Guard Exam Revised');

    const cancelRes = await request(app)
      .delete(`/api/exams/${examId}`)
      .set('Authorization', `Bearer ${examinerAToken}`);
    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.data.exam.status).toBe('cancelled');

    const dbExam = await Exam.findById(examId);
    expect(dbExam).not.toBeNull();
    expect(dbExam.status).toBe('cancelled');
  });

  it('enforces ownership and RBAC on exams and enrollments while allowing admin access', async () => {
    const win = futureWindow();
    const createRes = await request(app)
      .post('/api/exams')
      .set('Authorization', `Bearer ${examinerAToken}`)
      .send({
        title: 'Ownership Exam',
        startAt: win.startAt,
        endAt: win.endAt,
        durationMinutes: 30,
      });
    const examId = createRes.body.data.exam.id;

    const candRes = await request(app)
      .get('/api/exams')
      .set('Authorization', `Bearer ${candidateToken}`);
    expect(candRes.status).toBe(403);

    const candSearch = await request(app)
      .get('/api/candidates')
      .set('Authorization', `Bearer ${candidateToken}`);
    expect(candSearch.status).toBe(403);

    const otherGet = await request(app)
      .get(`/api/exams/${examId}`)
      .set('Authorization', `Bearer ${examinerBToken}`);
    expect(otherGet.status).toBe(403);

    const otherEnroll = await request(app)
      .post(`/api/exams/${examId}/enrollments`)
      .set('Authorization', `Bearer ${examinerBToken}`)
      .send({ userIds: [String(candidate1._id)] });
    expect(otherEnroll.status).toBe(403);

    const adminGet = await request(app)
      .get(`/api/exams/${examId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(adminGet.status).toBe(200);

    const overviewRes = await request(app)
      .get('/api/admin/overview')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(overviewRes.status).toBe(200);
    expect(overviewRes.body.data.exams).toBeGreaterThanOrEqual(1);
  });

  it('manages enrollments idempotently by userIds/emails, rejects non-candidates/inactive, removes, and searches candidates', async () => {
    const win = futureWindow();
    const createRes = await request(app)
      .post('/api/exams')
      .set('Authorization', `Bearer ${examinerAToken}`)
      .send({
        title: 'Enrollment Exam',
        startAt: win.startAt,
        endAt: win.endAt,
        durationMinutes: 45,
      });
    const examId = createRes.body.data.exam.id;

    // Non-candidate rejected
    const nonCandRes = await request(app)
      .post(`/api/exams/${examId}/enrollments`)
      .set('Authorization', `Bearer ${examinerAToken}`)
      .send({ userIds: [String(examinerB._id)] });
    expect(nonCandRes.status).toBe(400);

    // Inactive candidate rejected
    const inactiveRes = await request(app)
      .post(`/api/exams/${examId}/enrollments`)
      .set('Authorization', `Bearer ${examinerAToken}`)
      .send({ emails: [inactiveCandidate.email] });
    expect(inactiveRes.status).toBe(400);

    // Enroll by userIds and emails
    const enrollRes = await request(app)
      .post(`/api/exams/${examId}/enrollments`)
      .set('Authorization', `Bearer ${examinerAToken}`)
      .send({ userIds: [String(candidate1._id)], emails: [candidate2.email] });
    expect(enrollRes.status).toBe(200);
    expect(enrollRes.body.data.enrolledCount).toBe(2);
    expect(enrollRes.body.data.alreadyEnrolledCount).toBe(0);

    // Idempotent re-enrollment
    const reEnrollRes = await request(app)
      .post(`/api/exams/${examId}/enrollments`)
      .set('Authorization', `Bearer ${examinerAToken}`)
      .send({ userIds: [String(candidate1._id)] });
    expect(reEnrollRes.status).toBe(200);
    expect(reEnrollRes.body.data.enrolledCount).toBe(0);
    expect(reEnrollRes.body.data.alreadyEnrolledCount).toBe(1);

    // Remove and re-enroll reactivates
    const removeRes = await request(app)
      .delete(`/api/exams/${examId}/enrollments/${candidate2._id}`)
      .set('Authorization', `Bearer ${examinerAToken}`);
    expect(removeRes.status).toBe(200);
    expect(removeRes.body.data.enrollment.status).toBe('removed');

    const reactivateRes = await request(app)
      .post(`/api/exams/${examId}/enrollments`)
      .set('Authorization', `Bearer ${examinerAToken}`)
      .send({ emails: [candidate2.email] });
    expect(reactivateRes.status).toBe(200);
    expect(reactivateRes.body.data.enrolledCount).toBe(1);

    // Search active candidates
    const searchRes = await request(app)
      .get('/api/candidates')
      .query({ q: `${TEST_RUN_TAG}-01` })
      .set('Authorization', `Bearer ${examinerAToken}`);
    expect(searchRes.status).toBe(200);
    expect(searchRes.body.data.candidates.some((c) => c.id === String(candidate1._id))).toBe(true);
    expect(searchRes.body.data.candidates.some((c) => c.id === String(inactiveCandidate._id))).toBe(false);
  });
});
