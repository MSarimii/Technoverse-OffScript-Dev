import test from 'node:test';
import assert from 'node:assert/strict';
import { getInitials } from '../initials.js';

test('getInitials strips academic titles and returns first + last initials', () => {
  assert.equal(getInitials('Dr. Tariq Mahmood'), 'TM');
  assert.equal(getInitials('Prof. Ayesha Siddiqui'), 'AS');
  assert.equal(getInitials('Dr. Salman Qureshi'), 'SQ');
  assert.equal(getInitials('Zainab Khan'), 'ZK');
  assert.equal(getInitials('engr. Bilal Ahmed'), 'BA');
  assert.equal(getInitials('Mrs. Hira'), 'HI');
  assert.equal(getInitials(''), 'U');
});
