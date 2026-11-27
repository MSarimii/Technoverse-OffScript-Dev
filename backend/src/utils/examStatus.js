import { now } from './time.js';

/**
 * Derives the effective exam lifecycle status from persisted status and server time.
 */
export const resolveExamStatus = (exam, currentTime = now()) => {
  if (!exam) return 'draft';

  if (exam.status === 'draft' || exam.status === 'cancelled' || exam.status === 'completed') {
    return exam.status;
  }

  if (exam.status === 'published') {
    const currentMs = new Date(currentTime).getTime();
    const startMs = new Date(exam.startAt).getTime();
    const endMs = new Date(exam.endAt).getTime();

    if (currentMs < startMs) return 'published';
    if (currentMs < endMs) return 'ongoing';
    return 'completed';
  }

  return exam.status;
};
