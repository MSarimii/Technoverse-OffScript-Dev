import 'dotenv/config';
import mongoose from 'mongoose';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import Attempt from '../src/models/Attempt.js';
import AuditLog from '../src/models/AuditLog.js';
import Dispute from '../src/models/Dispute.js';
import Enrollment from '../src/models/Enrollment.js';
import Exam from '../src/models/Exam.js';
import Incident from '../src/models/Incident.js';
import Question from '../src/models/Question.js';
import ReportVerification from '../src/models/ReportVerification.js';
import User from '../src/models/User.js';
import { resetClock, setClock } from '../src/utils/time.js';

const TAG = `p10b_${Date.now()}`;
const emailOf = (label) => `${TAG}_${label}@test.sems.edu`;

describe('Phase 10b Standout Features (5.4 Disputes, 5.1 Session Guard, 4.5 Ambiguous Flag & CSV Export)', () => {
  const originalJwtSecret = process.env.JWT_SECRET;
  const originalHmacSecret = process.env.VERIFY_HMAC_SECRET;
  const app = createApp();

  beforeAll(async () => {
    const uri = process.env.MONGODB_TEST_URI;
    if (!uri) {
      throw new Error('MONGODB_TEST_URI is required');
    }
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'phase10b_jwt_secret_key_min_32_chars';
    process.env.VERIFY_HMAC_SECRET =
      process.env.VERIFY_HMAC_SECRET || 'phase10b_hmac_secret_key_min_32_chars';
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    await Promise.all([
      User.init(),
      Question.init(),
      Exam.init(),
      Enrollment.init(),
      Attempt.init(),
      Incident.init(),
      AuditLog.init(),
      ReportVerification.init(),
      Dispute.syncIndexes(),
    ]);
  });

  const cleanupTaggedData = async () => {
    const users = await User.find({ email: { $regex: `^${TAG}_` } }).select('_id');
    const userIds = users.map((u) => u._id);
    if (userIds.length > 0) {
      const exams = await Exam.find({ createdBy: { $in: userIds } }).select('_id');
      const examIds = exams.map((e) => e._id);
      await Promise.all([
        Dispute.deleteMany({ examId: { $in: examIds } }),
        ReportVerification.deleteMany({ examId: { $in: examIds } }),
        AuditLog.deleteMany({ actorId: { $in: userIds } }),
        Incident.deleteMany({ userId: { $in: userIds } }),
        Attempt.deleteMany({ userId: { $in: userIds } }),
        Enrollment.deleteMany({ userId: { $in: userIds } }),
        Exam.deleteMany({ _id: { $in: examIds } }),
        Question.deleteMany({ createdBy: { $in: userIds } }),
        User.deleteMany({ _id: { $in: userIds } }),
      ]);
    }
  };

  beforeEach(async () => {
    resetClock();
    await cleanupTaggedData();
  });

  afterAll(async () => {
    resetClock();
    process.env.JWT_SECRET = originalJwtSecret;
    process.env.VERIFY_HMAC_SECRET = originalHmacSecret;
    if (mongoose.connection.readyState === 1) {
      await cleanupTaggedData();
      await mongoose.disconnect();
    }
  });

  const makeUser = (label, role, overrides = {}) =>
    User.create({
      name: overrides.name ?? `User ${label}`,
      email: emailOf(label),
      passwordHash: 'StandoutPass123!',
      role,
      ...(overrides.rollNo ? { rollNo: overrides.rollNo } : {}),
    });

  const loginAs = async (email) => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email, password: 'StandoutPass123!' });
    expect(res.status).toBe(200);
    return res.body.data.token;
  };

  it('supports 5.4 Dispute Resolution, enforces published & duplicate guards, updates attempt scores + existing HMAC verification', async () => {
    const baseMs = Date.now();
    setClock(baseMs);

    const examiner = await makeUser('ex1', 'examiner');
    const otherExaminer = await makeUser('ex_other', 'examiner');
    const candA = await makeUser('cand1', 'candidate', { rollNo: `${TAG}-01` });
    const candB = await makeUser('cand2', 'candidate', { rollNo: `${TAG}-02` });
    const [tokenEx, tokenOtherEx, tokenCandA, tokenCandB] = await Promise.all([
      loginAs(examiner.email),
      loginAs(otherExaminer.email),
      loginAs(candA.email),
      loginAs(candB.email),
    ]);

    const q1Res = await request(app)
      .post('/api/questions')
      .set('Authorization', `Bearer ${tokenEx}`)
      .send({
        type: 'written',
        text: `${TAG} Explain idempotent autosave sequence protection.`,
        topic: 'Systems',
        difficulty: 'medium',
        marks: 5,
      })
      .expect(201);
    const q1Id = q1Res.body.data.question.id;

    const q2Res = await request(app)
      .post('/api/questions')
      .set('Authorization', `Bearer ${tokenEx}`)
      .send({
        type: 'single',
        text: `${TAG} Which HTTP status code indicates conflict?`,
        options: [{ text: '409' }, { text: '201' }],
        correctOptionIndexes: [0],
        topic: 'Systems',
        difficulty: 'easy',
        marks: 2,
      })
      .expect(201);
    const q2Id = q2Res.body.data.question.id;

    const examRes = await request(app)
      .post('/api/exams')
      .set('Authorization', `Bearer ${tokenEx}`)
      .send({
        title: `${TAG} Dispute Exam`,
        startAt: new Date(baseMs - 3600_000).toISOString(),
        endAt: new Date(baseMs + 3600_000).toISOString(),
        durationMinutes: 45,
      })
      .expect(201);
    const examId = examRes.body.data.exam.id;

    await request(app)
      .put(`/api/exams/${examId}/questions`)
      .set('Authorization', `Bearer ${tokenEx}`)
      .send({ questions: [{ questionId: q1Id }, { questionId: q2Id }] })
      .expect(200);

    await request(app)
      .post(`/api/exams/${examId}/enrollments`)
      .set('Authorization', `Bearer ${tokenEx}`)
      .send({ userIds: [String(candA._id), String(candB._id)] })
      .expect(200);

    await request(app)
      .post(`/api/exams/${examId}/publish`)
      .set('Authorization', `Bearer ${tokenEx}`)
      .expect(200);

    const startRes = await request(app)
      .post(`/api/candidate/exams/${examId}/start`)
      .set('Authorization', `Bearer ${tokenCandA}`)
      .expect(201);
    const attemptId = startRes.body.data.attempt.id;
    const q2Opt0 = startRes.body.data.attempt.paper.find((p) => p.questionId === q2Id).optionOrder[0]
      .optionId;

    await request(app)
      .put(`/api/attempts/${attemptId}/answers`)
      .set('Authorization', `Bearer ${tokenCandA}`)
      .send({
        answers: [
          { questionId: q1Id, text: 'Server drops seq <= existing.seq safely.', seq: 1 },
          { questionId: q2Id, selectedOptionIds: [q2Opt0], seq: 1 },
        ],
      })
      .expect(200);

    await request(app)
      .post(`/api/attempts/${attemptId}/submit`)
      .set('Authorization', `Bearer ${tokenCandA}`)
      .expect(200);

    await request(app)
      .put(`/api/attempts/${attemptId}/grades/${q1Id}`)
      .set('Authorization', `Bearer ${tokenEx}`)
      .send({ score: 2, feedback: 'Initial score' })
      .expect(200);

    // Unpublished exam blocks disputes
    await request(app)
      .post(`/api/attempts/${attemptId}/disputes`)
      .set('Authorization', `Bearer ${tokenCandA}`)
      .send({ questionId: q1Id, reason: 'I explained both stale check and idempotency.' })
      .expect(403);

    await request(app)
      .post(`/api/exams/${examId}/results/publish`)
      .set('Authorization', `Bearer ${tokenEx}`)
      .send({ force: true })
      .expect(200);

    // Generate ReportVerification prior to dispute resolution
    await request(app)
      .get(`/api/attempts/${attemptId}/report.pdf`)
      .set('Authorization', `Bearer ${tokenCandA}`)
      .expect(200);
    const verificationBefore = await ReportVerification.findOne({ attemptId }).lean();
    expect(verificationBefore).not.toBeNull();
    expect(verificationBefore.scoreSnapshot.totalScore).toBe(4);

    // Candidate submits dispute
    const disputeRes = await request(app)
      .post(`/api/attempts/${attemptId}/disputes`)
      .set('Authorization', `Bearer ${tokenCandA}`)
      .send({ questionId: q1Id, reason: 'Rubric criteria 2 was fully covered.' })
      .expect(201);
    const disputeId = disputeRes.body.data.dispute.id;
    expect(disputeRes.body.data.dispute.status).toBe('open');

    // Duplicate dispute returns 409 CONFLICT
    await request(app)
      .post(`/api/attempts/${attemptId}/disputes`)
      .set('Authorization', `Bearer ${tokenCandA}`)
      .send({ questionId: q1Id, reason: 'Submitting duplicate dispute should fail.' })
      .expect(409);

    // Access checks: owner & examiner allowed; non-owners blocked
    const listAttemptRes = await request(app)
      .get(`/api/attempts/${attemptId}/disputes`)
      .set('Authorization', `Bearer ${tokenCandA}`)
      .expect(200);
    expect(listAttemptRes.body.data.disputes).toHaveLength(1);

    await request(app)
      .get(`/api/attempts/${attemptId}/disputes`)
      .set('Authorization', `Bearer ${tokenCandB}`)
      .expect(403);

    const listExamRes = await request(app)
      .get(`/api/exams/${examId}/disputes?status=open`)
      .set('Authorization', `Bearer ${tokenEx}`)
      .expect(200);
    expect(listExamRes.body.data.disputes).toHaveLength(1);
    expect(listExamRes.body.data.disputes[0].candidate.email).toBe(candA.email);
    expect(listExamRes.body.data.disputes[0].question.questionId).toBe(q1Id);

    await request(app)
      .patch(`/api/disputes/${disputeId}/resolve`)
      .set('Authorization', `Bearer ${tokenOtherEx}`)
      .send({ status: 'accepted', resolutionNote: 'Unauthorized', adjustedScore: 4 })
      .expect(403);

    // Out-of-range score rejected
    const badRangeRes = await request(app)
      .patch(`/api/disputes/${disputeId}/resolve`)
      .set('Authorization', `Bearer ${tokenEx}`)
      .send({ status: 'accepted', resolutionNote: 'Too high', adjustedScore: 8 })
      .expect(400);
    expect(badRangeRes.body.error.code).toBe('SCORE_OUT_OF_RANGE');

    // Examiner accepts & adjusts score from 2 -> 4 (attempt totalScore becomes 6 / 7)
    const resolveRes = await request(app)
      .patch(`/api/disputes/${disputeId}/resolve`)
      .set('Authorization', `Bearer ${tokenEx}`)
      .send({
        status: 'accepted',
        resolutionNote: 'Awarded +2 marks after re-reading response.',
        adjustedScore: 4,
      })
      .expect(200);
    expect(resolveRes.body.data.dispute.status).toBe('accepted');
    expect(resolveRes.body.data.dispute.adjustedScore).toBe(4);
    expect(resolveRes.body.data.attemptTotalScore).toBe(6);

    const verificationAfter = await ReportVerification.findOne({ attemptId }).lean();
    expect(verificationAfter.scoreSnapshot.totalScore).toBe(6);
    expect(verificationAfter.hmac).not.toBe(verificationBefore.hmac);

    const verifyRes = await request(app)
      .get(`/api/verify/${verificationAfter.code}`)
      .expect(200);
    expect(verifyRes.body.data.valid).toBe(true);
    expect(verifyRes.body.data.score.totalScore).toBe(6);

    const auditEntry = await AuditLog.findOne({
      action: 'resolve_dispute',
      entityId: disputeId,
    }).lean();
    expect(auditEntry).not.toBeNull();
  });

  it('tracks 5.1 Single-Session Guard via x-session-id without blocking reconnects and reports connectionGapCount in monitor', async () => {
    const t0 = Date.now();
    setClock(t0);

    const examiner = await makeUser('ex_sess', 'examiner');
    const cand = await makeUser('cand_sess', 'candidate', { rollNo: `${TAG}-S1` });
    const [tokenEx, tokenCand] = await Promise.all([
      loginAs(examiner.email),
      loginAs(cand.email),
    ]);

    const qRes = await request(app)
      .post('/api/questions')
      .set('Authorization', `Bearer ${tokenEx}`)
      .send({
        type: 'single',
        text: `${TAG} Single session guard test question?`,
        options: [{ text: 'True' }, { text: 'False' }],
        correctOptionIndexes: [0],
        topic: 'Security',
        difficulty: 'easy',
        marks: 2,
      })
      .expect(201);
    const qId = qRes.body.data.question.id;

    const examRes = await request(app)
      .post('/api/exams')
      .set('Authorization', `Bearer ${tokenEx}`)
      .send({
        title: `${TAG} Session Guard Exam`,
        startAt: new Date(t0 - 600_000).toISOString(),
        endAt: new Date(t0 + 3600_000).toISOString(),
        durationMinutes: 45,
      })
      .expect(201);
    const examId = examRes.body.data.exam.id;

    await request(app)
      .put(`/api/exams/${examId}/questions`)
      .set('Authorization', `Bearer ${tokenEx}`)
      .send({ questions: [{ questionId: qId }] })
      .expect(200);

    await request(app)
      .post(`/api/exams/${examId}/enrollments`)
      .set('Authorization', `Bearer ${tokenEx}`)
      .send({ userIds: [String(cand._id)] })
      .expect(200);

    await request(app)
      .post(`/api/exams/${examId}/publish`)
      .set('Authorization', `Bearer ${tokenEx}`)
      .expect(200);

    const startRes = await request(app)
      .post(`/api/candidate/exams/${examId}/start`)
      .set('Authorization', `Bearer ${tokenCand}`)
      .set('x-session-id', 'session-tab-1')
      .expect(201);
    const attemptId = startRes.body.data.attempt.id;
    expect(startRes.body.data.attempt.activeSessionId).toBeUndefined();

    // Same session heartbeat causes zero session-switch incidents
    setClock(t0 + 20_000);
    await request(app)
      .post(`/api/attempts/${attemptId}/heartbeat`)
      .set('Authorization', `Bearer ${tokenCand}`)
      .set('x-session-id', 'session-tab-1')
      .expect(200);
    expect(await Incident.countDocuments({ attemptId, type: 'multiple_sessions' })).toBe(0);

    // Advance > 60s gap and switch session header on heartbeat: request still succeeds + logs incident & connectionGap
    setClock(t0 + 100_000);
    await request(app)
      .post(`/api/attempts/${attemptId}/heartbeat`)
      .set('Authorization', `Bearer ${tokenCand}`)
      .set('x-session-id', 'session-tab-2')
      .expect(200);

    const incidents = await Incident.find({ attemptId, type: 'multiple_sessions' }).lean();
    expect(incidents).toHaveLength(1);
    expect(incidents[0].details).toBe('Session switched to another tab or device');

    const monitorRes = await request(app)
      .get(`/api/exams/${examId}/monitor`)
      .set('Authorization', `Bearer ${tokenEx}`)
      .expect(200);
    expect(monitorRes.body.data.attempts).toHaveLength(1);
    expect(monitorRes.body.data.attempts[0].connectionGapCount).toBe(1);
    expect(monitorRes.body.data.attempts[0].incidentCount).toBe(1);
  });

  it('auto-flags 4.5 ambiguous questions for <25% accuracy and negative item discrimination', async () => {
    const baseMs = Date.now();
    setClock(baseMs);

    const examiner = await makeUser('ex_flag', 'examiner');
    const c1 = await makeUser('cflag1', 'candidate', { rollNo: `${TAG}-F1` });
    const c2 = await makeUser('cflag2', 'candidate', { rollNo: `${TAG}-F2` });
    const c3 = await makeUser('cflag3', 'candidate', { rollNo: `${TAG}-F3` });
    const c4 = await makeUser('cflag4', 'candidate', { rollNo: `${TAG}-F4` });
    const tokenEx = await loginAs(examiner.email);

    const createMcq = async (label, marks) => {
      const res = await request(app)
        .post('/api/questions')
        .set('Authorization', `Bearer ${tokenEx}`)
        .send({
          type: 'single',
          text: `${TAG} Question ${label}`,
          options: [{ text: 'Correct' }, { text: 'Wrong' }],
          correctOptionIndexes: [0],
          topic: 'Calibration',
          difficulty: 'medium',
          marks,
        })
        .expect(201);
      return res.body.data.question;
    };

    const qLow = await createMcq('low_accuracy', 2);
    const qNeg = await createMcq('negative_disc', 2);
    const qGood = await createMcq('normal_good', 6);

    const examRes = await request(app)
      .post('/api/exams')
      .set('Authorization', `Bearer ${tokenEx}`)
      .send({
        title: `${TAG} Calibration Exam`,
        startAt: new Date(baseMs - 3600_000).toISOString(),
        endAt: new Date(baseMs + 3600_000).toISOString(),
        durationMinutes: 30,
      })
      .expect(201);
    const examId = examRes.body.data.exam.id;

    await request(app)
      .put(`/api/exams/${examId}/questions`)
      .set('Authorization', `Bearer ${tokenEx}`)
      .send({
        questions: [{ questionId: qLow.id }, { questionId: qNeg.id }, { questionId: qGood.id }],
      })
      .expect(200);

    await request(app)
      .post(`/api/exams/${examId}/enrollments`)
      .set('Authorization', `Bearer ${tokenEx}`)
      .send({ userIds: [c1, c2, c3, c4].map((c) => String(c._id)) })
      .expect(200);

    await request(app)
      .post(`/api/exams/${examId}/publish`)
      .set('Authorization', `Bearer ${tokenEx}`)
      .expect(200);

    // c1, c2 (top scorers: totalScore = 6): get qGood right, qLow wrong, qNeg wrong
    // c3, c4 (bottom scorers: totalScore = 2): get qNeg right, qLow wrong, qGood wrong
    const submitPattern = async (cand, chooseCorrectFor) => {
      const tok = await loginAs(cand.email);
      const start = await request(app)
        .post(`/api/candidate/exams/${examId}/start`)
        .set('Authorization', `Bearer ${tok}`)
        .expect(201);
      const attId = start.body.data.attempt.id;
      const answers = start.body.data.attempt.paper.map((item, idx) => {
        const shouldPass = chooseCorrectFor.includes(String(item.questionId));
        return {
          questionId: String(item.questionId),
          selectedOptionIds: [item.optionOrder[shouldPass ? 0 : 1].optionId],
          seq: idx + 1,
        };
      });
      await request(app)
        .put(`/api/attempts/${attId}/answers`)
        .set('Authorization', `Bearer ${tok}`)
        .send({ answers })
        .expect(200);
      await request(app)
        .post(`/api/attempts/${attId}/submit`)
        .set('Authorization', `Bearer ${tok}`)
        .expect(200);
    };

    await submitPattern(c1, [qGood.id]);
    await submitPattern(c2, [qGood.id]);
    await submitPattern(c3, [qNeg.id]);
    await submitPattern(c4, [qNeg.id]);

    const qaRes = await request(app)
      .get(`/api/exams/${examId}/questions/analytics`)
      .set('Authorization', `Bearer ${tokenEx}`)
      .expect(200);

    const byId = new Map(qaRes.body.data.questions.map((q) => [q.questionId, q]));
    expect(byId.get(qLow.id).flaggedAmbiguous).toBe(true);
    expect(byId.get(qLow.id).ambiguityReason).toBe('Low overall accuracy (<25%)');

    expect(byId.get(qNeg.id).flaggedAmbiguous).toBe(true);
    expect(byId.get(qNeg.id).ambiguityReason).toBe('Negative item discrimination');

    expect(byId.get(qGood.id).flaggedAmbiguous).toBe(false);
    expect(byId.get(qGood.id).ambiguityReason).toBeNull();
  });

  it('exports formula-safe CSV results excluding sandbox attempts on GET /api/exams/:id/results.csv', async () => {
    const baseMs = Date.now();
    setClock(baseMs);

    const examiner = await makeUser('ex_csv', 'examiner');
    const otherExaminer = await makeUser('ex_csv_other', 'examiner');
    const formulaCand = await makeUser('cand_csv', 'candidate', {
      name: '=SUM(A1)',
      rollNo: '-1+1@evil',
    });
    const [tokenEx, tokenOtherEx, tokenCand] = await Promise.all([
      loginAs(examiner.email),
      loginAs(otherExaminer.email),
      loginAs(formulaCand.email),
    ]);

    const qRes = await request(app)
      .post('/api/questions')
      .set('Authorization', `Bearer ${tokenEx}`)
      .send({
        type: 'single',
        text: `${TAG} CSV Export Question?`,
        options: [{ text: 'Yes' }, { text: 'No' }],
        correctOptionIndexes: [0],
        topic: 'Exports',
        difficulty: 'easy',
        marks: 4,
      })
      .expect(201);
    const qId = qRes.body.data.question.id;

    const examRes = await request(app)
      .post('/api/exams')
      .set('Authorization', `Bearer ${tokenEx}`)
      .send({
        title: `${TAG} CSV Export Exam`,
        startAt: new Date(baseMs - 3600_000).toISOString(),
        endAt: new Date(baseMs + 3600_000).toISOString(),
        durationMinutes: 30,
      })
      .expect(201);
    const examId = examRes.body.data.exam.id;

    await request(app)
      .put(`/api/exams/${examId}/questions`)
      .set('Authorization', `Bearer ${tokenEx}`)
      .send({ questions: [{ questionId: qId }] })
      .expect(200);

    await request(app)
      .post(`/api/exams/${examId}/enrollments`)
      .set('Authorization', `Bearer ${tokenEx}`)
      .send({ userIds: [String(formulaCand._id)] })
      .expect(200);

    await request(app)
      .post(`/api/exams/${examId}/publish`)
      .set('Authorization', `Bearer ${tokenEx}`)
      .expect(200);

    // Examiner sandbox rehearsal should never leak into results.csv
    const sbStart = await request(app)
      .post(`/api/exams/${examId}/sandbox/start`)
      .set('Authorization', `Bearer ${tokenEx}`)
      .expect(201);
    await request(app)
      .post(`/api/attempts/${sbStart.body.data.attempt.id}/submit`)
      .set('Authorization', `Bearer ${tokenEx}`)
      .expect(200);

    // Real candidate attempt
    const startRes = await request(app)
      .post(`/api/candidate/exams/${examId}/start`)
      .set('Authorization', `Bearer ${tokenCand}`)
      .expect(201);
    const attId = startRes.body.data.attempt.id;
    const opt0 = startRes.body.data.attempt.paper[0].optionOrder[0].optionId;

    await request(app)
      .put(`/api/attempts/${attId}/answers`)
      .set('Authorization', `Bearer ${tokenCand}`)
      .send({ answers: [{ questionId: qId, selectedOptionIds: [opt0], seq: 1 }] })
      .expect(200);

    await request(app)
      .post(`/api/attempts/${attId}/submit`)
      .set('Authorization', `Bearer ${tokenCand}`)
      .expect(200);

    await request(app)
      .get(`/api/exams/${examId}/results.csv`)
      .set('Authorization', `Bearer ${tokenOtherEx}`)
      .expect(403);

    const csvRes = await request(app)
      .get(`/api/exams/${examId}/results.csv`)
      .set('Authorization', `Bearer ${tokenEx}`)
      .expect(200);

    expect(csvRes.headers['content-type']).toMatch(/text\/csv/);
    expect(csvRes.headers['content-disposition']).toContain(`exam-results-${examId}.csv`);

    const lines = csvRes.text.trim().split('\n');
    expect(lines).toHaveLength(2);
    expect(lines[1]).toContain("'=SUM(A1)");
    expect(lines[1]).toContain("'-1+1@evil");
    expect(lines[1]).not.toContain(examiner.email);
  });
});
