import 'dotenv/config';
import mongoose from 'mongoose';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import Question from '../src/models/Question.js';
import User from '../src/models/User.js';

const TEST_RUN_TAG = `p3_${Date.now()}`;
const testEmail = (label) => `${TEST_RUN_TAG}_${label}@test.sems.edu`;

const app = createApp();

describe('Phase 3 Question Bank', () => {
  const originalJwtSecret = process.env.JWT_SECRET;
  let adminUser;
  let examinerA;
  let examinerB;
  let candidateUser;
  let adminToken;
  let examinerAToken;
  let examinerBToken;
  let candidateToken;

  const loginAs = async (email, password = 'Password123!') => {
    const res = await request(app).post('/api/auth/login').send({ email, password });
    return res.body.data.token;
  };

  beforeAll(async () => {
    const testUri = process.env.MONGODB_TEST_URI;
    if (!testUri) {
      throw new Error('MONGODB_TEST_URI must be set to run Phase 3 question tests');
    }
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'phase3_vitest_secret_key_min_32_chars';
    await mongoose.connect(testUri, { serverSelectionTimeoutMS: 5000 });
    await Promise.all([User.init(), Question.init()]);

    await User.deleteMany({ email: { $regex: `^${TEST_RUN_TAG}_` } });

    [adminUser, examinerA, examinerB, candidateUser] = await Promise.all([
      User.create({ name: 'Admin P3', email: testEmail('admin'), passwordHash: 'Password123!', role: 'admin' }),
      User.create({ name: 'Examiner A', email: testEmail('examiner_a'), passwordHash: 'Password123!', role: 'examiner' }),
      User.create({ name: 'Examiner B', email: testEmail('examiner_b'), passwordHash: 'Password123!', role: 'examiner' }),
      User.create({ name: 'Candidate P3', email: testEmail('candidate'), passwordHash: 'Password123!', role: 'candidate' }),
    ]);

    [adminToken, examinerAToken, examinerBToken, candidateToken] = await Promise.all([
      loginAs(adminUser.email),
      loginAs(examinerA.email),
      loginAs(examinerB.email),
      loginAs(candidateUser.email),
    ]);
  });

  beforeEach(async () => {
    await Question.deleteMany({
      createdBy: { $in: [adminUser._id, examinerA._id, examinerB._id] },
    });
  });

  afterAll(async () => {
    if (mongoose.connection.readyState === 1) {
      await Question.deleteMany({
        createdBy: { $in: [adminUser._id, examinerA._id, examinerB._id] },
      });
      await User.deleteMany({ email: { $regex: `^${TEST_RUN_TAG}_` } });
      await mongoose.disconnect();
    }
    process.env.JWT_SECRET = originalJwtSecret;
  });

  const sampleSingle = () => ({
    type: 'single',
    text: 'Which HTTP status code indicates Forbidden?',
    options: [{ text: '401' }, { text: '403' }, { text: '404' }],
    correctOptionIndexes: [1],
    topic: 'HTTP Security',
    difficulty: 'easy',
    marks: 2,
    scheme: { mode: 'all_or_nothing', negativeMarks: 0.5 },
    explanation: '403 Forbidden denies an authenticated caller without permission.',
  });

  const sampleMultiple = () => ({
    type: 'multiple',
    text: 'Select valid Mongoose schema types:',
    options: [{ text: 'String' }, { text: 'Boolean' }, { text: 'Tuple4D' }],
    correctOptionIndexes: [0, 1],
    topic: 'MongoDB',
    difficulty: 'medium',
    marks: 4,
    scheme: { mode: 'partial', negativeMarks: 0 },
  });

  const sampleWritten = () => ({
    type: 'written',
    text: 'Explain why exam timers must be enforced on the server.',
    topic: 'System Design',
    difficulty: 'hard',
    marks: 10,
    rubric: 'Must mention untrusted client clock and server-stored deadlineAt.',
  });

  it('creates all 3 question types (single, multiple, written) and stores correctOptionIds', async () => {
    const res1 = await request(app)
      .post('/api/questions')
      .set('Authorization', `Bearer ${examinerAToken}`)
      .send(sampleSingle());
    expect(res1.status).toBe(201);
    expect(res1.body.success).toBe(true);
    expect(res1.body.data.question.type).toBe('single');
    expect(res1.body.data.question.options).toHaveLength(3);
    expect(res1.body.data.question.correctOptionIds).toEqual([
      res1.body.data.question.options[1].id,
    ]);

    const res2 = await request(app)
      .post('/api/questions')
      .set('Authorization', `Bearer ${examinerAToken}`)
      .send(sampleMultiple());
    expect(res2.status).toBe(201);
    expect(res2.body.data.question.correctOptionIds).toEqual([
      res2.body.data.question.options[0].id,
      res2.body.data.question.options[1].id,
    ]);
    expect(res2.body.data.question.scheme.mode).toBe('partial');

    const res3 = await request(app)
      .post('/api/questions')
      .set('Authorization', `Bearer ${examinerAToken}`)
      .send(sampleWritten());
    expect(res3.status).toBe(201);
    expect(res3.body.data.question.options).toEqual([]);
    expect(res3.body.data.question.correctOptionIds).toEqual([]);
    expect(res3.body.data.question.rubric).toContain('deadlineAt');
  });

  it('rejects invalid per-type combinations and bad numeric inputs with 400 VALIDATION_ERROR', async () => {
    const invalidPayloads = [
      { ...sampleSingle(), correctOptionIndexes: [] },
      { ...sampleSingle(), correctOptionIndexes: [0, 1] },
      { ...sampleMultiple(), correctOptionIndexes: [] },
      { ...sampleWritten(), options: [{ text: 'Unexpected' }] },
      { ...sampleSingle(), options: [{ text: 'Only one' }], correctOptionIndexes: [0] },
      { ...sampleSingle(), marks: -1 },
    ];

    for (const payload of invalidPayloads) {
      const res = await request(app)
        .post('/api/questions')
        .set('Authorization', `Bearer ${examinerAToken}`)
        .send(payload);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    }
  });

  it('denies candidate tokens on /api/questions* with 403 FORBIDDEN', async () => {
    const listRes = await request(app)
      .get('/api/questions')
      .set('Authorization', `Bearer ${candidateToken}`);
    expect(listRes.status).toBe(403);
    expect(listRes.body.error.code).toBe('FORBIDDEN');

    const createRes = await request(app)
      .post('/api/questions')
      .set('Authorization', `Bearer ${candidateToken}`)
      .send(sampleSingle());
    expect(createRes.status).toBe(403);

    const topicsRes = await request(app)
      .get('/api/questions/topics')
      .set('Authorization', `Bearer ${candidateToken}`);
    expect(topicsRes.status).toBe(403);
  });

  it('enforces examiner ownership on read/update/archive while allowing admin access', async () => {
    const created = await request(app)
      .post('/api/questions')
      .set('Authorization', `Bearer ${examinerAToken}`)
      .send(sampleSingle());
    const qId = created.body.data.question.id;

    const readOther = await request(app)
      .get(`/api/questions/${qId}`)
      .set('Authorization', `Bearer ${examinerBToken}`);
    expect(readOther.status).toBe(403);
    expect(readOther.body.error.code).toBe('FORBIDDEN');

    const updateOther = await request(app)
      .patch(`/api/questions/${qId}`)
      .set('Authorization', `Bearer ${examinerBToken}`)
      .send({ marks: 5 });
    expect(updateOther.status).toBe(403);

    const deleteOther = await request(app)
      .delete(`/api/questions/${qId}`)
      .set('Authorization', `Bearer ${examinerBToken}`);
    expect(deleteOther.status).toBe(403);

    const readAdmin = await request(app)
      .get(`/api/questions/${qId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(readAdmin.status).toBe(200);
    expect(readAdmin.body.data.question.id).toBe(qId);

    const updateOwner = await request(app)
      .patch(`/api/questions/${qId}`)
      .set('Authorization', `Bearer ${examinerAToken}`)
      .send({ marks: 3, correctOptionIndexes: [2] });
    expect(updateOwner.status).toBe(200);
    expect(updateOwner.body.data.question.marks).toBe(3);
    expect(updateOwner.body.data.question.correctOptionIds).toEqual([
      updateOwner.body.data.question.options[2].id,
    ]);
  });

  it('filters questions by topic, difficulty, type, and search q while excluding archived by default', async () => {
    const q1 = await request(app)
      .post('/api/questions')
      .set('Authorization', `Bearer ${examinerAToken}`)
      .send(sampleSingle());
    await request(app)
      .post('/api/questions')
      .set('Authorization', `Bearer ${examinerAToken}`)
      .send(sampleMultiple());
    const q3 = await request(app)
      .post('/api/questions')
      .set('Authorization', `Bearer ${examinerAToken}`)
      .send(sampleWritten());

    await request(app)
      .delete(`/api/questions/${q3.body.data.question.id}`)
      .set('Authorization', `Bearer ${examinerAToken}`);

    const defaultList = await request(app)
      .get('/api/questions')
      .set('Authorization', `Bearer ${examinerAToken}`);
    expect(defaultList.status).toBe(200);
    expect(defaultList.body.data.questions).toHaveLength(2);

    const filtered = await request(app)
      .get('/api/questions')
      .query({ topic: 'HTTP Security', difficulty: 'easy', type: 'single', q: 'Forbidden' })
      .set('Authorization', `Bearer ${examinerAToken}`);
    expect(filtered.status).toBe(200);
    expect(filtered.body.data.questions).toHaveLength(1);
    expect(filtered.body.data.questions[0].id).toBe(q1.body.data.question.id);

    const withArchived = await request(app)
      .get('/api/questions')
      .query({ includeArchived: 'true' })
      .set('Authorization', `Bearer ${examinerAToken}`);
    expect(withArchived.status).toBe(200);
    expect(withArchived.body.data.questions).toHaveLength(3);
  });

  it('returns distinct sorted topics scoped to caller via GET /api/questions/topics', async () => {
    await request(app)
      .post('/api/questions')
      .set('Authorization', `Bearer ${examinerAToken}`)
      .send(sampleSingle());
    await request(app)
      .post('/api/questions')
      .set('Authorization', `Bearer ${examinerAToken}`)
      .send({ ...sampleSingle(), text: 'Another HTTP question', topic: 'HTTP Security' });
    await request(app)
      .post('/api/questions')
      .set('Authorization', `Bearer ${examinerAToken}`)
      .send(sampleMultiple());
    await request(app)
      .post('/api/questions')
      .set('Authorization', `Bearer ${examinerBToken}`)
      .send({ ...sampleWritten(), topic: 'Examiner B Secret Topic' });

    const resA = await request(app)
      .get('/api/questions/topics')
      .set('Authorization', `Bearer ${examinerAToken}`);
    expect(resA.status).toBe(200);
    expect(resA.body.data.topics).toEqual(['HTTP Security', 'MongoDB']);

    const resAdmin = await request(app)
      .get('/api/questions/topics')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(resAdmin.status).toBe(200);
    expect(resAdmin.body.data.topics).toEqual(['Examiner B Secret Topic', 'HTTP Security', 'MongoDB']);
  });

  it('soft-archives a question on DELETE /api/questions/:id without removing DB document', async () => {
    const created = await request(app)
      .post('/api/questions')
      .set('Authorization', `Bearer ${examinerAToken}`)
      .send(sampleWritten());
    const qId = created.body.data.question.id;

    const delRes = await request(app)
      .delete(`/api/questions/${qId}`)
      .set('Authorization', `Bearer ${examinerAToken}`);
    expect(delRes.status).toBe(200);
    expect(delRes.body.data.question.isArchived).toBe(true);

    const dbDoc = await Question.findById(qId);
    expect(dbDoc).not.toBeNull();
    expect(dbDoc.isArchived).toBe(true);
  });
});
