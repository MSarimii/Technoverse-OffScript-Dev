import Attempt from '../models/Attempt.js';
import { now } from '../utils/time.js';
import { finalizeAttempt } from './attemptService.js';

let sweeperTimer = null;

/**
 * Atomically expires all overdue in_progress attempts belonging to a single exam.
 */
export const sweepExamOverdueAttempts = async (examId, currentTime = now()) => {
  const overdue = await Attempt.find({
    examId,
    status: 'in_progress',
    deadlineAt: { $lte: currentTime },
  }).select('_id');

  let sweptCount = 0;
  for (const doc of overdue) {
    const finalized = await finalizeAttempt(doc._id, 'expiry', currentTime);
    if (finalized) sweptCount += 1;
  }

  return sweptCount;
};

/**
 * Atomically expires all in_progress attempts whose server deadline has passed.
 */
export const sweepExpiredAttempts = async (currentTime = now()) => {
  const overdue = await Attempt.find({
    status: 'in_progress',
    deadlineAt: { $lte: currentTime },
  }).select('_id');

  let sweptCount = 0;
  for (const doc of overdue) {
    const finalized = await finalizeAttempt(doc._id, 'expiry', currentTime);
    if (finalized) sweptCount += 1;
  }

  return sweptCount;
};

/**
 * Starts the background attempt expiry sweeper interval (disabled in test runs).
 */
export const startSweeper = () => {
  stopSweeper();
  const intervalSeconds = Math.max(1, Number(process.env.SWEEPER_INTERVAL_SECONDS) || 15);
  sweeperTimer = setInterval(() => {
    sweepExpiredAttempts().catch((err) => {
      console.error(`[Attempt Sweeper Error] ${err.message}`);
    });
  }, intervalSeconds * 1000);
  if (typeof sweeperTimer.unref === 'function') {
    sweeperTimer.unref();
  }
};

/**
 * Stops the background attempt expiry sweeper interval if active.
 */
export const stopSweeper = () => {
  if (sweeperTimer) {
    clearInterval(sweeperTimer);
    sweeperTimer = null;
  }
};
