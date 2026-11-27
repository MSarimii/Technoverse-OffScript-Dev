import 'dotenv/config';
import mongoose from 'mongoose';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import Announcement from '../src/models/Announcement.js';
import Attempt from '../src/models/Attempt.js';
import AuditLog from '../src/models/AuditLog.js';
import Enrollment from '../src/models/Enrollment.js';
import Exam from '../src/models/Exam.js';
import Incident from '../src/models/Incident.js';
import Question from '../src/models/Question.js';
import User from '../src/models/User.js';
import { autoGradeAttempt } from '../src/services/gradingService.js';
import { resetClock, setClock } from '../src/utils/time.js';
import { computeAttemptTotals, scoreQuestion } from '../src/utils/scoring.js';

const TEST_RUN_TAG = `p67_${Date.now()}`;
const testEmail = (label) => `${TEST_RUN_TAG}_${label}@test.sems.edu`;

const app = createApp();

describe('Phase 6 + 7 Grading, Results, Analytics & Live Monitoring', () => {
  const originalJwtSecret = process.env.JWT_SECRET;
  let examiner;
  let examinerOther;
  let candA;
  let candB;
  let candUnenrolled;
  let examinerToken;
  let examinerOtherToken;
  let candAToken;
  let candBToken;
  let candUnenrolledToken;

  const baseNow = new Date('2026-11-27T11:00:00.000Z');
  const setMockTime = (offsetMs = 0) => setClock(() => new Date(baseNow.getTime() + offsetMs));

  const loginAs = async (email, password = 'Password123!') => {
    const res = await request(app).post('/api/auth/login').send({ email, password });
    return res.body.data.token;
  };

  beforeAll(async () => {
    const testUri = process.env.MONGODB_TEST_URI;
    if (!testUri) {
      throw new Error('MONGODB_TEST_URI must be set to run Phase 6-7 tests');
    }
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'phase67_vitest_secret_key_min_32_chars';
    await mongoose.connect(testUri, { serverSelectionTimeoutMS: 5000 });
    await Promise.all([
      User.init(),
      Question.init(),
      Exam.init(),
      Enrollment.init(),
      Attempt.init(),
      Incident.init(),
      Announcement.init(),
      AuditLog.init(),
    ]);

    await User.deleteMany({ email: { $regex: `^${TEST_RUN_TAG}_` } });

    [examiner, examinerOther, candA, candB, candUnenrolled] = await Promise.all([
      User.create({ name: 'Examiner P67', email: testEmail('examiner'), passwordHash: 'Password123!', role: 'examiner' }),
      User.create({ name: 'Other Examiner P67', email: testEmail('examiner2'), passwordHash: 'Password123!', role: 'examiner' }),
      User.create({ name: 'Cand A P67', email: testEmail('cand_a'), passwordHash: 'Password123!', role: 'candidate' }),
      User.create({ name: 'Cand B P67', email: testEmail('cand_b'), passwordHash: 'Password123!', role: 'candidate' }),
      User.create({ name: 'Cand C P67', email: testEmail('cand_c'), passwordHash: 'Password123!', role: 'candidate' }),
    ]);

    [examinerToken, examinerOtherToken, candAToken, candBToken, candUnenrolledToken] =
      await Promise.all([
        loginAs(examiner.email),
        loginAs(examinerOther.email),
        loginAs(candA.email),
        loginAs(candB.email),
        loginAs(candUnenrolled.email),
      ]);
  });

  beforeEach(async () => {
    setMockTime(0);
    const examIds = await Exam.find({ createdBy: examiner._id }).distinct('_id');
    await Promise.all([
      AuditLog.deleteMany({ actorId: { $in: [examiner._id, examinerOther._id] } }),
      Announcement.deleteMany({ examId: { $in: examIds } }),
      Incident.deleteMany({ examId: { $in: examIds } }),
      Attempt.deleteMany({ examId: { $in: examIds } }),
      Enrollment.deleteMany({ examId: { $in: examIds } }),
      Exam.deleteMany({ _id: { $in: examIds } }),
      Question.deleteMany({ createdBy: examiner._id }),
    ]);
  });

  afterEach(() => {
    resetClock();
  });

  afterAll(async () => {
    if (mongoose.connection.readyState === 1) {
      const examIds = await Exam.find({ createdBy: examiner._id }).distinct('_id');
      await Promise.all([
        AuditLog.deleteMany({ actorId: { $in: [examiner._id, examinerOther._id] } }),
        Announcement.deleteMany({ examId: { $in: examIds } }),
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

  const setupFullExam = async ({ negativeMarkingEnabled = true, includeWritten = true } = {}) => {
    const oS1 = new mongoose.Types.ObjectId();
    const oS2 = new mongoose.Types.ObjectId();
    const oMA1 = new mongoose.Types.ObjectId();
    const oMA2 = new mongoose.Types.ObjectId();
    const oMA3 = new mongoose.Types.ObjectId();
    const oMP1 = new mongoose.Types.ObjectId();
    const oMP2 = new mongoose.Types.ObjectId();
    const oMP3 = new mongoose.Types.ObjectId();

    const qSingle = await Question.create({
      createdBy: examiner._id,
      type: 'single',
      text: 'Single choice question',
      options: [{ _id: oS1, text: 'Right' }, { _id: oS2, text: 'Wrong' }],
      correctOptionIds: [oS1],
      topic: 'Core',
      difficulty: 'easy',
      marks: 4,
      scheme: { mode: 'all_or_nothing', negativeMarks: 1 },
    });

    const qMultiAll = await Question.create({
      createdBy: examiner._id,
      type: 'multiple',
      text: 'Multi all-or-nothing',
      options: [
        { _id: oMA1, text: 'A' },
        { _id: oMA2, text: 'B' },
        { _id: oMA3, text: 'C' },
      ],
      correctOptionIds: [oMA1, oMA2],
      topic: 'Core',
      difficulty: 'medium',
      marks: 4,
      scheme: { mode: 'all_or_nothing', negativeMarks: 1 },
    });

    const qMultiPartial = await Question.create({
      createdBy: examiner._id,
      type: 'multiple',
      text: 'Multi partial credit',
      options: [
        { _id: oMP1, text: 'P1' },
        { _id: oMP2, text: 'P2' },
        { _id: oMP3, text: 'P3' },
      ],
      correctOptionIds: [oMP1, oMP2],
      topic: 'Core',
      difficulty: 'medium',
      marks: 6,
      scheme: { mode: 'partial', negativeMarks: 0 },
    });

    const qWritten = await Question.create({
      createdBy: examiner._id,
      type: 'written',
      text: 'Explain consensus.',
      topic: 'Distributed',
      difficulty: 'hard',
      marks: 6,
    });

    const questionRefs = [
      { questionId: qSingle._id, marks: 4, order: 0 },
      { questionId: qMultiAll._id, marks: 4, order: 1 },
      { questionId: qMultiPartial._id, marks: 6, order: 2 },
    ];
    if (includeWritten) {
      questionRefs.push({ questionId: qWritten._id, marks: 6, order: 3 });
    }

    const exam = await Exam.create({
      createdBy: examiner._id,
      title: 'Comprehensive Assessment',
      startAt: new Date(baseNow.getTime() - 10 * 60 * 1000),
      endAt: new Date(baseNow.getTime() + 120 * 60 * 1000),
      durationMinutes: 60,
      totalMarks: includeWritten ? 20 : 14,
      status: 'published',
      publishedAt: new Date(baseNow.getTime() - 30 * 60 * 1000),
      settings: {
        shuffleQuestions: false,
        shuffleOptions: false,
        negativeMarkingEnabled,
      },
      questions: questionRefs,
    });

    await Enrollment.insertMany([
      { examId: exam._id, userId: candA._id, enrolledBy: examiner._id, status: 'active' },
      { examId: exam._id, userId: candB._id, enrolledBy: examiner._id, status: 'active' },
    ]);

    return {
      exam,
      qSingle,
      qMultiAll,
      qMultiPartial,
      qWritten,
      ids: { oS1, oS2, oMA1, oMA2, oMA3, oMP1, oMP2, oMP3 },
    };
  };

  it('auto-grades single, multi all_or_nothing, multi partial, negative marking, skipped, and written idempotently', () => {
    const id1 = new mongoose.Types.ObjectId();
    const id2 = new mongoose.Types.ObjectId();
    const id3 = new mongoose.Types.ObjectId();

    const singleItem = {
      questionId: new mongoose.Types.ObjectId(),
      type: 'single',
      marks: 4,
      scheme: { mode: 'all_or_nothing', negativeMarks: 1 },
      correctOptionIds: [id1],
    };
    expect(scoreQuestion(singleItem, { selectedOptionIds: [id1] }, { negativeMarkingEnabled: true })).toMatchObject({
      autoScore: 4,
      finalScore: 4,
    });
    expect(scoreQuestion(singleItem, { selectedOptionIds: [id2] }, { negativeMarkingEnabled: true })).toMatchObject({
      autoScore: -1,
      finalScore: -1,
    });
    expect(scoreQuestion(singleItem, { selectedOptionIds: [id2] }, { negativeMarkingEnabled: false })).toMatchObject({
      autoScore: 0,
      finalScore: 0,
    });
    expect(scoreQuestion(singleItem, null, { negativeMarkingEnabled: true })).toMatchObject({
      autoScore: 0,
      finalScore: 0,
    });

    const multiAllItem = {
      questionId: new mongoose.Types.ObjectId(),
      type: 'multiple',
      marks: 4,
      scheme: { mode: 'all_or_nothing', negativeMarks: 1 },
      correctOptionIds: [id1, id2],
    };
    expect(scoreQuestion(multiAllItem, { selectedOptionIds: [id1, id2] }, { negativeMarkingEnabled: true })).toMatchObject({
      finalScore: 4,
    });
    expect(scoreQuestion(multiAllItem, { selectedOptionIds: [id1] }, { negativeMarkingEnabled: true })).toMatchObject({
      finalScore: -1,
    });

    const multiPartialItem = {
      questionId: new mongoose.Types.ObjectId(),
      type: 'multiple',
      marks: 6,
      scheme: { mode: 'partial', negativeMarks: 0 },
      correctOptionIds: [id1, id2],
    };
    // 1 right out of 2, 0 wrong -> 6 * 0.5 = 3
    expect(scoreQuestion(multiPartialItem, { selectedOptionIds: [id1] }, {})).toMatchObject({
      finalScore: 3,
    });
    // 1 right, 1 wrong -> 6 * max(0, (1-1)/2) = 0
    expect(scoreQuestion(multiPartialItem, { selectedOptionIds: [id1, id3] }, {})).toMatchObject({
      finalScore: 0,
    });

    const writtenItem = {
      questionId: new mongoose.Types.ObjectId(),
      type: 'written',
      marks: 6,
      correctOptionIds: [],
    };
    const wGrade = scoreQuestion(writtenItem, { text: 'My essay' }, {});
    expect(wGrade).toEqual({ autoScore: null, manualScore: null, finalScore: 0, pendingManual: true });

    const totals = computeAttemptTotals(
      [
        { questionId: singleItem.questionId, autoScore: -1, manualScore: null, finalScore: -1, maxMarks: 4 },
        { questionId: writtenItem.questionId, autoScore: null, manualScore: null, finalScore: 0, maxMarks: 6 },
      ],
      10,
      [singleItem, writtenItem]
    );
    expect(totals).toEqual({ totalScore: 0, percentage: 0, gradingStatus: 'pending_manual' });
  });

  it('auto-grades on submit idempotently, rejects out-of-range manual score, and completes grading on valid manual grade', async () => {
    const { exam, qSingle, qMultiAll, qMultiPartial, qWritten, ids } = await setupFullExam();

    const startRes = await request(app)
      .post(`/api/candidate/exams/${exam._id}/start`)
      .set('Authorization', `Bearer ${candAToken}`);
    const attemptId = startRes.body.data.attempt.id;

    await request(app)
      .put(`/api/attempts/${attemptId}/answers`)
      .set('Authorization', `Bearer ${candAToken}`)
      .send({
        answers: [
          { questionId: String(qSingle._id), selectedOptionIds: [String(ids.oS1)], seq: 1 }, // +4
          { questionId: String(qMultiAll._id), selectedOptionIds: [String(ids.oMA1)], seq: 1 }, // -1 (incomplete)
          { questionId: String(qMultiPartial._id), selectedOptionIds: [String(ids.oMP1)], seq: 1 }, // +3 (1/2 of 6)
          { questionId: String(qWritten._id), text: 'Paxos and Raft.', seq: 1 }, // pending_manual
        ],
      });

    const subRes = await request(app)
      .post(`/api/attempts/${attemptId}/submit`)
      .set('Authorization', `Bearer ${candAToken}`);
    expect(subRes.status).toBe(200);

    // Examiner reviews submission & verifies auto-graded totals (4 - 1 + 3 = 6 out of 20)
    const gradingRes = await request(app)
      .get(`/api/attempts/${attemptId}/grading`)
      .set('Authorization', `Bearer ${examinerToken}`);
    expect(gradingRes.status).toBe(200);
    expect(gradingRes.body.data.attempt.totalScore).toBe(6);
    expect(gradingRes.body.data.attempt.gradingStatus).toBe('pending_manual');
    expect(gradingRes.body.data.attempt.paper[0].correctOptionIds).toEqual([String(ids.oS1)]);

    // Running autoGradeAttempt twice produces identical totals
    await autoGradeAttempt(attemptId);
    const afterReAuto = await Attempt.findById(attemptId);
    expect(afterReAuto.totalScore).toBe(6);

    // Manual score > maxMarks -> 400 SCORE_OUT_OF_RANGE
    const badManual = await request(app)
      .put(`/api/attempts/${attemptId}/grades/${qWritten._id}`)
      .set('Authorization', `Bearer ${examinerToken}`)
      .send({ score: 8 });
    expect(badManual.status).toBe(400);
    expect(badManual.body.error.code).toBe('SCORE_OUT_OF_RANGE');

    // Valid manual score 5 -> total becomes 11 / 20 (55%) and gradingStatus becomes complete
    const okManual = await request(app)
      .put(`/api/attempts/${attemptId}/grades/${qWritten._id}`)
      .set('Authorization', `Bearer ${examinerToken}`)
      .send({ score: 5, feedback: 'Clear explanation' });
    expect(okManual.status).toBe(200);
    expect(okManual.body.data.attempt.totalScore).toBe(11);
    expect(okManual.body.data.attempt.percentage).toBe(55);
    expect(okManual.body.data.attempt.gradingStatus).toBe('complete');
    expect(okManual.body.data.attempt.status).toBe('graded');

    // Regrade preserves manual score 5 while re-running auto-grade
    const regradeRes = await request(app)
      .post(`/api/exams/${exam._id}/regrade`)
      .set('Authorization', `Bearer ${examinerToken}`);
    expect(regradeRes.status).toBe(200);
    expect(regradeRes.body.data.regradedCount).toBe(1);
    const dbAfterRegrade = await Attempt.findById(attemptId);
    expect(dbAfterRegrade.totalScore).toBe(11);
  });

  it('enforces result publishing gate (409 GRADING_INCOMPLETE), blocks unpublished candidate views (403), and enforces ownership', async () => {
    const { exam, qSingle, qWritten, ids } = await setupFullExam();

    const sA = await request(app)
      .post(`/api/candidate/exams/${exam._id}/start`)
      .set('Authorization', `Bearer ${candAToken}`);
    const attAId = sA.body.data.attempt.id;
    await request(app)
      .put(`/api/attempts/${attAId}/answers`)
      .set('Authorization', `Bearer ${candAToken}`)
      .send({
        answers: [
          { questionId: String(qSingle._id), selectedOptionIds: [String(ids.oS1)], seq: 1 },
          { questionId: String(qWritten._id), text: 'Answer A', seq: 1 },
        ],
      });
    await request(app)
      .post(`/api/attempts/${attAId}/submit`)
      .set('Authorization', `Bearer ${candAToken}`);

    const sB = await request(app)
      .post(`/api/candidate/exams/${exam._id}/start`)
      .set('Authorization', `Bearer ${candBToken}`);
    const attBId = sB.body.data.attempt.id;
    await request(app)
      .post(`/api/attempts/${attBId}/submit`)
      .set('Authorization', `Bearer ${candBToken}`);

    // Publishing before written grading finishes -> 409 GRADING_INCOMPLETE
    const blockedPub = await request(app)
      .post(`/api/exams/${exam._id}/results/publish`)
      .set('Authorization', `Bearer ${examinerToken}`)
      .send({});
    expect(blockedPub.status).toBe(409);
    expect(blockedPub.body.error.code).toBe('GRADING_INCOMPLETE');

    const previewRes = await request(app)
      .get(`/api/exams/${exam._id}/results/preview`)
      .set('Authorization', `Bearer ${examinerToken}`);
    expect(previewRes.status).toBe(200);
    expect(previewRes.body.data.pendingManualCount).toBe(2);
    expect(previewRes.body.data.readyToPublish).toBe(false);

    // Candidate cannot inspect unpublished results
    const preResultDetail = await request(app)
      .get(`/api/candidate/results/${attAId}`)
      .set('Authorization', `Bearer ${candAToken}`);
    expect(preResultDetail.status).toBe(403);
    expect(preResultDetail.body.error.code).toBe('RESULTS_NOT_PUBLISHED');

    // Finish manual grading on both attempts, then publish cleanly
    await request(app)
      .put(`/api/attempts/${attAId}/grades/${qWritten._id}`)
      .set('Authorization', `Bearer ${examinerToken}`)
      .send({ score: 6 });
    await request(app)
      .put(`/api/attempts/${attBId}/grades/${qWritten._id}`)
      .set('Authorization', `Bearer ${examinerToken}`)
      .send({ score: 2 });

    const pubRes = await request(app)
      .post(`/api/exams/${exam._id}/results/publish`)
      .set('Authorization', `Bearer ${examinerToken}`)
      .send({});
    expect(pubRes.status).toBe(200);
    expect(pubRes.body.data.resultsPublished).toBe(true);

    const candList = await request(app)
      .get('/api/candidate/results')
      .set('Authorization', `Bearer ${candAToken}`);
    expect(candList.status).toBe(200);
    expect(candList.body.data.results).toHaveLength(1);
    expect(candList.body.data.results[0].totalScore).toBe(10);

    const candDetail = await request(app)
      .get(`/api/candidate/results/${attAId}`)
      .set('Authorization', `Bearer ${candAToken}`);
    expect(candDetail.status).toBe(200);
    expect(candDetail.body.data.result.totalScore).toBe(10);
    expect(JSON.stringify(candDetail.body)).not.toContain('correctOptionIds');

    // Candidate A cannot inspect Candidate B's result
    const crossResult = await request(app)
      .get(`/api/candidate/results/${attBId}`)
      .set('Authorization', `Bearer ${candAToken}`);
    expect(crossResult.status).toBe(403);

    // Unpublish hides results again
    const unpubRes = await request(app)
      .post(`/api/exams/${exam._id}/results/unpublish`)
      .set('Authorization', `Bearer ${examinerToken}`);
    expect(unpubRes.status).toBe(200);
    const postUnpubList = await request(app)
      .get('/api/candidate/results')
      .set('Authorization', `Bearer ${candAToken}`);
    expect(postUnpubList.body.data.results).toHaveLength(0);
  });

  it('computes accurate exam analytics across finalized attempts', async () => {
    const { exam, qSingle, qMultiAll, ids } = await setupFullExam({ includeWritten: false });

    // Candidate A: all 3 right -> 14 / 14 (100%, pass)
    const sA = await request(app)
      .post(`/api/candidate/exams/${exam._id}/start`)
      .set('Authorization', `Bearer ${candAToken}`);
    await request(app)
      .put(`/api/attempts/${sA.body.data.attempt.id}/answers`)
      .set('Authorization', `Bearer ${candAToken}`)
      .send({
        answers: [
          { questionId: String(qSingle._id), selectedOptionIds: [String(ids.oS1)], seq: 1 },
          { questionId: String(qMultiAll._id), selectedOptionIds: [String(ids.oMA1), String(ids.oMA2)], seq: 1 },
        ],
      });
    setMockTime(10 * 60 * 1000);
    await request(app)
      .post(`/api/attempts/${sA.body.data.attempt.id}/submit`)
      .set('Authorization', `Bearer ${candAToken}`);

    // Candidate B: only single right -> 4 / 14 (28.57%, fail)
    setMockTime(0);
    const sB = await request(app)
      .post(`/api/candidate/exams/${exam._id}/start`)
      .set('Authorization', `Bearer ${candBToken}`);
    await request(app)
      .put(`/api/attempts/${sB.body.data.attempt.id}/answers`)
      .set('Authorization', `Bearer ${candBToken}`)
      .send({
        answers: [{ questionId: String(qSingle._id), selectedOptionIds: [String(ids.oS1)], seq: 1 }],
      });
    setMockTime(20 * 60 * 1000);
    await request(app)
      .post(`/api/attempts/${sB.body.data.attempt.id}/submit`)
      .set('Authorization', `Bearer ${candBToken}`);

    // Scores: Candidate A = 8 (4+4), Candidate B = 4 -> mean 6, median 6, min 4, max 8, passRate 50%
    const analyticsRes = await request(app)
      .get(`/api/exams/${exam._id}/analytics`)
      .set('Authorization', `Bearer ${examinerToken}`);
    expect(analyticsRes.status).toBe(200);
    expect(analyticsRes.body.data).toMatchObject({
      attemptCount: 2,
      gradedCount: 2,
      mean: 6,
      median: 6,
      min: 4,
      max: 8,
      passRate: 50,
      completionRate: 100,
      avgTimeMinutes: 15,
    });
    expect(analyticsRes.body.data.scoreHistogram).toHaveLength(5);

    const subList = await request(app)
      .get(`/api/exams/${exam._id}/submissions`)
      .set('Authorization', `Bearer ${examinerToken}`);
    expect(subList.status).toBe(200);
    expect(subList.body.data.submissions).toHaveLength(2);
  });

  it('supports live monitor, ownership enforcement, incident review, flood cap (429), and heartbeat announcements', async () => {
    const { exam, qSingle, ids } = await setupFullExam();

    const startRes = await request(app)
      .post(`/api/candidate/exams/${exam._id}/start`)
      .set('Authorization', `Bearer ${candAToken}`);
    const attemptId = startRes.body.data.attempt.id;

    await request(app)
      .put(`/api/attempts/${attemptId}/answers`)
      .set('Authorization', `Bearer ${candAToken}`)
      .send({
        answers: [{ questionId: String(qSingle._id), selectedOptionIds: [String(ids.oS1)], seq: 1 }],
      });

    const incRes = await request(app)
      .post(`/api/attempts/${attemptId}/events`)
      .set('Authorization', `Bearer ${candAToken}`)
      .send({ type: 'window_blur', details: 'Focus lost briefly' });
    const incidentId = incRes.body.data.incident.id;

    // Non-owner examiner gets 403 on monitor, incidents, and announcement creation
    const otherMonitor = await request(app)
      .get(`/api/exams/${exam._id}/monitor`)
      .set('Authorization', `Bearer ${examinerOtherToken}`);
    expect(otherMonitor.status).toBe(403);

    const monitorRes = await request(app)
      .get(`/api/exams/${exam._id}/monitor`)
      .set('Authorization', `Bearer ${examinerToken}`);
    expect(monitorRes.status).toBe(200);
    expect(monitorRes.body.data.attempts).toHaveLength(1);
    expect(monitorRes.body.data.attempts[0]).toMatchObject({
      answeredCount: 1,
      totalQuestions: 4,
      incidentCount: 1,
    });

    const listInc = await request(app)
      .get(`/api/exams/${exam._id}/incidents`)
      .query({ type: 'window_blur', reviewStatus: 'new' })
      .set('Authorization', `Bearer ${examinerToken}`);
    expect(listInc.status).toBe(200);
    expect(listInc.body.data.incidents).toHaveLength(1);

    const reviewRes = await request(app)
      .patch(`/api/incidents/${incidentId}`)
      .set('Authorization', `Bearer ${examinerToken}`)
      .send({ reviewStatus: 'dismissed', reviewerNote: 'Verified benign OS popup' });
    expect(reviewRes.status).toBe(200);
    expect(reviewRes.body.data.incident.reviewStatus).toBe('dismissed');
    expect(reviewRes.body.data.incident.reviewerNote).toBe('Verified benign OS popup');

    // Broadcast announcement -> delivered on candidate heartbeat AND GET /api/exams/:id/announcements
    const annRes = await request(app)
      .post(`/api/exams/${exam._id}/announcements`)
      .set('Authorization', `Bearer ${examinerToken}`)
      .send({ message: 'Clarification: Question 2 assumes sequential consistency.' });
    expect(annRes.status).toBe(201);

    const hbRes = await request(app)
      .post(`/api/attempts/${attemptId}/heartbeat`)
      .set('Authorization', `Bearer ${candAToken}`);
    expect(hbRes.status).toBe(200);
    expect(hbRes.body.data.announcements).toHaveLength(1);
    expect(hbRes.body.data.announcements[0].message).toBe(
      'Clarification: Question 2 assumes sequential consistency.'
    );

    const candAnnList = await request(app)
      .get(`/api/exams/${exam._id}/announcements`)
      .set('Authorization', `Bearer ${candAToken}`);
    expect(candAnnList.status).toBe(200);
    expect(candAnnList.body.data.announcements).toHaveLength(1);

    const unenrolledAnn = await request(app)
      .get(`/api/exams/${exam._id}/announcements`)
      .set('Authorization', `Bearer ${candUnenrolledToken}`);
    expect(unenrolledAnn.status).toBe(403);

    // Incident flood cap (> 50 incidents per attempt -> 429 RATE_LIMITED)
    await Incident.insertMany(
      Array.from({ length: 49 }, (_, i) => ({
        attemptId,
        examId: exam._id,
        userId: candA._id,
        type: 'tab_hidden',
        details: `Bulk ${i}`,
        occurredAt: new Date(),
      }))
    );
    const cappedRes = await request(app)
      .post(`/api/attempts/${attemptId}/events`)
      .set('Authorization', `Bearer ${candAToken}`)
      .send({ type: 'tab_hidden' });
    expect(cappedRes.status).toBe(429);
    expect(cappedRes.body.error.code).toBe('RATE_LIMITED');
  });
});
