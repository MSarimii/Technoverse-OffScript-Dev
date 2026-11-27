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

const PDF_MARGIN = 40;
const PDF_PAGE_WIDTH = 595.28;
const PDF_CONTENT_WIDTH = 515;

const COLORS = {
  slateDark: '#0F172A',
  slateHeader: '#1E293B',
  slateText: '#334155',
  slateMuted: '#64748B',
  emerald: '#10B981',
  emeraldDark: '#059669',
  emeraldSoft: '#F0FDF4',
  rowAlt: '#F8FAFC',
  border: '#CBD5E1',
  borderLight: '#E2E8F0',
  white: '#FFFFFF',
  amberBg: '#FEF3C7',
  amberText: '#92400E',
};

const sanitizePdfText = (val) =>
  String(val ?? '')
    .replace(/[\t\r\n]+/g, ' ')
    .replace(/[\x00-\x1F\x7F]/g, '')
    .replace(/ {2,}/g, ' ')
    .trim();

const formatDateUtc = (date) => {
  if (!date) return 'N/A';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return 'N/A';
  return `${d.toISOString().slice(0, 16).replace('T', ' ')} UTC`;
};

const ensurePageSpace = (doc, neededHeight = 60) => {
  if (doc.y + neededHeight > doc.page.height - 50) {
    doc.addPage();
    doc.x = PDF_MARGIN;
    doc.y = PDF_MARGIN;
    return true;
  }
  return false;
};

const drawHeaderBanner = (doc, title, subtitle) => {
  const bannerW = doc.page.width || PDF_PAGE_WIDTH;
  doc.save();
  doc.rect(0, 0, bannerW, 64).fill(COLORS.slateDark);
  doc.rect(0, 64, bannerW, 4).fill(COLORS.emerald);

  doc
    .font('Helvetica-Bold')
    .fontSize(15)
    .fillColor(COLORS.white)
    .text(sanitizePdfText(title), PDF_MARGIN, 15, { width: PDF_CONTENT_WIDTH, lineBreak: false });

  doc
    .font('Helvetica')
    .fontSize(10.5)
    .fillColor('#CBD5E1')
    .text(sanitizePdfText(subtitle), PDF_MARGIN, 37, { width: PDF_CONTENT_WIDTH, lineBreak: false });

  doc.restore();
  doc.font('Helvetica').fontSize(10).fillColor(COLORS.slateDark);
  doc.x = PDF_MARGIN;
  doc.y = 84;
};

const drawSectionHeading = (doc, label) => {
  ensurePageSpace(doc, 32);
  doc
    .font('Helvetica-Bold')
    .fontSize(11.5)
    .fillColor(COLORS.slateDark)
    .text(sanitizePdfText(label), PDF_MARGIN, doc.y, { width: PDF_CONTENT_WIDTH });
  doc.y += 6;
};

