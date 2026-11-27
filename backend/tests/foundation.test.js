import express from 'express';
import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { createApp } from '../src/app.js';
import { errorMiddleware } from '../src/middleware/errorMiddleware.js';
import { validate } from '../src/middleware/validate.js';
import { sanitizeMiddleware, sanitizeObject } from '../src/utils/sanitize.js';
import { resetClock, setClock } from '../src/utils/time.js';
import { validateEnv } from '../src/utils/validateEnv.js';

const app = createApp();

describe('Phase 1 Backend Foundation', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    resetClock();
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('GET /api/health returns 200 with healthy status envelope', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({
      status: 'healthy',
      db: 'disconnected',
    });
    expect(typeof res.body.data.uptime).toBe('number');
    expect(Number.isNaN(Date.parse(res.body.data.serverNow))).toBe(false);
  });

  it('GET /api/time returns 200 and valid ISO serverNow', async () => {
    setClock(() => new Date('2026-11-27T12:00:00.000Z'));

    const res = await request(app).get('/api/time');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      success: true,
      data: {
        serverNow: '2026-11-27T12:00:00.000Z',
      },
    });
  });

  it('GET unknown route returns 404 NOT_FOUND envelope', async () => {
    const res = await request(app).get('/api/does-not-exist');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatchObject({
      code: 'NOT_FOUND',
      details: [],
    });
    expect(res.body.error.message).toContain('/api/does-not-exist');
  });

  it('POST malformed JSON returns 400 VALIDATION_ERROR envelope', async () => {
    const res = await request(app)
      .post('/api/health')
      .set('Content-Type', 'application/json')
      .send('{"brokenJson": ');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toEqual({
      code: 'VALIDATION_ERROR',
      message: 'Invalid JSON payload',
      details: [],
    });
  });

  it('validate middleware rejects invalid body with field details and sanitize strips $ and . keys', async () => {
    const dirty = {
      name: 'Alice',
      $gt: '',
      nested: { 'evil.key': 1, $where: '1==1', ok: true },
      items: [{ $ne: null, value: 42 }],
    };
    expect(sanitizeObject(dirty)).toEqual({
      name: 'Alice',
      nested: { ok: true },
      items: [{ value: 42 }],
    });

    const testApp = express();
    testApp.use(express.json());
    testApp.use(sanitizeMiddleware);
    testApp.post(
      '/check',
      validate({
        body: z.object({
          email: z.string().email(),
          duration: z.number().int().positive(),
        }),
      }),
      (req, res) => res.json({ success: true, data: { body: req.body, query: req.query } })
    );
    testApp.use(errorMiddleware);

    const sanitizedRes = await request(testApp)
      .post('/check?safe=1&bad.key=2&$gt=3')
      .send({ email: 'alice@example.com', duration: 60, $ne: '', 'a.b': 1 });

    expect(sanitizedRes.status).toBe(200);
    expect(sanitizedRes.body.data).toEqual({
      body: { email: 'alice@example.com', duration: 60 },
      query: { safe: '1' },
    });

    const res = await request(testApp)
      .post('/check')
      .send({ email: 'not-an-email', duration: -5 });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: 'email' }),
        expect.objectContaining({ path: 'duration' }),
      ])
    );
  });

  it('validateEnv fails fast when JWT_SECRET or MONGO_URI is missing', () => {
    expect(() =>
      validateEnv({
        MONGO_URI: 'mongodb://localhost:27017/test',
      })
    ).toThrow(/JWT_SECRET/);

    expect(() =>
      validateEnv({
        JWT_SECRET: 'super_secret_key_for_tests',
      })
    ).toThrow(/MONGO_URI/);

    const parsed = validateEnv({
      MONGODB_URI: 'mongodb://localhost:27017/fallback',
      JWT_SECRET: 'super_secret_key_for_tests',
    });
    expect(parsed.MONGO_URI).toBe('mongodb://localhost:27017/fallback');
    expect(parsed.JWT_EXPIRES_IN).toBe('8h');
    expect(parsed.USE_MOCK_AI).toBe(true);
    expect(parsed.ALLOW_SELF_REGISTER).toBe(false);
  });

  it('errorMiddleware omits stack when NODE_ENV is production', async () => {
    process.env.NODE_ENV = 'production';

    const prodApp = createApp();
    const res = await request(prodApp).get('/api/does-not-exist');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.stack).toBeUndefined();
    expect(res.body.error.stack).toBeUndefined();

    const errApp = express();
    errApp.get('/boom', () => {
      throw new Error('Sensitive internal failure');
    });
    errApp.use(errorMiddleware);

    const boomRes = await request(errApp).get('/boom');
    expect(boomRes.status).toBe(500);
    expect(boomRes.body).toEqual({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal Server Error',
        details: [],
      },
    });
  });
});
