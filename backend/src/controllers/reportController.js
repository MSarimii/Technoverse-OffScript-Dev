import { getExamFairnessReport } from '../services/fairnessService.js';
import {
  exportExamResultsCsv,
  generateAttemptReportPdf,
  generateExamReportPdf,
  verifyReportCode,
} from '../services/reportService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';

export const getExamReportPdfController = asyncHandler(async (req, res) => {
  const { buffer, filename } = await generateExamReportPdf({
    user: req.user,
    examId: req.params.id,
  });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
  return res.status(200).send(buffer);
});

export const getAttemptReportPdfController = asyncHandler(async (req, res) => {
  const { buffer, filename } = await generateAttemptReportPdf({
    user: req.user,
    attemptId: req.params.id,
  });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
  return res.status(200).send(buffer);
});

export const verifyCodeController = asyncHandler(async (req, res) => {
  const data = await verifyReportCode({ code: req.params.code });
  return sendSuccess(res, data, 200);
});

export const getExamFairnessController = asyncHandler(async (req, res) => {
  const data = await getExamFairnessReport({ user: req.user, examId: req.params.id });
  return sendSuccess(res, data, 200);
});

export const getExamResultsCsvController = asyncHandler(async (req, res) => {
  const { csv, filename } = await exportExamResultsCsv({ user: req.user, examId: req.params.id });
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  return res.status(200).send(csv);
});
