import 'dotenv/config';
import mongoose from 'mongoose';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import User from '../src/models/User.js';

const TEST_RUN_TAG = `p2_${Date.now()}`;
const testEmail = (label) => `${TEST_RUN_TAG}_${label}@test.sems.edu`;

const app = createApp();

describe('Phase 2 Auth, RBAC, Token Revocation & Admin Users', () => {
  const originalAllowSelfRegister = process.env.ALLOW_SELF_REGISTER;
  const originalJwtSecret = process.env.JWT_SECRET;

  beforeAll(async () => {
    const testUri = process.env.MONGODB_TEST_URI;
    if (!testUri) {
      throw new Error('MONGODB_TEST_URI must be set to run Phase 2 auth tests');
    }
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'phase2_vitest_secret_key_min_32_chars';
    await mongoose.connect(testUri, { serverSelectionTimeoutMS: 5000 });
    await User.init();
  });

  beforeEach(async () => {
    process.env.ALLOW_SELF_REGISTER = 'false';
    await User.deleteMany({ email: { $regex: `^${TEST_RUN_TAG}_` } });
  });

  afterAll(async () => {
    if (mongoose.connection.readyState === 1) {
      await User.deleteMany({ email: { $regex: `^${TEST_RUN_TAG}_` } });
      await mongoose.disconnect();
    }
    process.env.ALLOW_SELF_REGISTER = originalAllowSelfRegister;
    process.env.JWT_SECRET = originalJwtSecret;
  });

  const createTestUser = async ({
    label,
    role = 'candidate',
    password = 'Password123!',
    isActive = true,
    rollNo,
  }) => {
    return User.create({
      name: `Test ${label}`,
      email: testEmail(label),
      passwordHash: password,
      role,
      isActive,
      ...(rollNo ? { rollNo } : {}),
    });
  };

  it('logs in with valid credentials and returns token + sanitized user without passwordHash', async () => {
    await createTestUser({ label: 'login_ok', role: 'examiner', password: 'Secret123!' });

    const res = await request(app).post('/api/auth/login').send({
      email: testEmail('login_ok'),
      password: 'Secret123!',
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(typeof res.body.data.token).toBe('string');
    expect(res.body.data.user).toMatchObject({
      name: 'Test login_ok',
      email: testEmail('login_ok'),
      role: 'examiner',
      isActive: true,
    });
    expect(res.body.data.user.passwordHash).toBeUndefined();
    expect(res.body.data.user.password).toBeUndefined();
    expect(res.body.data.user.tokenVersion).toBeUndefined();
    expect(JSON.stringify(res.body)).not.toContain('passwordHash');
  });

  it('fails login with uniform 401 UNAUTHENTICATED for unknown email or wrong password', async () => {
    await createTestUser({ label: 'login_bad', password: 'Correct123!' });

    const wrongPwRes = await request(app).post('/api/auth/login').send({
      email: testEmail('login_bad'),
      password: 'WrongPassword!',
    });
    const unknownRes = await request(app).post('/api/auth/login').send({
      email: testEmail('nonexistent'),
      password: 'WrongPassword!',
    });

    expect(wrongPwRes.status).toBe(401);
    expect(unknownRes.status).toBe(401);
    expect({
      success: wrongPwRes.body.success,
      error: wrongPwRes.body.error,
    }).toEqual({
      success: unknownRes.body.success,
      error: unknownRes.body.error,
    });
    expect(wrongPwRes.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('gates self-registration via ALLOW_SELF_REGISTER and blocks role injection via .strict()', async () => {
    process.env.ALLOW_SELF_REGISTER = 'false';
    const disabledRes = await request(app).post('/api/auth/register').send({
      name: 'Blocked User',
      email: testEmail('reg_blocked'),
      password: 'Password123!',
    });
    expect(disabledRes.status).toBe(403);
    expect(disabledRes.body.error.code).toBe('FORBIDDEN');

    process.env.ALLOW_SELF_REGISTER = 'true';
    const escalationRes = await request(app).post('/api/auth/register').send({
      name: 'Escalator',
      email: testEmail('reg_escalate'),
      password: 'Password123!',
      role: 'admin',
    });
    expect(escalationRes.status).toBe(400);
    expect(escalationRes.body.error.code).toBe('VALIDATION_ERROR');

    const okRes = await request(app).post('/api/auth/register').send({
      name: 'Clean Candidate',
      email: testEmail('reg_ok'),
      password: 'Password123!',
      rollNo: 'REG-101',
    });
    expect(okRes.status).toBe(201);
    expect(okRes.body.data.user.role).toBe('candidate');
    expect(okRes.body.data.user.passwordHash).toBeUndefined();
  });

  it('requires valid Bearer token on GET /api/auth/me and supports PATCH /api/auth/password', async () => {
    const unauthRes = await request(app).get('/api/auth/me');
    expect(unauthRes.status).toBe(401);
    expect(unauthRes.body.error.code).toBe('UNAUTHENTICATED');

    const invalidRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer not.a.valid.jwt');
    expect(invalidRes.status).toBe(401);

    await createTestUser({ label: 'me_user', role: 'candidate', password: 'OldPass123!' });
    const loginRes = await request(app).post('/api/auth/login').send({
      email: testEmail('me_user'),
      password: 'OldPass123!',
    });
    const oldToken = loginRes.body.data.token;

    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${oldToken}`);
    expect(meRes.status).toBe(200);
    expect(meRes.body.data.user.email).toBe(testEmail('me_user'));
    expect(meRes.body.data.user.passwordHash).toBeUndefined();

    const pwRes = await request(app)
      .patch('/api/auth/password')
      .set('Authorization', `Bearer ${oldToken}`)
      .send({ currentPassword: 'OldPass123!', newPassword: 'NewPass456!' });
    expect(pwRes.status).toBe(200);
    expect(typeof pwRes.body.data.token).toBe('string');

    const staleMeRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${oldToken}`);
    expect(staleMeRes.status).toBe(401);

    const freshMeRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${pwRes.body.data.token}`);
    expect(freshMeRes.status).toBe(200);
  });

  it('denies candidate and examiner access to all /api/admin/* endpoints with 403 FORBIDDEN', async () => {
    await createTestUser({ label: 'cand_rbac', role: 'candidate', password: 'Password123!' });
    await createTestUser({ label: 'exam_rbac', role: 'examiner', password: 'Password123!' });

    const candLogin = await request(app).post('/api/auth/login').send({
      email: testEmail('cand_rbac'),
      password: 'Password123!',
    });
    const examLogin = await request(app).post('/api/auth/login').send({
      email: testEmail('exam_rbac'),
      password: 'Password123!',
    });

    for (const token of [candLogin.body.data.token, examLogin.body.data.token]) {
      const listRes = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${token}`);
      expect(listRes.status).toBe(403);
      expect(listRes.body.error.code).toBe('FORBIDDEN');

      const overviewRes = await request(app)
        .get('/api/admin/overview')
        .set('Authorization', `Bearer ${token}`);
      expect(overviewRes.status).toBe(403);
    }
  });

  it('allows admin to create, list/filter, update role/active, reset password, and get overview', async () => {
    const admin = await createTestUser({ label: 'admin_main', role: 'admin', password: 'AdminPass123!' });
    const adminLogin = await request(app).post('/api/auth/login').send({
      email: testEmail('admin_main'),
      password: 'AdminPass123!',
    });
    const adminToken = adminLogin.body.data.token;

    const createRes = await request(app)
      .post('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Created Examiner',
        email: testEmail('created_examiner'),
        password: 'ExamPass123!',
        role: 'examiner',
        rollNo: 'EX-01',
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.data.user.role).toBe('examiner');
    expect(createRes.body.data.user.passwordHash).toBeUndefined();
    const createdId = createRes.body.data.user.id;

    const listRes = await request(app)
      .get('/api/admin/users')
      .query({ role: 'examiner', q: 'created_examiner' })
      .set('Authorization', `Bearer ${adminToken}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.data.users.some((u) => u.id === createdId)).toBe(true);
    expect(JSON.stringify(listRes.body)).not.toContain('passwordHash');

    const selfDemoteRes = await request(app)
      .patch(`/api/admin/users/${admin._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'candidate' });
    expect([400, 409]).toContain(selfDemoteRes.status);

    const overviewRes = await request(app)
      .get('/api/admin/overview')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(overviewRes.status).toBe(200);
    expect(overviewRes.body.data).toHaveProperty('users');
    expect(overviewRes.body.data).toMatchObject({
      exams: expect.any(Number),
      attempts: expect.any(Number),
    });
  });

  it('immediately invalidates existing JWT when role changes, password resets, or user is deactivated', async () => {
    await createTestUser({ label: 'admin_rev', role: 'admin', password: 'AdminPass123!' });
    const target = await createTestUser({
      label: 'target_rev',
      role: 'candidate',
      password: 'TargetPass123!',
    });

    const adminLogin = await request(app).post('/api/auth/login').send({
      email: testEmail('admin_rev'),
      password: 'AdminPass123!',
    });
    const adminToken = adminLogin.body.data.token;

    // 1. Role change revokes old token
    let targetLogin = await request(app).post('/api/auth/login').send({
      email: testEmail('target_rev'),
      password: 'TargetPass123!',
    });
    let oldToken = targetLogin.body.data.token;

    const roleUpdate = await request(app)
      .patch(`/api/admin/users/${target._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'examiner' });
    expect(roleUpdate.status).toBe(200);

    const afterRoleRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${oldToken}`);
    expect(afterRoleRes.status).toBe(401);

    // 2. Password reset revokes new token
    targetLogin = await request(app).post('/api/auth/login').send({
      email: testEmail('target_rev'),
      password: 'TargetPass123!',
    });
    oldToken = targetLogin.body.data.token;

    const resetRes = await request(app)
      .post(`/api/admin/users/${target._id}/reset-password`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ newPassword: 'ResetPass789!' });
    expect(resetRes.status).toBe(200);

    const afterResetRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${oldToken}`);
    expect(afterResetRes.status).toBe(401);

    // 3. Deactivation revokes latest token and blocks login
    targetLogin = await request(app).post('/api/auth/login').send({
      email: testEmail('target_rev'),
      password: 'ResetPass789!',
    });
    oldToken = targetLogin.body.data.token;

    const deactivateRes = await request(app)
      .patch(`/api/admin/users/${target._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isActive: false });
    expect(deactivateRes.status).toBe(200);

    const afterDeactivateRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${oldToken}`);
    expect(afterDeactivateRes.status).toBe(401);

    const deactivatedLogin = await request(app).post('/api/auth/login').send({
      email: testEmail('target_rev'),
      password: 'ResetPass789!',
    });
    expect(deactivatedLogin.status).toBe(403);
  });
});
