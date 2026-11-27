import test from 'node:test';
import assert from 'node:assert/strict';
import { mapErrorCodeToCopy } from '../errors.js';
import { ServerClock } from '../serverClock.js';
import { sanitizeCell, parseCsvSafe } from '../csv.js';

test('mapErrorCodeToCopy maps known contract error codes', () => {
  assert.equal(
    mapErrorCodeToCopy('EXAM_NOT_AVAILABLE'),
    'This examination is not currently open for entry.'
  );
  assert.equal(
    mapErrorCodeToCopy('NOT_ENROLLED'),
    'You are not enrolled in this exam. Contact your examiner.'
  );
  assert.equal(mapErrorCodeToCopy('UNKNOWN', 'Custom fallback'), 'Custom fallback');
});

test('ServerClock computes remainingMs from smallest RTT sample', () => {
  const clock = new ServerClock();
  const serverNow = Date.now() + 5000;
  clock.recordSample(serverNow, 120);
  clock.recordSample(serverNow, 20);
  const deadline = serverNow + 60000;
  const rem = clock.remainingMs(deadline);
  assert.ok(rem >= 59000 && rem <= 61000);
});

test('CSV sanitizer neutralizes formula injection prefixes', () => {
  assert.equal(sanitizeCell('=CMD()'), "'=CMD()");
  assert.equal(sanitizeCell('+123'), "'+123");
  assert.equal(sanitizeCell('-123'), "'-123");
  assert.equal(sanitizeCell('@SUM(A1)'), "'@SUM(A1)");
  assert.equal(sanitizeCell('Normal text'), 'Normal text');

  const parsed = parseCsvSafe('email,name\n=evil@test.com,Alice');
  assert.equal(parsed.rows[0].email, "'=evil@test.com");
});
