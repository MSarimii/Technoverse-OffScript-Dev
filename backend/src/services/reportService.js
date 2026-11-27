import crypto from 'node:crypto';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import Attempt from '../models/Attempt.js';
import Exam from '../models/Exam.js';
import ReportVerification from '../models/ReportVerification.js';
import { ApiError } from '../utils/ApiError.js';
import { now } from '../utils/time.js';
import { sweepExamOverdueAttempts } from './attemptSweeper.js';
import { assertExamAccess } from './examService.js';
import { getExamAnalytics, getExamQuestionAnalytics } from './gradingService.js';

const getHmacSecret = () => {
  if (process.env.VERIFY_HMAC_SECRET) {
    return process.env.VERIFY_HMAC_SECRET;
  }
  if (process.env.NODE_ENV !== 'production') {
    return 'sems_dev_verify_hmac_fallback_secret_32chars';
  }
  throw new ApiError(500, 'INTERNAL_ERROR', 'VERIFY_HMAC_SECRET is not configured');
};

export const computeReportHmac = ({ code, attemptId, examId, totalScore, maxScore }) => {
  const payload = `${code}|${attemptId}|${examId}|${totalScore}|${maxScore}`;
  return crypto.createHmac('sha256', getHmacSecret()).update(payload).digest('hex');
};

const verifyHmacSignature = (record) => {
  const expected = computeReportHmac({
    code: record.code,
    attemptId: String(record.attemptId),
    examId: String(record.examId),
    totalScore: record.scoreSnapshot?.totalScore,
    maxScore: record.scoreSnapshot?.maxScore,
  });

  const bufExpected = Buffer.from(expected, 'utf8');
  const bufActual = Buffer.from(String(record.hmac || ''), 'utf8');
  return bufExpected.length === bufActual.length && crypto.timingSafeEqual(bufExpected, bufActual);
};

const maskName = (name) =>
  String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => (word.length <= 1 ? '*' : `${word[0]}${'*'.repeat(Math.max(2, word.length - 1))}`))
    .join(' ');

const maskRollNo = (rollNo) => {
  const raw = String(rollNo || '').trim();
  if (!raw) return null;
  if (raw.length <= 2) return '**';
  return `***${raw.slice(-2)}`;
};

const buildPdfBuffer = (drawFn) =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    Promise.resolve(drawFn(doc))
      .then(() => doc.end())
      .catch(reject);
  });

/**
 * Gets or creates an HMAC-signed verification record matching the attempt's current finalized scores.
 */
export const getOrCreateVerification = async (attempt) => {
  const snapshot = {
    totalScore: attempt.totalScore ?? 0,
    maxScore: attempt.maxScore ?? 0,
    percentage: attempt.percentage ?? 0,
  };

  const existing = await ReportVerification.findOne({ attemptId: attempt._id });
  if (existing) {
    const matchesScore =
      existing.scoreSnapshot.totalScore === snapshot.totalScore &&
      existing.scoreSnapshot.maxScore === snapshot.maxScore &&
      existing.scoreSnapshot.percentage === snapshot.percentage;

    if (matchesScore) {
      return existing;
    }

    existing.scoreSnapshot = snapshot;
    existing.issuedAt = now();
    existing.hmac = computeReportHmac({
      code: existing.code,
      attemptId: String(attempt._id),
      examId: String(attempt.examId),
      totalScore: snapshot.totalScore,
      maxScore: snapshot.maxScore,
    });
    await existing.save();
    return existing;
  }

  const code = `SEMS-${crypto.randomBytes(5).toString('hex').toUpperCase()}`;
  const issuedAt = now();
  const hmac = computeReportHmac({
    code,
    attemptId: String(attempt._id),
    examId: String(attempt.examId),
    totalScore: snapshot.totalScore,
    maxScore: snapshot.maxScore,
  });

  try {
    return await ReportVerification.create({
      code,
      attemptId: attempt._id,
      examId: attempt.examId,
      scoreSnapshot: snapshot,
      issuedAt,
      hmac,
    });
  } catch (err) {
    if (err?.code === 11000) {
      return ReportVerification.findOne({ attemptId: attempt._id });
    }
    throw err;
  }
};

