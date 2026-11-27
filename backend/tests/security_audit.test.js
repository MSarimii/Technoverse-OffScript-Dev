import 'dotenv/config';
import mongoose from 'mongoose';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import Announcement from '../src/models/Announcement.js';
import Attempt from '../src/models/Attempt.js';
import AuditLog from '../src/models/AuditLog.js';
import Enrollment from '../src/models/Enrollment.js';
import Exam from '../src/models/Exam.js';
import Incident from '../src/models/Incident.js';
import Question from '../src/models/Question.js';
import ReportVerification from '../src/models/ReportVerification.js';
import User from '../src/models/User.js';
import { autoGradeAttempt } from '../src/services/autoGrader.js';
import { getOrCreateVerification } from '../src/services/reportService.js';
import { resetClock } from '../src/utils/time.js';

const TAG = `p10_${Date.now()}`;
const emailOf = (label) => `${TAG}_${label}@test.sems.edu`;

const ALL_MODELS = [
  User,
  Question,
  Exam,
  Enrollment,
  Attempt,
  Incident,
  Announcement,
  AuditLog,
  ReportVerification,
];

describe('Phase 10 Security Audit, Hardening & Index Sync', () => {
  const originalJwtSecret = process.env.JWT_SECRET;
  const originalAllowRegister = process.env.ALLOW_SELF_REGISTER;
  const originalHmacSecret = process.env.VERIFY_HMAC_SECRET;
  const app = createApp();

  beforeAll(async () => {
    const uri = process.env.MONGODB_TEST_URI;
    if (!uri) {
      throw new Error('MONGODB_TEST_URI is required');
    }
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'phase10_security_audit_jwt_secret_32ch';
    process.env.VERIFY_HMAC_SECRET =
      process.env.VERIFY_HMAC_SECRET || 'phase10_security_audit_hmac_secret_32ch';
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    await Promise.all(ALL_MODELS.map((m) => m.init()));
  });

  beforeEach(async () => {
    resetClock();
    process.env.ALLOW_SELF_REGISTER = originalAllowRegister;
    const users = await User.find({ email: { $regex: `^${TAG}_` } }).select('_id');
    const userIds = users.map((u) => u._id);
    if (userIds.length > 0) {
      const exams = await Exam.find({ createdBy: { $in: userIds } }).select('_id');
      const examIds = exams.map((e) => e._id);
      await Promise.all([
        ReportVerification.deleteMany({ examId: { $in: examIds } }),
        AuditLog.deleteMany({ actorId: { $in: userIds } }),
        Announcement.deleteMany({ examId: { $in: examIds } }),
        Incident.deleteMany({ userId: { $in: userIds } }),
        Attempt.deleteMany({ userId: { $in: userIds } }),
        Enrollment.deleteMany({ userId: { $in: userIds } }),
        Exam.deleteMany({ _id: { $in: examIds } }),
        Question.deleteMany({ createdBy: { $in: userIds } }),
        User.deleteMany({ _id: { $in: userIds } }),
      ]);
    }
  });

  afterAll(async () => {
    resetClock();
    process.env.JWT_SECRET = originalJwtSecret;
    process.env.ALLOW_SELF_REGISTER = originalAllowRegister;
    process.env.VERIFY_HMAC_SECRET = originalHmacSecret;
    if (mongoose.connection.readyState === 1) {
      const users = await User.find({ email: { $regex: `^${TAG}_` } }).select('_id');
      const userIds = users.map((u) => u._id);
      if (userIds.length > 0) {
        const exams = await Exam.find({ createdBy: { $in: userIds } }).select('_id');
        const examIds = exams.map((e) => e._id);
        await Promise.all([
          ReportVerification.deleteMany({ examId: { $in: examIds } }),
          AuditLog.deleteMany({ actorId: { $in: userIds } }),
          Announcement.deleteMany({ examId: { $in: examIds } }),
          Incident.deleteMany({ userId: { $in: userIds } }),
          Attempt.deleteMany({ userId: { $in: userIds } }),
          Enrollment.deleteMany({ userId: { $in: userIds } }),
          Exam.deleteMany({ _id: { $in: examIds } }),
          Question.deleteMany({ createdBy: { $in: userIds } }),
          User.deleteMany({ _id: { $in: userIds } }),
        ]);
      }
      await mongoose.disconnect();
    }
  });

  const makeUser = (label, role, rollNo) =>
    User.create({
      name: `User ${label}`,
      email: emailOf(label),
      passwordHash: 'AuditPass123!',
      role,
      ...(rollNo ? { rollNo } : {}),
    });

  const loginAs = async (email) => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email, password: 'AuditPass123!' });
    expect(res.status).toBe(200);
    return res.body.data.token;
  };

  const setupOwnedScenario = async () => {
    const examinerA = await makeUser('exA', 'examiner');
    const examinerB = await makeUser('exB', 'examiner');
    const candidateA = await makeUser('candA', 'candidate', `${TAG}-A`);
    const candidateB = await makeUser('candB', 'candidate', `${TAG}-B`);
    const [tokenExA, tokenExB, tokenCandA, tokenCandB] = await Promise.all([
      loginAs(examinerA.email),
      loginAs(examinerB.email),
      loginAs(candidateA.email),
      loginAs(candidateB.email),
    ]);

    const qRes = await request(app)
      .post('/api/questions')
      .set('Authorization', `Bearer ${tokenExA}`)
      .send({
        type: 'single',
        text: `${TAG} Which cipher mode provides authenticated encryption?`,
        options: [{ text: 'AES-GCM' }, { text: 'AES-ECB' }],
        correctOptionIndexes: [0],
        topic: 'Security',
        difficulty: 'medium',
        marks: 4,
      });
    expect(qRes.status).toBe(201);
    const questionId = qRes.body.data.question.id;

    const nowMs = Date.now();
    const examRes = await request(app)
      .post('/api/exams')
      .set('Authorization', `Bearer ${tokenExA}`)
      .send({
        title: `${TAG} Security Audit Exam`,
        startAt: new Date(nowMs - 60 * 60 * 1000).toISOString(),
        endAt: new Date(nowMs + 2 * 60 * 60 * 1000).toISOString(),
        durationMinutes: 30,
      });
    expect(examRes.status).toBe(201);
    const examId = examRes.body.data.exam.id;

    await request(app)
      .put(`/api/exams/${examId}/questions`)
      .set('Authorization', `Bearer ${tokenExA}`)
      .send({ questions: [{ questionId }] })
      .expect(200);

    await request(app)
      .post(`/api/exams/${examId}/enrollments`)
      .set('Authorization', `Bearer ${tokenExA}`)
      .send({ userIds: [String(candidateA._id), String(candidateB._id)] })
      .expect(200);

    await request(app)
      .post(`/api/exams/${examId}/publish`)
      .set('Authorization', `Bearer ${tokenExA}`)
      .expect(200);

    return {
      examinerA,
      examinerB,
      candidateA,
      candidateB,
      tokenExA,
      tokenExB,
      tokenCandA,
      tokenCandB,
      questionId,
      examId,
    };
  };

  it('rejects mass assignment payloads across register, start, autosave, and manual grading with 400 VALIDATION_ERROR', async () => {
    process.env.ALLOW_SELF_REGISTER = 'true';
    const regAttack = await request(app).post('/api/auth/register').send({
      name: 'Mallory Attacker',
      email: emailOf('mallory'),
      password: 'Password123!',
      role: 'admin',
    });
    expect(regAttack.status).toBe(400);
    expect(regAttack.body.error.code).toBe('VALIDATION_ERROR');
    expect(await User.findOne({ email: emailOf('mallory') })).toBeNull();

    const { tokenCandA, tokenExA, examId, questionId } = await setupOwnedScenario();

    const sandboxBypass = await request(app)
      .post(`/api/candidate/exams/${examId}/start`)
      .set('Authorization', `Bearer ${tokenCandA}`)
      .send({ isSandbox: true, status: 'graded' });
    expect(sandboxBypass.status).toBe(400);
    expect(sandboxBypass.body.error.code).toBe('VALIDATION_ERROR');

    const startRes = await request(app)
      .post(`/api/candidate/exams/${examId}/start`)
      .set('Authorization', `Bearer ${tokenCandA}`)
      .expect(201);
    const attemptId = startRes.body.data.attempt.id;
    const optionId = startRes.body.data.attempt.paper[0].optionOrder[0].optionId;

    const autosaveMass = await request(app)
      .put(`/api/attempts/${attemptId}/answers`)
      .set('Authorization', `Bearer ${tokenCandA}`)
      .send({
        answers: [{ questionId, selectedOptionIds: [optionId], seq: 1 }],
        totalScore: 999,
      });
    expect(autosaveMass.status).toBe(400);
    expect(autosaveMass.body.error.code).toBe('VALIDATION_ERROR');

    const submitMass = await request(app)
      .post(`/api/attempts/${attemptId}/submit`)
      .set('Authorization', `Bearer ${tokenCandA}`)
      .send({ totalScore: 100 });
    expect(submitMass.status).toBe(400);
    expect(submitMass.body.error.code).toBe('VALIDATION_ERROR');

    await request(app)
      .post(`/api/attempts/${attemptId}/submit`)
      .set('Authorization', `Bearer ${tokenCandA}`)
      .expect(200);

    const gradeMass = await request(app)
      .put(`/api/attempts/${attemptId}/grades/${questionId}`)
      .set('Authorization', `Bearer ${tokenExA}`)
      .send({ score: 4, autoScore: 999 });
    expect(gradeMass.status).toBe(400);
    expect(gradeMass.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('strips NoSQL operators and dotted keys on body and query via sanitizeMiddleware without leaking or 500s', async () => {
    await makeUser('target_user', 'admin');

    const nosqlLogin = await request(app)
      .post('/api/auth/login')
      .send({
        email: { $gt: '' },
        password: { $ne: '' },
      });
    expect(nosqlLogin.status).toBe(400);
    expect(nosqlLogin.body.success).toBe(false);
    expect(nosqlLogin.body.error.code).toBe('VALIDATION_ERROR');

    const { tokenExA } = await setupOwnedScenario();
    const nosqlQuery = await request(app)
      .get('/api/questions?topic[$ne]=Security&a.b=1')
      .set('Authorization', `Bearer ${tokenExA}`);
    expect(nosqlQuery.status).not.toBe(500);
    expect(nosqlQuery.body.error?.code).toBe('VALIDATION_ERROR');

    const loginWithOperatorKeys = await request(app)
      .post('/api/auth/login')
      .set('X-Forwarded-For', '203.0.113.55')
      .send({
        email: emailOf('target_user'),
        password: 'wrong',
        $where: 'this.role == "admin"',
        'nested.dotted': 'probe',
      });
    expect(loginWithOperatorKeys.status).toBe(401);
    expect(loginWithOperatorKeys.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('enforces cross-tenant IDOR protections for Candidates and Examiners across attempts, results, PDFs, exams, and questions', async () => {
    const {
      tokenExA,
      tokenExB,
      tokenCandA,
      tokenCandB,
      questionId,
      examId,
    } = await setupOwnedScenario();

    const startA = await request(app)
      .post(`/api/candidate/exams/${examId}/start`)
      .set('Authorization', `Bearer ${tokenCandA}`)
      .expect(201);
    const attemptAId = startA.body.data.attempt.id;

    // Candidate B cannot read, mutate, submit, view results, or export PDF for Candidate A's attempt
    await request(app)
      .get(`/api/attempts/${attemptAId}`)
      .set('Authorization', `Bearer ${tokenCandB}`)
      .expect(403);

    await request(app)
      .put(`/api/attempts/${attemptAId}/answers`)
      .set('Authorization', `Bearer ${tokenCandB}`)
      .send({ answers: [{ questionId, selectedOptionIds: [], seq: 1 }] })
      .expect(403);

    await request(app)
      .post(`/api/attempts/${attemptAId}/submit`)
      .set('Authorization', `Bearer ${tokenCandB}`)
      .expect(403);

    await request(app)
      .post(`/api/attempts/${attemptAId}/submit`)
      .set('Authorization', `Bearer ${tokenCandA}`)
      .expect(200);

    await autoGradeAttempt(attemptAId);
    const attDoc = await Attempt.findById(attemptAId);
    await getOrCreateVerification(attDoc);

    await request(app)
      .post(`/api/exams/${examId}/results/publish`)
      .set('Authorization', `Bearer ${tokenExA}`)
      .send({ force: true })
      .expect(200);

    await request(app)
      .get(`/api/candidate/results/${attemptAId}`)
      .set('Authorization', `Bearer ${tokenCandB}`)
      .expect(403);

    await request(app)
      .get(`/api/attempts/${attemptAId}/report.pdf`)
      .set('Authorization', `Bearer ${tokenCandB}`)
      .expect(403);

    // Examiner B cannot inspect, mutate, publish, grade, monitor, or view analytics/PDF on Examiner A's resources
    await request(app)
      .get(`/api/questions/${questionId}`)
      .set('Authorization', `Bearer ${tokenExB}`)
      .expect(403);

    await request(app)
      .patch(`/api/questions/${questionId}`)
      .set('Authorization', `Bearer ${tokenExB}`)
      .send({ marks: 10 })
      .expect(403);

    await request(app)
      .get(`/api/exams/${examId}`)
      .set('Authorization', `Bearer ${tokenExB}`)
      .expect(403);

    await request(app)
      .patch(`/api/exams/${examId}`)
      .set('Authorization', `Bearer ${tokenExB}`)
      .send({ title: 'Tampered Title' })
      .expect(403);

    await request(app)
      .put(`/api/attempts/${attemptAId}/grades/${questionId}`)
      .set('Authorization', `Bearer ${tokenExB}`)
      .send({ score: 1 })
      .expect(403);

    await request(app)
      .post(`/api/exams/${examId}/results/publish`)
      .set('Authorization', `Bearer ${tokenExB}`)
      .expect(403);

    await request(app)
      .get(`/api/exams/${examId}/analytics`)
      .set('Authorization', `Bearer ${tokenExB}`)
      .expect(403);

    await request(app)
      .get(`/api/exams/${examId}/monitor`)
      .set('Authorization', `Bearer ${tokenExB}`)
      .expect(403);

    await request(app)
      .get(`/api/exams/${examId}/report.pdf`)
      .set('Authorization', `Bearer ${tokenExB}`)
      .expect(403);

    // Candidate cannot access examiner/admin routes
    await request(app)
      .get('/api/admin/overview')
      .set('Authorization', `Bearer ${tokenCandA}`)
      .expect(403);

    await request(app)
      .get('/api/questions')
      .set('Authorization', `Bearer ${tokenCandA}`)
      .expect(403);
  });

  it('synchronizes indexes cleanly across all 9 Mongoose models without conflicts', async () => {
    for (const Model of ALL_MODELS) {
      await expect(Model.syncIndexes()).resolves.toBeDefined();
    }
  });
});