const drawTable = (doc, headers, rows, colWidths, options = {}) => {
  const { alignments = [], renderCell } = options;
  const padX = 6;
  const padY = 5;
  const headerFontSize = 8.5;
  const bodyFontSize = 8.5;

  const measureHeaderHeight = () => {
    doc.font('Helvetica-Bold').fontSize(headerFontSize);
    let maxH = 14;
    headers.forEach((h, i) => {
      const hVal = doc.heightOfString(sanitizePdfText(h), {
        width: Math.max(10, colWidths[i] - padX * 2),
      });
      if (hVal > maxH) maxH = hVal;
    });
    return Math.ceil(maxH + padY * 2);
  };

  const drawHeaderRow = (headerH) => {
    const startY = doc.y;
    let x = PDF_MARGIN;
    doc.save();
    doc.rect(PDF_MARGIN, startY, PDF_CONTENT_WIDTH, headerH).fill(COLORS.slateHeader);
    doc.font('Helvetica-Bold').fontSize(headerFontSize).fillColor(COLORS.white);
    headers.forEach((h, i) => {
      const w = colWidths[i];
      doc.text(sanitizePdfText(h), x + padX, startY + padY, {
        width: Math.max(10, w - padX * 2),
        align: alignments[i] || 'left',
      });
      x += w;
    });
    doc.restore();
    doc.x = PDF_MARGIN;
    doc.y = startY + headerH;
  };

  const headerH = measureHeaderHeight();
  ensurePageSpace(doc, headerH + 26);
  drawHeaderRow(headerH);

  rows.forEach((row, rowIdx) => {
    doc.font('Helvetica').fontSize(bodyFontSize);
    let maxCellH = 12;
    row.forEach((cell, i) => {
      const text = sanitizePdfText(cell?.text ?? cell);
      const hVal = doc.heightOfString(text, {
        width: Math.max(10, colWidths[i] - padX * 2),
      });
      if (hVal > maxCellH) maxCellH = hVal;
    });
    const rowH = Math.ceil(maxCellH + padY * 2);

    if (ensurePageSpace(doc, rowH + 4)) {
      drawHeaderRow(headerH);
    }

    const rowY = doc.y;
    const bgColor = rowIdx % 2 === 0 ? COLORS.white : COLORS.rowAlt;

    doc.save();
    doc.rect(PDF_MARGIN, rowY, PDF_CONTENT_WIDTH, rowH).fillAndStroke(bgColor, COLORS.borderLight);

    let x = PDF_MARGIN;
    row.forEach((cell, i) => {
      const w = colWidths[i];
      if (i > 0) {
        doc
          .moveTo(x, rowY)
          .lineTo(x, rowY + rowH)
          .strokeColor(COLORS.borderLight)
          .lineWidth(0.5)
          .stroke();
      }

      if (renderCell && renderCell(doc, cell, { colIdx: i, rowIdx, x, y: rowY, w, h: rowH, padX, padY })) {
        x += w;
        return;
      }

      const cellText = sanitizePdfText(cell?.text ?? cell);
      doc
        .font(cell?.bold ? 'Helvetica-Bold' : 'Helvetica')
        .fontSize(bodyFontSize)
        .fillColor(cell?.color || COLORS.slateText)
        .text(cellText, x + padX, rowY + padY, {
          width: Math.max(10, w - padX * 2),
          align: alignments[i] || 'left',
        });
      x += w;
    });

    doc.restore();
    doc.x = PDF_MARGIN;
    doc.y = rowY + rowH;
  });

  doc.y += 12;
};

const drawFooter = (doc) => {
  const footerY = Math.min(doc.y + 4, doc.page.height - 28);
  doc.save();
  doc
    .font('Helvetica')
    .fontSize(8)
    .fillColor(COLORS.slateMuted)
    .text(`Generated by SEMS · ${formatDateUtc(now())}`, PDF_MARGIN, footerY, {
      width: PDF_CONTENT_WIDTH,
      align: 'right',
      lineBreak: false,
    });
  doc.restore();
};

