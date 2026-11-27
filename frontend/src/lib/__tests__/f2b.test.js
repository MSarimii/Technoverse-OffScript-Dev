import test from 'node:test';
import assert from 'node:assert/strict';
import { ServerClock } from '../serverClock.js';
import { formatRemaining } from '../../hooks/useServerTimer.js';

// Pure palette state derivation helper check
function derivePaletteState({ isCurrent, isMarked, isAnswered }) {
  if (isCurrent && isMarked) return 'current-marked';
  if (isCurrent) return 'current';
  if (isMarked) return 'marked';
  if (isAnswered) return 'answered';
  return 'unanswered';
}

test('ServerClock selects offset from smallest RTT sample in last 5', () => {
  const clock = new ServerClock();
  const base = Date.now();
  clock.recordSample(base + 10000, 300);
  clock.recordSample(base + 2000, 15);
  clock.recordSample(base + 9000, 200);
  const rem = clock.remainingMs(base + 2000 + 30000);
  assert.ok(rem >= 29000 && rem <= 31000);
});

test('formatRemaining formats mm:ss and hh:mm:ss', () => {
  assert.equal(formatRemaining(65000), '01:05');
  assert.equal(formatRemaining(3661000), '01:01:01');
  assert.equal(formatRemaining(0), '00:00');
});

test('Palette state derivation handles all 4 states and combinations', () => {
  assert.equal(derivePaletteState({ isCurrent: true, isMarked: true, isAnswered: false }), 'current-marked');
  assert.equal(derivePaletteState({ isCurrent: true, isMarked: false, isAnswered: true }), 'current');
  assert.equal(derivePaletteState({ isCurrent: false, isMarked: true, isAnswered: true }), 'marked');
  assert.equal(derivePaletteState({ isCurrent: false, isMarked: false, isAnswered: true }), 'answered');
  assert.equal(derivePaletteState({ isCurrent: false, isMarked: false, isAnswered: false }), 'unanswered');
});
