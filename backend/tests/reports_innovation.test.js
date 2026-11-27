import 'dotenv/config';
import mongoose from 'mongoose';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import Attempt from '../src/models/Attempt.js';
import Enrollment from '../src/models/Enrollment.js';
import Exam from '../src/models/Exam.js';
import Question from '../src/models/Question.js';
import ReportVerification from '../src/models/ReportVerification.js';
import User from '../src/models/User.js';
import { resetClock, setClock } from '../src/utils/time.js';

const TEST_RUN_TAG = `p8b9_${Date.now()}`;
const testEmail = (label) => `${TEST_RUN_TAG}_${label}@test.sems.edu`;

const app = createApp();

describe('Phase 8b + 9 PDF Reports, QR Verification & Innovations (5.2 + 5.3)', () => {
  const originalJwtSecret = process.env.JWT_SECRET;
  const originalGrace = process.env.RECONNECT_GRACE_SECONDS;
  let examiner;
  let candA;
  let candB;
  let examinerToken;
  let candAToken;
  let candBToken;

  const baseNow = new Date('2026-11-27T13:00:00.000Z');
  const setMockTime = (offsetMs = 0) => setClock(() => new Date(baseNow.getTime() + offsetMs));

  const loginAs = async (email, password = 'Password123!') => {
    const res = await request(app).post('/api/auth/login').send({ email, password });
    return res.body.data.token;
  };

  beforeAll(async () => {
    const testUri = process.env.MONGODB_TEST_URI;
    if (!testUri) {
      throw new Error('MONGODB_TEST_URI must be set to run Phase 8b+9 tests');
    }
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'phase8b9_vitest_secret_key_min_32_chars';
    await mongoose.connect(testUri, { serverSelectionTimeoutMS: 5000 });
    await Promise.all([
      User.init(),
      Question.init(),
      Exam.init(),
      Enrollment.init(),
      Attempt.init(),
      ReportVerification.init(),
    ]);

    await User.deleteMany({ email: { $regex: `^${TEST_RUN_TAG}_` } });

    [examiner, candA, candB] = await Promise.all([
      User.create({
        name: 'Examiner P8B9',
        email: testEmail('examiner'),
        passwordHash: 'Password123!',
        role: 'examiner',
      }),
      User.create({
        name: 'Alice Candidate',
        email: testEmail('cand_a'),
        passwordHash: 'Password123!',
        role: 'candidate',
        rollNo: 'CS-2026-89',
      }),
      User.create({
        name: 'Bob Candidate',
        email: testEmail('cand_b'),
        passwordHash: 'Password123!',
        role: 'candidate',
        rollNo: 'CS-2026-90',
      }),
    ]);

    [examinerToken, candAToken, candBToken] = await Promise.all([
      loginAs(examiner.email),
      loginAs(candA.email),
      loginAs(candB.email),
    ]);
  });

  beforeEach(async () => {
    setMockTime(0);
    process.env.RECONNECT_GRACE_SECONDS = '30';
    const examIds = await Exam.find({ createdBy: examiner._id }).distinct('_id');
    await Promise.all([
      ReportVerification.deleteMany({ examId: { $in: examIds } }),
      Attempt.deleteMany({ examId: { $in: examIds } }),
      Enrollment.deleteMany({ examId: { $in: examIds } }),
      Exam.deleteMany({ _id: { $in: examIds } }),
      Question.deleteMany({ createdBy: examiner._id }),
      User.deleteMany({ email: { $regex: `^${TEST_RUN_TAG}_pool_` } }),
    ]);
  });

  afterEach(() => {
    resetClock();
  });

  afterAll(async () => {
    if (mongoose.connection.readyState === 1) {
      const examIds = await Exam.find({ createdBy: examiner._id }).distinct('_id');
      await Promise.all([
        ReportVerification.deleteMany({ examId: { $in: examIds } }),
        Attempt.deleteMany({ examId: { $in: examIds } }),
        Enrollment.deleteMany({ examId: { $in: examIds } }),
        Exam.deleteMany({ _id: { $in: examIds } }),
        Question.deleteMany({ createdBy: examiner._id }),
        User.deleteMany({ email: { $regex: `^${TEST_RUN_TAG}_` } }),
      ]);
      await mongoose.disconnect();
    }
    process.env.JWT_SECRET = originalJwtSecret;
    process.env.RECONNECT_GRACE_SECONDS = originalGrace;
  });

  const pdfPrefix = (res) =>
    Buffer.isBuffer(res.body) ? res.body.slice(0, 5).toString('ascii') : String(res.text).slice(0, 5);

  it('streams valid %PDF- reports and enforces publishing and ownership gates on candidate PDF', async () => {
    const o1 = new mongoose.Types.ObjectId();
    const o2 = new mongoose.Types.ObjectId();
    const q1 = await Question.create({
      createdBy: examiner._id,
      type: 'single',
      text: 'Verify PDF Question',
      options: [{ _id: o1, text: 'True' }, { _id: o2, text: 'False' }],
      correctOptionIds: [o1],
      topic: 'Systems',
      difficulty: 'easy',
      marks: 10,
    });

    const exam = await Exam.create({
      createdBy: examiner._id,
      title: 'Verification Exam',
      startAt: new Date(baseNow.getTime() - 10 * 60 * 1000),
      endAt: new Date(baseNow.getTime() + 90 * 60 * 1000),
      durationMinutes: 45,
      totalMarks: 10,
      status: 'published',
      questions: [{ questionId: q1._id, marks: 10, order: 0 }],
    });
    await Enrollment.create({
      examId: exam._id,
      userId: candA._id,
      enrolledBy: examiner._id,
      status: 'active',
    });

    const startRes = await request(app)
      .post(`/api/candidate/exams/${exam._id}/start`)
      .set('Authorization', `Bearer ${candAToken}`);
    const attemptId = startRes.body.data.attempt.id;

    await request(app)
      .put(`/api/attempts/${attemptId}/answers`)
      .set('Authorization', `Bearer ${candAToken}`)
      .send({ answers: [{ questionId: String(q1._id), selectedOptionIds: [String(o1)], seq: 1 }] });
    await request(app)
      .post(`/api/attempts/${attemptId}/submit`)
      .set('Authorization', `Bearer ${candAToken}`);

    // Candidate blocked before publish -> 403 RESULTS_NOT_PUBLISHED
    const blockedCandPdf = await request(app)
      .get(`/api/attempts/${attemptId}/report.pdf`)
      .set('Authorization', `Bearer ${candAToken}`);
    expect(blockedCandPdf.status).toBe(403);
    expect(blockedCandPdf.body.error.code).toBe('RESULTS_NOT_PUBLISHED');

    // Other candidate always blocked -> 403 FORBIDDEN
    const otherCandPdf = await request(app)
      .get(`/api/attempts/${attemptId}/report.pdf`)
      .set('Authorization', `Bearer ${candBToken}`);
    expect(otherCandPdf.status).toBe(403);

    // Examiner exam report PDF streams cleanly
    const examPdfRes = await request(app)
      .get(`/api/exams/${exam._id}/report.pdf`)
      .set('Authorization', `Bearer ${examinerToken}`);
    expect(examPdfRes.status).toBe(200);
    expect(examPdfRes.headers['content-type']).toContain('application/pdf');
    expect(pdfPrefix(examPdfRes)).toBe('%PDF-');

    // Examiner publishes results -> candidate report PDF succeeds cleanly
    await request(app)
      .post(`/api/exams/${exam._id}/results/publish`)
      .set('Authorization', `Bearer ${examinerToken}`)
      .send({});

    const candPdfRes = await request(app)
      .get(`/api/attempts/${attemptId}/report.pdf`)
      .set('Authorization', `Bearer ${candAToken}`);
    expect(candPdfRes.status).toBe(200);
    expect(candPdfRes.headers['content-type']).toContain('application/pdf');
    expect(pdfPrefix(candPdfRes)).toBe('%PDF-');

    // Public verification check returns masked candidate + score without PII or answers
    const verification = await ReportVerification.findOne({ attemptId });
    expect(verification).not.toBeNull();

    const verifyOk = await request(app).get(`/api/verify/${verification.code}`);
    expect(verifyOk.status).toBe(200);
    expect(verifyOk.body.data).toMatchObject({
      valid: true,
      code: verification.code,
      examTitle: 'Verification Exam',
      score: { totalScore: 10, maxScore: 10, percentage: 100 },
    });
    expect(verifyOk.body.data.candidateMasked).not.toBe('Alice Candidate');
    expect(verifyOk.body.data.rollNoMasked).toBe('***89');
    expect(JSON.stringify(verifyOk.body)).not.toContain(candA.email);
    expect(JSON.stringify(verifyOk.body)).not.toContain('selectedOptionIds');

    // Modified unknown code -> valid: false
    const wrongCodeRes = await request(app).get(`/api/verify/${verification.code}X`);
    expect(wrongCodeRes.status).toBe(200);
    expect(wrongCodeRes.body.data).toEqual({ valid: false });

    // Tampered HMAC in DB -> valid: false
    await ReportVerification.findByIdAndUpdate(verification._id, {
      hmac: '0'.repeat(64),
    });
    const tamperedRes = await request(app).get(`/api/verify/${verification.code}`);
    expect(tamperedRes.status).toBe(200);
    expect(tamperedRes.body.data).toEqual({ valid: false });
  });

  it('enforces Difficulty-Stratified Fairness (5.2) across 10 poolMode randomized papers with zero difficulty spread', async () => {
    const createPoolQ = async (difficulty, idx) => {
      const a = new mongoose.Types.ObjectId();
      const b = new mongoose.Types.ObjectId();
      return Question.create({
        createdBy: examiner._id,
        type: 'single',
        text: `Pool ${difficulty} #${idx}`,
        options: [{ _id: a, text: 'Right' }, { _id: b, text: 'Wrong' }],
        correctOptionIds: [a],
        topic: 'Algorithms',
        difficulty,
        marks: 2,
      });
    };

    const poolQuestions = await Promise.all([
      createPoolQ('easy', 1),
      createPoolQ('easy', 2),
      createPoolQ('easy', 3),
      createPoolQ('easy', 4),
      createPoolQ('medium', 1),
      createPoolQ('medium', 2),
      createPoolQ('medium', 3),
      createPoolQ('medium', 4),
      createPoolQ('hard', 1),
      createPoolQ('hard', 2),
    ]);

    const exam = await Exam.create({
      createdBy: examiner._id,
      title: 'Fairness Stratified Pool Exam',
      startAt: new Date(baseNow.getTime() - 10 * 60 * 1000),
      endAt: new Date(baseNow.getTime() + 120 * 60 * 1000),
      durationMinutes: 60,
      totalMarks: 20,
      status: 'published',
      settings: { shuffleQuestions: true, shuffleOptions: true },
      questions: poolQuestions.map((q, order) => ({ questionId: q._id, marks: 2, order })),
      blueprint: { easy: 2, medium: 2, hard: 1, poolMode: true },
    });

    const poolCandidates = await Promise.all(
      Array.from({ length: 10 }, (_, idx) =>
        User.create({
          name: `Pool Cand ${idx}`,
          email: testEmail(`pool_${idx}`),
          passwordHash: 'Password123!',
          role: 'candidate',
        })
      )
    );
    await Enrollment.insertMany(
      poolCandidates.map((u) => ({
        examId: exam._id,
        userId: u._id,
        enrolledBy: examiner._id,
        status: 'active',
      }))
    );

    const tokens = await Promise.all(poolCandidates.map((u) => loginAs(u.email)));
    const papers = await Promise.all(
      tokens.map((tok) =>
        request(app)
          .post(`/api/candidate/exams/${exam._id}/start`)
          .set('Authorization', `Bearer ${tok}`)
      )
    );

    for (const res of papers) {
      expect(res.status).toBe(201);
      const paper = res.body.data.attempt.paper;
      const counts = { easy: 0, medium: 0, hard: 0 };
      for (const item of paper) counts[item.difficulty] += 1;
      expect(counts).toEqual({ easy: 2, medium: 2, hard: 1 });
    }

    const fairnessRes = await request(app)
      .get(`/api/exams/${exam._id}/fairness`)
      .set('Authorization', `Bearer ${examinerToken}`);
    expect(fairnessRes.status).toBe(200);
    expect(fairnessRes.body.data).toMatchObject({
      attemptCount: 10,
      strataConfigured: { easy: 2, medium: 2, hard: 1, poolMode: true },
      difficultyIndexStats: { min: 1.8, max: 1.8, mean: 1.8, spread: 0 },
      fairnessStatus: 'balanced',
    });
    expect(fairnessRes.body.data.uniqueFingerprints).toBeGreaterThanOrEqual(2);
  });

  it('supports Bounded Reconnect-Grace Resilience (5.3) within RECONNECT_GRACE_SECONDS without extending deadlineAt', async () => {
    process.env.RECONNECT_GRACE_SECONDS = '30';
    const o1 = new mongoose.Types.ObjectId();
    const o2 = new mongoose.Types.ObjectId();
    const q1 = await Question.create({
      createdBy: examiner._id,
      type: 'single',
      text: 'Grace Q1',
      options: [{ _id: o1, text: 'Right' }, { _id: o2, text: 'Wrong' }],
      correctOptionIds: [o1],
      topic: 'Networks',
      difficulty: 'easy',
      marks: 5,
    });

    const exam = await Exam.create({
      createdBy: examiner._id,
      title: 'Resilience Grace Exam',
      startAt: new Date(baseNow.getTime() - 10 * 60 * 1000),
      endAt: new Date(baseNow.getTime() + 90 * 60 * 1000),
      durationMinutes: 10,
      totalMarks: 5,
      status: 'published',
      questions: [{ questionId: q1._id, marks: 5, order: 0 }],
    });

    await Enrollment.insertMany([
      { examId: exam._id, userId: candA._id, enrolledBy: examiner._id, status: 'active' },
      { examId: exam._id, userId: candB._id, enrolledBy: examiner._id, status: 'active' },
    ]);

    // 1. Valid offline-buffered flush 15s after deadline with clientSavedAt 10s BEFORE deadline -> accepted + finalized
    const sA = await request(app)
      .post(`/api/candidate/exams/${exam._id}/start`)
      .set('Authorization', `Bearer ${candAToken}`);
    const attAId = sA.body.data.attempt.id;
    const deadlineA = new Date(sA.body.data.attempt.deadlineAt);

    setClock(() => new Date(deadlineA.getTime() + 15 * 1000));
    const graceOk = await request(app)
      .put(`/api/attempts/${attAId}/answers`)
      .set('Authorization', `Bearer ${candAToken}`)
      .send({
        answers: [{ questionId: String(q1._id), selectedOptionIds: [String(o1)], seq: 1 }],
        offlineBuffered: true,
        clientSavedAt: new Date(deadlineA.getTime() - 10 * 1000).toISOString(),
      });
    expect(graceOk.status).toBe(200);
    expect(graceOk.body.data.saved).toEqual([String(q1._id)]);
    expect(graceOk.body.data.finalizedByGrace).toBe(true);
    expect(graceOk.body.data.remainingMs).toBe(0);

    const dbA = await Attempt.findById(attAId);
    expect(dbA.deadlineAt.getTime()).toBe(deadlineA.getTime()); // deadlineAt never extended
    expect(dbA.status).toBe('graded');
    expect(dbA.finalizedBy).toBe('expiry');
    expect(dbA.totalScore).toBe(5);

    // 2. Cand B: clientSavedAt > deadlineAt OR flush beyond grace window -> rejected with 409 ATTEMPT_EXPIRED
    setMockTime(0);
    const sB = await request(app)
      .post(`/api/candidate/exams/${exam._id}/start`)
      .set('Authorization', `Bearer ${candBToken}`);
    const attBId = sB.body.data.attempt.id;
    const deadlineB = new Date(sB.body.data.attempt.deadlineAt);

    // First test post-deadline clientSavedAt within grace window (must reject because answer wasn't captured before deadline!)
    setClock(() => new Date(deadlineB.getTime() + 10 * 1000));
    const badClientTime = await request(app)
      .put(`/api/attempts/${attBId}/answers`)
      .set('Authorization', `Bearer ${candBToken}`)
      .send({
        answers: [{ questionId: String(q1._id), selectedOptionIds: [String(o1)], seq: 1 }],
        offlineBuffered: true,
        clientSavedAt: new Date(deadlineB.getTime() + 2 * 1000).toISOString(),
      });
    expect(badClientTime.status).toBe(409);
    expect(badClientTime.body.error.code).toBe('ATTEMPT_EXPIRED');

    // Also confirm flush beyond 30s grace window is rejected even with valid clientSavedAt
    const exam2 = await Exam.create({
      createdBy: examiner._id,
      title: 'Resilience Grace Expired Exam',
      startAt: new Date(baseNow.getTime() - 10 * 60 * 1000),
      endAt: new Date(baseNow.getTime() + 90 * 60 * 1000),
      durationMinutes: 10,
      totalMarks: 5,
      status: 'published',
      questions: [{ questionId: q1._id, marks: 5, order: 0 }],
    });
    await Enrollment.create({
      examId: exam2._id,
      userId: candB._id,
      enrolledBy: examiner._id,
      status: 'active',
    });
    setMockTime(0);
    const sB2 = await request(app)
      .post(`/api/candidate/exams/${exam2._id}/start`)
      .set('Authorization', `Bearer ${candBToken}`);
    const deadlineB2 = new Date(sB2.body.data.attempt.deadlineAt);

    setClock(() => new Date(deadlineB2.getTime() + 45 * 1000)); // > 30s grace
    const pastGrace = await request(app)
      .put(`/api/attempts/${sB2.body.data.attempt.id}/answers`)
      .set('Authorization', `Bearer ${candBToken}`)
      .send({
        answers: [{ questionId: String(q1._id), selectedOptionIds: [String(o1)], seq: 1 }],
        offlineBuffered: true,
        clientSavedAt: new Date(deadlineB2.getTime() - 5 * 1000).toISOString(),
      });
    expect(pastGrace.status).toBe(409);
    expect(pastGrace.body.error.code).toBe('ATTEMPT_EXPIRED');
  });
});