const buildPdfBuffer = (drawFn) =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: PDF_MARGIN, size: 'A4' });
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
    drawHeaderBanner(doc, 'SEMS — Secure Examination Suite', 'Official Examination Summary Report');

    // Exam Metadata Info Box
    const examTitle = sanitizePdfText(exam.title || 'Untitled Exam');
    const scheduleStr = `${formatDateUtc(exam.startAt)}  to  ${formatDateUtc(exam.endAt)}`;
    doc.font('Helvetica-Bold').fontSize(12);
    const titleH = doc.heightOfString(examTitle, { width: PDF_CONTENT_WIDTH - 24 });
    const metaBoxH = Math.max(66, 46 + titleH);
    const metaY = doc.y;

    doc.save();
    doc
      .roundedRect(PDF_MARGIN, metaY, PDF_CONTENT_WIDTH, metaBoxH, 4)
      .fillAndStroke(COLORS.rowAlt, COLORS.border);
    doc
      .font('Helvetica-Bold')
      .fontSize(8)
      .fillColor(COLORS.slateMuted)
      .text('EXAMINATION', PDF_MARGIN + 12, metaY + 10, { lineBreak: false });
    doc
      .font('Helvetica-Bold')
      .fontSize(12)
      .fillColor(COLORS.slateDark)
      .text(examTitle, PDF_MARGIN + 12, metaY + 21, { width: PDF_CONTENT_WIDTH - 24 });
    const row2Y = metaY + 25 + titleH;
    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor(COLORS.slateText)
      .text(`Schedule: ${scheduleStr}`, PDF_MARGIN + 12, row2Y, { width: 320, lineBreak: false })
      .text(
        `Duration: ${exam.durationMinutes} min   |   Total Marks: ${exam.totalMarks}`,
        PDF_MARGIN + 335,
        row2Y,
        { width: 168, align: 'right', lineBreak: false }
      );
    doc.restore();
    doc.x = PDF_MARGIN;
    doc.y = metaY + metaBoxH + 14;

    // 4-Card KPI Row
    const gap = 10;
    const cardW = (PDF_CONTENT_WIDTH - gap * 3) / 4;
    const cardH = 60;
    const kpiY = doc.y;
    const kpis = [
      {
        label: 'ATTEMPTS',
        value: String(analytics.attemptCount),
        sub: `Graded: ${analytics.gradedCount}`,
      },
      {
        label: 'MEAN / MEDIAN',
        value: `${analytics.mean} / ${analytics.median}`,
        sub: `Min ${analytics.min} · Max ${analytics.max}`,
      },
      {
        label: 'PASS RATE',
        value: `${analytics.passRate}%`,
        sub: 'Score >= 50%',
      },
      {
        label: 'COMPLETION',
        value: `${analytics.completionRate}%`,
        sub: `Avg Time: ${analytics.avgTimeMinutes} min`,
      },
    ];

    kpis.forEach((kpi, idx) => {
      const cx = PDF_MARGIN + idx * (cardW + gap);
      doc.save();
      doc
        .roundedRect(cx, kpiY, cardW, cardH, 4)
        .fillAndStroke(COLORS.white, COLORS.border);
      doc
        .font('Helvetica-Bold')
        .fontSize(7.5)
        .fillColor(COLORS.slateMuted)
        .text(kpi.label, cx + 9, kpiY + 9, { width: cardW - 18, lineBreak: false });
      doc
        .font('Helvetica-Bold')
        .fontSize(13)
        .fillColor(COLORS.slateDark)
        .text(kpi.value, cx + 9, kpiY + 22, { width: cardW - 18, lineBreak: false });
      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor(COLORS.slateText)
        .text(kpi.sub, cx + 9, kpiY + 42, { width: cardW - 18, lineBreak: false });
      doc.restore();
    });
    doc.x = PDF_MARGIN;
    doc.y = kpiY + cardH + 16;

    // Score Distribution Table with visual progress bar
    drawSectionHeading(doc, 'Score Distribution');
    const totalAttempts = analytics.attemptCount || 0;
    const distRows = (analytics.scoreHistogram || []).map((bucket) => {
      const share = totalAttempts > 0 ? Math.round((bucket.count / totalAttempts) * 1000) / 10 : 0;
      return [bucket.range, String(bucket.count), { text: `${share.toFixed(1)}%`, share }];
    });

    drawTable(doc, ['Range', 'Candidates', 'Share %'], distRows, [145, 110, 260], {
      alignments: ['left', 'right', 'right'],
      renderCell: (d, cell, { colIdx, x, y, w, h, padX }) => {
        if (colIdx !== 2) return false;
        const share = Number(cell?.share ?? 0);
        const barW = 165;
        const barH = 8;
        const barX = x + padX + 4;
        const barY = y + (h - barH) / 2;
        const fillW = Math.max(0, Math.min(barW, (barW * share) / 100));

        d.roundedRect(barX, barY, barW, barH, 2).fill(COLORS.borderLight);
        if (fillW > 0) {
          d.roundedRect(barX, barY, fillW, barH, 2).fill(COLORS.emerald);
        }
        d.font('Helvetica-Bold')
          .fontSize(8.5)
          .fillColor(COLORS.slateText)
          .text(cell.text, x + padX, y + (h - 9) / 2, {
            width: w - padX * 2,
            align: 'right',
            lineBreak: false,
          });
        return true;
      },
    });

    // Question Calibration Table
    if (questionStats.questions.length > 0) {
      drawSectionHeading(doc, 'Question Calibration');
      const qRows = questionStats.questions.map((q, idx) => {
        const topicLabel = sanitizePdfText(q.topic || 'General');
        const topicCell = q.flaggedAmbiguous
          ? { text: `${topicLabel} [Flagged]`, color: COLORS.amberText, bold: true }
          : topicLabel;
        const accuracyPct = `${Math.round((q.correctRate ?? 0) * 100)}%`;
        return [
          String(idx + 1),
          sanitizePdfText(q.type),
          topicCell,
          sanitizePdfText(q.labeledDifficulty),
          sanitizePdfText(q.observedDifficulty),
          accuracyPct,
          `${q.avgScore} / ${q.maxMarks}`,
        ];
      });

      drawTable(
        doc,
        ['#', 'Type', 'Topic', 'Labeled', 'Observed', 'Accuracy', 'Avg Score'],
        qRows,
        [26, 54, 155, 62, 74, 64, 80],
        { alignments: ['center', 'left', 'left', 'left', 'left', 'right', 'right'] }
      );
    }

    drawFooter(doc);
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
  const qrPng = await QRCode.toBuffer(qrPayload, { type: 'png', width: 200, margin: 1 });

  const buffer = await buildPdfBuffer((doc) => {
    drawHeaderBanner(doc, 'SEMS — Secure Examination Suite', 'Official Candidate Score Transcript');

    // Two-Column Top Summary
    const gap = 12;
    const leftW = 335;
    const rightW = PDF_CONTENT_WIDTH - leftW - gap;
    const topY = doc.y;

    const candName = sanitizePdfText(attempt.userId?.name || 'Candidate');
    const rollNo = sanitizePdfText(attempt.userId?.rollNo || 'N/A');
    const examTitle = sanitizePdfText(exam.title || 'Untitled Exam');
    const statusLine = `${sanitizePdfText(attempt.status)} | Grading: ${sanitizePdfText(
      attempt.gradingStatus
    )}`;
    const submittedStr = formatDateUtc(attempt.submittedAt);

    doc.font('Helvetica').fontSize(9.5);
    const examTitleH = doc.heightOfString(examTitle, { width: leftW - 95 });
    const summaryH = Math.max(114, 96 + examTitleH);

    // Left Card: Candidate & Exam Info
    doc.save();
    doc
      .roundedRect(PDF_MARGIN, topY, leftW, summaryH, 4)
      .fillAndStroke(COLORS.rowAlt, COLORS.border);

    let cy = topY + 12;
    const drawInfoRow = (label, value, boldVal = false) => {
      doc
        .font('Helvetica-Bold')
        .fontSize(8.5)
        .fillColor(COLORS.slateMuted)
        .text(label, PDF_MARGIN + 12, cy, { width: 72, lineBreak: false });
      doc
        .font(boldVal ? 'Helvetica-Bold' : 'Helvetica')
        .fontSize(9.5)
        .fillColor(COLORS.slateDark)
        .text(value, PDF_MARGIN + 86, cy, { width: leftW - 98 });
      const valH = doc.heightOfString(value, { width: leftW - 98 });
      cy += Math.max(16, valH + 4);
    };

    drawInfoRow('CANDIDATE', candName, true);
    drawInfoRow('ROLL NO', rollNo);
    drawInfoRow('EXAM', examTitle);
    drawInfoRow('STATUS', statusLine);
    drawInfoRow('SUBMITTED', submittedStr);
    doc.restore();

    // Right Highlight Card: Score & Status Badge
    const rightX = PDF_MARGIN + leftW + gap;
    const totalScore = attempt.totalScore ?? 0;
    const maxScore = attempt.maxScore ?? 0;
    const pct = attempt.percentage ?? 0;
    const badgeLabel =
      attempt.gradingStatus === 'complete'
        ? 'GRADED'
        : sanitizePdfText(attempt.gradingStatus).toUpperCase();

    doc.save();
    doc
      .roundedRect(rightX, topY, rightW, summaryH, 4)
      .lineWidth(1.2)
      .fillAndStroke(COLORS.emeraldSoft, COLORS.emerald);

    doc
      .font('Helvetica-Bold')
      .fontSize(8)
      .fillColor(COLORS.emeraldDark)
      .text('FINAL SCORE', rightX + 10, topY + 12, {
        width: rightW - 20,
        align: 'center',
        lineBreak: false,
      });
    doc
      .font('Helvetica-Bold')
      .fontSize(20)
      .fillColor(COLORS.slateDark)
      .text(`${totalScore} / ${maxScore}`, rightX + 10, topY + 28, {
        width: rightW - 20,
        align: 'center',
        lineBreak: false,
      });
    doc
      .font('Helvetica-Bold')
      .fontSize(13)
      .fillColor(COLORS.emeraldDark)
      .text(`${pct}%`, rightX + 10, topY + 56, {
        width: rightW - 20,
        align: 'center',
        lineBreak: false,
      });

    const badgeW = 92;
    const badgeH = 18;
    const badgeX = rightX + (rightW - badgeW) / 2;
    const badgeY = topY + summaryH - 28;
    doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 9).fill(COLORS.emerald);
    doc
      .font('Helvetica-Bold')
      .fontSize(8)
      .fillColor(COLORS.white)
      .text(badgeLabel, badgeX, badgeY + 5, {
        width: badgeW,
        align: 'center',
        lineBreak: false,
      });
    doc.restore();

    doc.x = PDF_MARGIN;
    doc.y = topY + summaryH + 16;

    // Question Breakdown Table
    drawSectionHeading(doc, 'Question Breakdown');
    const gradeMap = new Map((attempt.grades || []).map((g) => [String(g.questionId), g]));
    const breakdownRows = (attempt.paper || []).map((item, idx) => {
      const g = gradeMap.get(String(item.questionId));
      const cleanQ = sanitizePdfText(item.text || '');
      const truncatedQ = cleanQ.length > 55 ? `${cleanQ.slice(0, 52)}...` : cleanQ;
      const cleanFeedback = sanitizePdfText(g?.feedback || '');
      const qCell = cleanFeedback ? `${truncatedQ} [Note: ${cleanFeedback}]` : truncatedQ;
      return [
        String(idx + 1),
        sanitizePdfText(item.type),
        sanitizePdfText(item.topic || 'General'),
        qCell,
        `${g?.finalScore ?? 0} / ${item.marks}`,
      ];
    });

    drawTable(
      doc,
      ['#', 'Type', 'Topic', 'Question', 'Score / Max'],
      breakdownRows,
      [26, 54, 96, 259, 80],
      { alignments: ['center', 'left', 'left', 'left', 'right'] }
    );

    // Verification Box
    ensurePageSpace(doc, 130);
    const verY = doc.y + 4;
    const verH = 116;
    const verTextW = PDF_CONTENT_WIDTH - 132;

    doc.save();
    doc
      .roundedRect(PDF_MARGIN, verY, PDF_CONTENT_WIDTH, verH, 4)
      .fillAndStroke(COLORS.rowAlt, COLORS.border);

    doc
      .font('Helvetica-Bold')
      .fontSize(9)
      .fillColor(COLORS.slateMuted)
      .text('TAMPER-EVIDENT VERIFICATION', PDF_MARGIN + 14, verY + 12, {
        width: verTextW,
        lineBreak: false,
      });
    doc
      .font('Helvetica-Bold')
      .fontSize(12)
      .fillColor(COLORS.slateDark)
      .text(sanitizePdfText(verification.code), PDF_MARGIN + 14, verY + 27, {
        width: verTextW,
        lineBreak: false,
      });
    doc
      .font('Helvetica')
      .fontSize(8.5)
      .fillColor(COLORS.slateText)
      .text(`Verify URL: ${sanitizePdfText(qrPayload)}`, PDF_MARGIN + 14, verY + 47, {
        width: verTextW,
      });
    doc
      .font('Helvetica')
      .fontSize(8.5)
      .fillColor(COLORS.slateMuted)
      .text(`Issued: ${formatDateUtc(verification.issuedAt)}`, PDF_MARGIN + 14, verY + 74, {
        width: verTextW,
        lineBreak: false,
      });
    doc
      .font('Helvetica')
      .fontSize(7.5)
      .fillColor(COLORS.slateMuted)
      .text(
        'Scan the QR code or open the URL above to confirm score authenticity via HMAC.',
        PDF_MARGIN + 14,
        verY + 92,
        { width: verTextW, lineBreak: false }
      );

    doc.image(qrPng, PDF_MARGIN + PDF_CONTENT_WIDTH - 108, verY + 8, {
      width: 100,
      height: 100,
    });
    doc.restore();

    doc.x = PDF_MARGIN;
    doc.y = verY + verH + 10;
    drawFooter(doc);
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