/**
 * Publicly verifies a report code via timing-safe HMAC check, returning non-PII masked metadata only.
 */
export const verifyReportCode = async ({ code }) => {
  const record = await ReportVerification.findOne({ code: String(code || '').trim() }).lean();
  if (!record || !verifyHmacSignature(record)) {
    return { valid: false };
  }

  const [exam, attempt] = await Promise.all([
    Exam.findById(record.examId).select('title').lean(),
    Attempt.findById(record.attemptId).populate('userId', 'name rollNo').select('userId').lean(),
  ]);

  if (!exam || !attempt?.userId) {
    return { valid: false };
  }

  const rollNoMasked = maskRollNo(attempt.userId.rollNo);

  return {
    valid: true,
    code: record.code,
    examTitle: exam.title,
    issuedAt: record.issuedAt,
    score: {
      totalScore: record.scoreSnapshot.totalScore,
      maxScore: record.scoreSnapshot.maxScore,
      percentage: record.scoreSnapshot.percentage,
    },
    candidateMasked: maskName(attempt.userId.name),
    ...(rollNoMasked ? { rollNoMasked } : {}),
  };
};

/**
 * Generates an exam-wide analytics & per-question calibration PDF report for examiners/admins.
 */
export const generateExamReportPdf = async ({ user, examId }) => {
  const exam = await Exam.findById(examId).lean();
  assertExamAccess(exam, user);

  const [analytics, questionStats] = await Promise.all([
    getExamAnalytics({ user, examId }),
    getExamQuestionAnalytics({ user, examId }),
  ]);

  const buffer = await buildPdfBuffer((doc) => {
    doc.fontSize(18).text('SEMS Examination Summary Report', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(12).text(`Exam: ${exam.title}`);
    doc.text(`Window: ${new Date(exam.startAt).toISOString()} to ${new Date(exam.endAt).toISOString()}`);
    doc.text(`Duration: ${exam.durationMinutes} min | Total Marks: ${exam.totalMarks}`);
    doc.moveDown();

    doc.fontSize(14).text('Performance Summary');
    doc.fontSize(11);
    doc.text(`Finalized Attempts: ${analytics.attemptCount} (Graded: ${analytics.gradedCount})`);
    doc.text(
      `Mean: ${analytics.mean} | Median: ${analytics.median} | Min: ${analytics.min} | Max: ${analytics.max}`
    );
    doc.text(
      `Pass Rate: ${analytics.passRate}% | Completion Rate: ${analytics.completionRate}% | Avg Time: ${analytics.avgTimeMinutes} min`
    );
    doc.moveDown();

    doc.fontSize(14).text('Score Distribution');
    doc.fontSize(11);
    for (const bucket of analytics.scoreHistogram) {
      doc.text(`  ${bucket.range}: ${bucket.count} candidate(s)`);
    }
    doc.moveDown();

    if (questionStats.questions.length > 0) {
      doc.fontSize(14).text('Question Calibration');
      doc.fontSize(10);
      questionStats.questions.forEach((q, idx) => {
        doc.text(
          `${idx + 1}. [${q.type}] (${q.topic}) Labeled=${q.labeledDifficulty}, Observed=${q.observedDifficulty}, CorrectRate=${q.correctRate}, AvgScore=${q.avgScore}/${q.maxMarks}`
        );
      });
    }
  });

  return {
    buffer,
    filename: `exam-report-${exam._id}.pdf`,
  };
};

/**
 * Generates a verifiable candidate attempt result PDF embedding an HMAC-backed QR code.
 */
export const generateAttemptReportPdf = async ({ user, attemptId }) => {
  const attempt = await Attempt.findById(attemptId).populate('userId', 'name rollNo');
  if (!attempt) {
    throw new ApiError(404, 'NOT_FOUND', 'Attempt not found');
  }

  if (attempt.isSandbox || attempt.status === 'in_progress') {
    throw new ApiError(
      409,
      'CONFLICT',
      'Verification PDF report is only available for finalized non-sandbox attempts'
    );
  }

  const exam = await Exam.findById(attempt.examId).lean();
  if (!exam) {
    throw new ApiError(404, 'NOT_FOUND', 'Exam not found');
  }

  if (user.role === 'candidate') {
    const ownerId = String(attempt.userId?._id ?? attempt.userId);
    if (ownerId !== String(user._id)) {
      throw new ApiError(403, 'FORBIDDEN', 'You do not have permission to access this report');
    }
    if (!exam.resultsPublished) {
      throw new ApiError(
        403,
        'RESULTS_NOT_PUBLISHED',
        'Results for this exam have not been published yet'
      );
    }
  } else {
    assertExamAccess(exam, user);
  }

  const verification = await getOrCreateVerification(attempt);
  const clientBase = (process.env.CLIENT_URL || 'http://localhost:5173').split(',')[0].trim();
  const qrPayload = `${clientBase}/verify/${verification.code}`;
  const qrPng = await QRCode.toBuffer(qrPayload, { type: 'png', width: 130, margin: 1 });

  const buffer = await buildPdfBuffer((doc) => {
    doc.fontSize(18).text('SEMS Official Candidate Score Report', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(12).text(`Exam: ${exam.title}`);
    doc.text(`Candidate: ${attempt.userId?.name || 'Candidate'}`);
    if (attempt.userId?.rollNo) {
      doc.text(`Roll No: ${attempt.userId.rollNo}`);
    }
    doc.text(`Status: ${attempt.status} | Grading: ${attempt.gradingStatus}`);
    doc.text(
      `Score: ${attempt.totalScore ?? 0} / ${attempt.maxScore ?? 0} (${attempt.percentage ?? 0}%)`
    );
    if (attempt.submittedAt) {
      doc.text(`Submitted At: ${new Date(attempt.submittedAt).toISOString()}`);
    }
    doc.moveDown();

    doc.fontSize(13).text('Question Breakdown');
    doc.fontSize(10);
    const gradeMap = new Map((attempt.grades || []).map((g) => [String(g.questionId), g]));
    (attempt.paper || []).forEach((item, idx) => {
      const g = gradeMap.get(String(item.questionId));
      doc.text(
        `${idx + 1}. [${item.type}] (${item.topic}) Score: ${g?.finalScore ?? 0} / ${item.marks}`
      );
    });
    doc.moveDown();

    doc.fontSize(11).text(`Verification Code: ${verification.code}`);
    doc.text(`Issued At: ${new Date(verification.issuedAt).toISOString()}`);
    doc.moveDown(0.5);
    doc.image(qrPng, { fit: [120, 120] });
  });

  return {
    buffer,
    filename: `attempt-report-${attempt._id}.pdf`,
  };
};

/**
 * Neutralizes leading formula-injection characters before CSV serialization.
 */
export const sanitizeCsvCell = (val) => {
  const raw = val === null || val === undefined ? '' : String(val);
  const neutralized = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  if (/[",\n\r]/.test(neutralized)) {
    return `"${neutralized.replace(/"/g, '""')}"`;
  }
  return neutralized;
};

/**
 * Exports formula-safe CSV exam results across real non-sandbox attempts for examiners/admins.
 */
export const exportExamResultsCsv = async ({ user, examId }) => {
  const exam = await Exam.findById(examId).lean();
  assertExamAccess(exam, user);

  await sweepExamOverdueAttempts(exam._id);

  const attempts = await Attempt.find({ examId: exam._id, isSandbox: false })
    .populate('userId', 'name email rollNo')
    .sort({ totalScore: -1, submittedAt: 1 })
    .lean();

  const header = [
    'Candidate Name',
    'Email',
    'Roll No',
    'Attempt Status',
    'Grading Status',
    'Total Score',
    'Max Score',
    'Percentage',
    'Submitted At',
  ];

  const rows = attempts.map((a) => {
    const cand = a.userId && typeof a.userId === 'object' ? a.userId : {};
    return [
      cand.name || 'Candidate',
      cand.email || '',
      cand.rollNo || '',
      a.status,
      a.gradingStatus,
      a.totalScore ?? 0,
      a.maxScore ?? 0,
      a.percentage ?? 0,
      a.submittedAt ? new Date(a.submittedAt).toISOString() : '',
    ].map(sanitizeCsvCell);
  });

  const csv = [header.map(sanitizeCsvCell).join(','), ...rows.map((r) => r.join(','))].join('\n');
  return {
    csv,
    filename: `exam-results-${exam._id}.csv`,
  };
};
