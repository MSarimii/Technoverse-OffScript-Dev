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
import { resetClock, setClock } from '../src/utils/time.js';

const TEST_RUN_TAG = `p8a_${Date.now()}`;
const testEmail = (label) => `${TEST_RUN_TAG}_${label}@test.sems.edu`;

const app = createApp();

describe('Phase 8a Secondary Features: Preferences, Sandbox, Question Analytics & Bulk Import', () => {
  const originalJwtSecret = process.env.JWT_SECRET;
  let adminUser;
  let examiner;
  let examinerOther;
  let candA;
  let candB;
  let adminToken;
  let examinerToken;
  let examinerOtherToken;
  let candAToken;
  let candBToken;

  const baseNow = new Date('2026-11-27T12:00:00.000Z');
  const setMockTime = (offsetMs = 0) => setClock(() => new Date(baseNow.getTime() + offsetMs));

  const loginAs = async (email, password = 'Password123!') => {
    const res = await request(app).post('/api/auth/login').send({ email, password });
    return res.body.data.token;
  };

  beforeAll(async () => {
    const testUri = process.env.MONGODB_TEST_URI;
    if (!testUri) {
      throw new Error('MONGODB_TEST_URI must be set to run Phase 8a tests');
    }
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'phase8a_vitest_secret_key_min_32_chars';
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

    [adminUser, examiner, examinerOther, candA, candB] = await Promise.all([
      User.create({ name: 'Admin P8A', email: testEmail('admin'), passwordHash: 'Password123!', role: 'admin' }),
      User.create({ name: 'Examiner P8A', email: testEmail('examiner'), passwordHash: 'Password123!', role: 'examiner' }),
      User.create({ name: 'Other Examiner P8A', email: testEmail('examiner2'), passwordHash: 'Password123!', role: 'examiner' }),
      User.create({ name: 'Cand A P8A', email: testEmail('cand_a'), passwordHash: 'Password123!', role: 'candidate' }),
      User.create({ name: 'Cand B P8A', email: testEmail('cand_b'), passwordHash: 'Password123!', role: 'candidate' }),
    ]);

    [adminToken, examinerToken, examinerOtherToken, candAToken, candBToken] = await Promise.all([
      loginAs(adminUser.email),
      loginAs(examiner.email),
      loginAs(examinerOther.email),
      loginAs(candA.email),
      loginAs(candB.email),
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
      User.deleteMany({ email: { $regex: `^${TEST_RUN_TAG}_imp_` } }),
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

  it('retrieves default workspace preferences, updates whitelisted fields, and rejects unknown keys (400)', async () => {
    const getRes = await request(app)
      .get('/api/me/preferences')
      .set('Authorization', `Bearer ${candAToken}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.data.preferences).toEqual({
      theme: 'dark',
      fontScale: 'md',
      layout: 'standard',
      showTimer: true,
      highContrast: false,
    });

    const putRes = await request(app)
      .put('/api/me/preferences')
      .set('Authorization', `Bearer ${candAToken}`)
      .send({ theme: 'system', fontScale: 'lg', layout: 'split', showTimer: false, highContrast: true });
    expect(putRes.status).toBe(200);
    expect(putRes.body.data.preferences).toEqual({
      theme: 'system',
      fontScale: 'lg',
      layout: 'split',
      showTimer: false,
      highContrast: true,
    });

    const badRes = await request(app)
      .put('/api/me/preferences')
      .set('Authorization', `Bearer ${candAToken}`)
      .send({ unknownOption: true });
    expect(badRes.status).toBe(400);
    expect(badRes.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('runs full exam sandbox on draft exams without affecting real submissions, analytics, or admin overview', async () => {
    const o1 = new mongoose.Types.ObjectId();
    const o2 = new mongoose.Types.ObjectId();
    const q1 = await Question.create({
      createdBy: examiner._id,
      type: 'single',
      text: 'Sandbox Q1',
      options: [{ _id: o1, text: 'Correct' }, { _id: o2, text: 'Wrong' }],
      correctOptionIds: [o1],
      topic: 'General',
      difficulty: 'easy',
      marks: 5,
    });

    const emptyExam = await Exam.create({
      createdBy: examiner._id,
      title: 'Empty Draft',
      startAt: new Date(baseNow.getTime() + 60 * 60 * 1000),
      endAt: new Date(baseNow.getTime() + 120 * 60 * 1000),
      durationMinutes: 30,
      status: 'draft',
      questions: [],
    });

    const emptyStart = await request(app)
      .post(`/api/exams/${emptyExam._id}/sandbox/start`)
      .set('Authorization', `Bearer ${examinerToken}`);
    expect(emptyStart.status).toBe(409);

    const draftExam = await Exam.create({
      createdBy: examiner._id,
      title: 'Sandbox Draft Exam',
      startAt: new Date(baseNow.getTime() + 60 * 60 * 1000),
      endAt: new Date(baseNow.getTime() + 120 * 60 * 1000),
      durationMinutes: 30,
      totalMarks: 5,
      status: 'draft',
      questions: [{ questionId: q1._id, marks: 5, order: 0 }],
    });

    const overviewBefore = await request(app)
      .get('/api/admin/overview')
      .set('Authorization', `Bearer ${adminToken}`);
    const baselineAttempts = overviewBefore.body.data.attempts;

    const startRes = await request(app)
      .post(`/api/exams/${draftExam._id}/sandbox/start`)
      .set('Authorization', `Bearer ${examinerToken}`);
    expect(startRes.status).toBe(201);
    expect(startRes.body.data.attempt.isSandbox).toBe(true);
    const sandboxId = startRes.body.data.attempt.id;

    // Candidate and non-owner examiner cannot access examiner sandbox
    const candForbidden = await request(app)
      .get(`/api/attempts/${sandboxId}`)
      .set('Authorization', `Bearer ${candAToken}`);
    expect(candForbidden.status).toBe(403);

    const otherExaminerForbidden = await request(app)
      .get(`/api/attempts/${sandboxId}`)
      .set('Authorization', `Bearer ${examinerOtherToken}`);
    expect(otherExaminerForbidden.status).toBe(403);

    await request(app)
      .put(`/api/attempts/${sandboxId}/answers`)
      .set('Authorization', `Bearer ${examinerToken}`)
      .send({
        answers: [{ questionId: String(q1._id), selectedOptionIds: [String(o1)], seq: 1 }],
      });

    await request(app)
      .post(`/api/attempts/${sandboxId}/events`)
      .set('Authorization', `Bearer ${examinerToken}`)
      .send({ type: 'tab_hidden', details: 'Sandbox event' });

    const submitRes = await request(app)
      .post(`/api/attempts/${sandboxId}/submit`)
      .set('Authorization', `Bearer ${examinerToken}`);
    expect(submitRes.status).toBe(200);
    expect(submitRes.body.data.attempt.status).toBe('graded');
    expect(submitRes.body.data.attempt.totalScore).toBe(5);

    // Real submissions, analytics, incidents, and admin overview remain completely unaffected
    const [subsRes, analyticsRes, incRes, overviewMid] = await Promise.all([
      request(app).get(`/api/exams/${draftExam._id}/submissions`).set('Authorization', `Bearer ${examinerToken}`),
      request(app).get(`/api/exams/${draftExam._id}/analytics`).set('Authorization', `Bearer ${examinerToken}`),
      request(app).get(`/api/exams/${draftExam._id}/incidents`).set('Authorization', `Bearer ${examinerToken}`),
      request(app).get('/api/admin/overview').set('Authorization', `Bearer ${adminToken}`),
    ]);
    expect(subsRes.body.data.submissions).toHaveLength(0);
    expect(analyticsRes.body.data.attemptCount).toBe(0);
    expect(incRes.body.data.incidents).toHaveLength(0);
    expect(overviewMid.body.data.attempts).toBe(baselineAttempts);

    // Wipe sandbox attempts and incidents
    const delRes = await request(app)
      .delete(`/api/exams/${draftExam._id}/sandbox`)
      .set('Authorization', `Bearer ${examinerToken}`);
    expect(delRes.status).toBe(200);
    expect(delRes.body.data.deletedCount).toBe(1);
    expect(await Attempt.countDocuments({ examId: draftExam._id, isSandbox: true })).toBe(0);
    expect(await Incident.countDocuments({ attemptId: sandboxId })).toBe(0);
  });

  it('computes accurate per-question analytics, observedDifficulty, and optionDistribution excluding sandbox', async () => {
    const o1A = new mongoose.Types.ObjectId();
    const o1B = new mongoose.Types.ObjectId();
    const o2A = new mongoose.Types.ObjectId();
    const o2B = new mongoose.Types.ObjectId();

    const q1 = await Question.create({
      createdBy: examiner._id,
      type: 'single',
      text: 'Q1 Medium',
      options: [{ _id: o1A, text: 'Right' }, { _id: o1B, text: 'Wrong' }],
      correctOptionIds: [o1A],
      topic: 'Algo',
      difficulty: 'easy',
      marks: 4,
    });
    const q2 = await Question.create({
      createdBy: examiner._id,
      type: 'single',
      text: 'Q2 Skipped',
      options: [{ _id: o2A, text: 'Yes' }, { _id: o2B, text: 'No' }],
      correctOptionIds: [o2A],
      topic: 'Algo',
      difficulty: 'hard',
      marks: 4,
    });

    const exam = await Exam.create({
      createdBy: examiner._id,
      title: 'Question Analytics Exam',
      startAt: new Date(baseNow.getTime() - 10 * 60 * 1000),
      endAt: new Date(baseNow.getTime() + 60 * 60 * 1000),
      durationMinutes: 30,
      totalMarks: 8,
      status: 'published',
      questions: [
        { questionId: q1._id, marks: 4, order: 0 },
        { questionId: q2._id, marks: 4, order: 1 },
      ],
    });
    await Enrollment.insertMany([
      { examId: exam._id, userId: candA._id, enrolledBy: examiner._id, status: 'active' },
      { examId: exam._id, userId: candB._id, enrolledBy: examiner._id, status: 'active' },
    ]);

    // Sandbox attempt by examiner should NOT be counted in question analytics
    const sbStart = await request(app)
      .post(`/api/exams/${exam._id}/sandbox/start`)
      .set('Authorization', `Bearer ${examinerToken}`);
    await request(app)
      .post(`/api/attempts/${sbStart.body.data.attempt.id}/submit`)
      .set('Authorization', `Bearer ${examinerToken}`);

    // Cand A: Q1 right (+4), Q2 skipped
    const sA = await request(app)
      .post(`/api/candidate/exams/${exam._id}/start`)
      .set('Authorization', `Bearer ${candAToken}`);
    await request(app)
      .put(`/api/attempts/${sA.body.data.attempt.id}/answers`)
      .set('Authorization', `Bearer ${candAToken}`)
      .send({ answers: [{ questionId: String(q1._id), selectedOptionIds: [String(o1A)], seq: 1 }] });
    await request(app)
      .post(`/api/attempts/${sA.body.data.attempt.id}/submit`)
      .set('Authorization', `Bearer ${candAToken}`);

    // Cand B: Q1 wrong (0), Q2 skipped
    const sB = await request(app)
      .post(`/api/candidate/exams/${exam._id}/start`)
      .set('Authorization', `Bearer ${candBToken}`);
    await request(app)
      .put(`/api/attempts/${sB.body.data.attempt.id}/answers`)
      .set('Authorization', `Bearer ${candBToken}`)
      .send({ answers: [{ questionId: String(q1._id), selectedOptionIds: [String(o1B)], seq: 1 }] });
    await request(app)
      .post(`/api/attempts/${sB.body.data.attempt.id}/submit`)
      .set('Authorization', `Bearer ${candBToken}`);

    const qStatsRes = await request(app)
      .get(`/api/exams/${exam._id}/questions/analytics`)
      .set('Authorization', `Bearer ${examinerToken}`);
    expect(qStatsRes.status).toBe(200);
    const items = qStatsRes.body.data.questions;
    expect(items).toHaveLength(2);

    expect(items[0]).toMatchObject({
      questionId: String(q1._id),
      totalAttempts: 2,
      answeredCount: 2,
      skippedCount: 0,
      skippedRate: 0,
      correctCount: 1,
      correctRate: 0.5,
      avgScore: 2,
      observedDifficulty: 'medium',
    });
    expect(items[0].optionDistribution.find((o) => o.optionId === String(o1A))).toMatchObject({
      count: 1,
      percentage: 50,
    });

    expect(items[1]).toMatchObject({
      questionId: String(q2._id),
      totalAttempts: 2,
      answeredCount: 0,
      skippedCount: 2,
      skippedRate: 1,
      correctCount: 0,
      correctRate: 0,
      observedDifficulty: 'hard',
    });
  });

  it('imports questions via CSV and JSON with partial-row error reporting and dryRun safety', async () => {
    const csvContent = [
      'type,text,topic,difficulty,marks,options,correctIndexes,schemeMode,negativeMarks',
      'single,What is 5+5?,Math,easy,2,8|10|12,1,all_or_nothing,0.5',
      'written,Explain ACID,Databases,medium,5,,,,',
      'single,Bad single missing option?,Broken,easy,2,OnlyOne,0,,',
    ].join('\n');

    const dryRes = await request(app)
      .post('/api/questions/import?dryRun=true')
      .set('Authorization', `Bearer ${examinerToken}`)
      .send({ format: 'csv', content: csvContent });
    expect(dryRes.status).toBe(200);
    expect(dryRes.body.data.dryRun).toBe(true);
    expect(dryRes.body.data.total).toBe(3);
    expect(dryRes.body.data.imported).toBe(0);
    expect(dryRes.body.data.failed).toBe(1);
    expect(dryRes.body.data.errors[0]).toMatchObject({ row: 3, field: 'options' });
    expect(await Question.countDocuments({ createdBy: examiner._id })).toBe(0);

    const realCsvRes = await request(app)
      .post('/api/questions/import')
      .set('Authorization', `Bearer ${examinerToken}`)
      .send({ format: 'csv', content: csvContent });
    expect(realCsvRes.status).toBe(200);
    expect(realCsvRes.body.data.imported).toBe(2);
    expect(realCsvRes.body.data.failed).toBe(1);
    expect(realCsvRes.body.data.questionIds).toHaveLength(2);
    expect(await Question.countDocuments({ createdBy: examiner._id })).toBe(2);

    const jsonRes = await request(app)
      .post('/api/questions/import')
      .set('Authorization', `Bearer ${examinerToken}`)
      .send({
        format: 'json',
        content: [
          {
            type: 'multiple',
            text: 'Select primes',
            topic: 'Math',
            difficulty: 'medium',
            marks: 4,
            options: ['2', '3', '4'],
            correctIndexes: [0, 1],
            schemeMode: 'partial',
          },
        ],
      });
    expect(jsonRes.status).toBe(200);
    expect(jsonRes.body.data.imported).toBe(1);
    expect(await Question.countDocuments({ createdBy: examiner._id })).toBe(3);
  });

  it('imports exam candidate enrollments via CSV, creates missing candidates cleanly, and rejects non-candidate roles', async () => {
    const exam = await Exam.create({
      createdBy: examiner._id,
      title: 'Bulk Enroll Exam',
      startAt: new Date(baseNow.getTime() + 60 * 60 * 1000),
      endAt: new Date(baseNow.getTime() + 120 * 60 * 1000),
      durationMinutes: 45,
      status: 'draft',
    });

    const newCandEmail = testEmail('imp_newcand');
    const csvRoster = [
      'email,name,rollNo',
      `${candA.email},Cand A,R-1`,
      `${newCandEmail},Imported Candidate,R-99`,
      `${examinerOther.email},Not A Candidate,EX-1`,
    ].join('\n');

    const res = await request(app)
      .post(`/api/exams/${exam._id}/enrollments/import`)
      .set('Authorization', `Bearer ${examinerToken}`)
      .send({
        format: 'csv',
        content: csvRoster,
        createMissingCandidates: true,
      });

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      total: 3,
      imported: 2,
      alreadyEnrolled: 0,
      createdUsers: 1,
      failed: 1,
      dryRun: false,
    });
    expect(res.body.data.errors).toHaveLength(1);
    expect(res.body.data.errors[0]).toMatchObject({ row: 3, field: 'email' });

    const createdUser = await User.findOne({ email: newCandEmail });
    expect(createdUser).not.toBeNull();
    expect(createdUser.role).toBe('candidate');
    expect(await Enrollment.countDocuments({ examId: exam._id, status: 'active' })).toBe(2);
  });
});
