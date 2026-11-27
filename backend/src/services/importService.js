import crypto from 'node:crypto';
import { parse } from 'csv-parse/sync';
import Enrollment from '../models/Enrollment.js';
import Exam from '../models/Exam.js';
import Question from '../models/Question.js';
import User from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { resolveExamStatus } from '../utils/examStatus.js';
import { createQuestionSchema } from '../validators/questionValidator.js';
import { assertExamAccess } from './examService.js';
import { buildOptionSubdocs } from './questionService.js';

const MAX_IMPORT_ROWS = 500;

const parseImportRows = (format, content) => {
  let rows;
  if (format === 'csv') {
    if (typeof content !== 'string' || content.trim() === '') {
      throw new ApiError(400, 'IMPORT_INVALID', 'CSV import requires non-empty string content');
    }
    try {
      rows = parse(content, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });
    } catch (err) {
      throw new ApiError(400, 'IMPORT_INVALID', `Invalid CSV syntax: ${err.message}`);
    }
  } else {
    if (typeof content === 'string') {
      try {
        rows = JSON.parse(content);
      } catch (err) {
        throw new ApiError(400, 'IMPORT_INVALID', `Invalid JSON syntax: ${err.message}`);
      }
    } else {
      rows = content;
    }
    if (!Array.isArray(rows)) {
      throw new ApiError(400, 'IMPORT_INVALID', 'JSON import content must be an array of objects');
    }
  }

  if (rows.length === 0) {
    throw new ApiError(400, 'IMPORT_INVALID', 'Import payload contains zero rows');
  }
  if (rows.length > MAX_IMPORT_ROWS) {
    throw new ApiError(400, 'IMPORT_INVALID', `Import cannot exceed ${MAX_IMPORT_ROWS} rows`);
  }
  return rows;
};

const normalizeQuestionRow = (rawRow) => {
  if (!rawRow || typeof rawRow !== 'object') {
    return { error: { field: 'row', message: 'Row must be an object' } };
  }

  const type = rawRow.type;
  const payload = {
    type,
    text: rawRow.text,
    topic: rawRow.topic,
    difficulty: rawRow.difficulty,
    marks: Number(rawRow.marks),
  };

  if (rawRow.rubric !== undefined && String(rawRow.rubric).trim() !== '') {
    payload.rubric = String(rawRow.rubric);
  }
  if (rawRow.explanation !== undefined && String(rawRow.explanation).trim() !== '') {
    payload.explanation = String(rawRow.explanation);
  }

  if (rawRow.scheme && typeof rawRow.scheme === 'object') {
    payload.scheme = rawRow.scheme;
  } else if (
    (rawRow.schemeMode && String(rawRow.schemeMode).trim() !== '') ||
    (rawRow.negativeMarks !== undefined && String(rawRow.negativeMarks).trim() !== '')
  ) {
    payload.scheme = {
      ...(rawRow.schemeMode ? { mode: rawRow.schemeMode } : {}),
      ...(rawRow.negativeMarks !== undefined && String(rawRow.negativeMarks).trim() !== ''
        ? { negativeMarks: Number(rawRow.negativeMarks) }
        : {}),
    };
  }

  if (rawRow.options !== undefined && rawRow.options !== null && String(rawRow.options).trim() !== '') {
    if (Array.isArray(rawRow.options)) {
      payload.options = rawRow.options.map((opt) =>
        typeof opt === 'string' ? { text: opt } : opt
      );
    } else if (typeof rawRow.options === 'string') {
      const trimmed = rawRow.options.trim();
      if (trimmed.startsWith('[')) {
        try {
          const parsedOpts = JSON.parse(trimmed);
          if (!Array.isArray(parsedOpts)) {
            return { error: { field: 'options', message: 'options JSON must be an array' } };
          }
          payload.options = parsedOpts.map((opt) =>
            typeof opt === 'string' ? { text: opt } : opt
          );
        } catch {
          return { error: { field: 'options', message: 'Malformed options JSON array' } };
        }
      } else {
        payload.options = trimmed
          .split('|')
          .map((item) => item.trim())
          .filter(Boolean)
          .map((text) => ({ text }));
      }
    }
  }

  const rawIndexes =
    rawRow.correctOptionIndexes !== undefined ? rawRow.correctOptionIndexes : rawRow.correctIndexes;
  if (rawIndexes !== undefined && rawIndexes !== null && String(rawIndexes).trim() !== '') {
    if (Array.isArray(rawIndexes)) {
      payload.correctOptionIndexes = rawIndexes.map(Number);
    } else if (typeof rawIndexes === 'string') {
      const parts = rawIndexes
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s !== '');
      const nums = parts.map((p) => Number(p));
      if (nums.some((n) => Number.isNaN(n))) {
        return {
          error: { field: 'correctIndexes', message: 'correctIndexes must contain numeric indices' },
        };
      }
      payload.correctOptionIndexes = nums;
    } else if (typeof rawIndexes === 'number') {
      payload.correctOptionIndexes = [rawIndexes];
    }
  }

  return { payload };
};

/**
 * Validates and optionally bulk-inserts questions from CSV or JSON content.
 */
export const importQuestions = async ({ user, payload, query }) => {
  const dryRun = Boolean(payload.dryRun ?? (query?.dryRun === 'true'));
  const rows = parseImportRows(payload.format, payload.content);

  const errors = [];
  const validPayloads = [];
  let failed = 0;

  rows.forEach((rawRow, idx) => {
    const rowNumber = idx + 1;
    const normalized = normalizeQuestionRow(rawRow);
    if (normalized.error) {
      failed += 1;
      errors.push({ row: rowNumber, ...normalized.error });
      return;
    }

    const parsed = createQuestionSchema.body.safeParse(normalized.payload);
    if (!parsed.success) {
      failed += 1;
      for (const issue of parsed.error.issues) {
        errors.push({
          row: rowNumber,
          field: issue.path.join('.') || 'row',
          message: issue.message,
        });
      }
      return;
    }

    validPayloads.push(parsed.data);
  });

  let questionIds = [];
  if (!dryRun && validPayloads.length > 0) {
    const docs = validPayloads.map((q) => {
      const { optionDocs, correctOptionIds } = buildOptionSubdocs(
        q.options ?? [],
        q.correctOptionIndexes ?? []
      );
      return {
        createdBy: user._id,
        type: q.type,
        text: q.text,
        options: optionDocs,
        correctOptionIds,
        topic: q.topic,
        difficulty: q.difficulty,
        marks: q.marks,
        scheme: q.scheme ?? { mode: 'all_or_nothing', negativeMarks: 0 },
        rubric: q.rubric ?? '',
        explanation: q.explanation ?? '',
      };
    });

    const inserted = await Question.insertMany(docs);
    questionIds = inserted.map((doc) => String(doc._id));
  }

  return {
    total: rows.length,
    imported: dryRun ? 0 : questionIds.length,
    failed,
    dryRun,
    errors,
    questionIds,
  };
};

/**
 * Validates and optionally bulk-enrolls (or creates+enrolls) candidates from CSV or JSON content.
 */
export const importEnrollments = async ({ user, examId, payload, query }) => {
  const exam = await Exam.findById(examId);
  assertExamAccess(exam, user);

  const effective = resolveExamStatus(exam);
  if (effective === 'cancelled' || effective === 'completed') {
    throw new ApiError(
      409,
      'CONFLICT',
      `Cannot import enrollments for an exam with status '${effective}'`
    );
  }

  const dryRun = Boolean(payload.dryRun ?? (query?.dryRun === 'true'));
  const createMissingCandidates = Boolean(
    payload.createMissingCandidates ?? (query?.createMissingCandidates === 'true')
  );
  const rows = parseImportRows(payload.format, payload.content);

  const emailsToLookup = [];
  for (const row of rows) {
    if (row && typeof row.email === 'string' && row.email.trim() !== '') {
      emailsToLookup.push(row.email.trim().toLowerCase());
    }
  }

  const existingUsers = emailsToLookup.length
    ? await User.find({ email: { $in: [...new Set(emailsToLookup)] } })
    : [];
  const userByEmail = new Map(existingUsers.map((u) => [u.email.toLowerCase(), u]));

  const existingEnrollments = existingUsers.length
    ? await Enrollment.find({
        examId: exam._id,
        userId: { $in: existingUsers.map((u) => u._id) },
      })
    : [];
  const enrollmentByUser = new Map(existingEnrollments.map((e) => [String(e.userId), e]));

  const errors = [];
  const seenEmails = new Set();
  let imported = 0;
  let alreadyEnrolled = 0;
  let createdUsers = 0;
  let failed = 0;

  for (let i = 0; i < rows.length; i++) {
    const rowNumber = i + 1;
    const row = rows[i];
    const email = typeof row?.email === 'string' ? row.email.trim().toLowerCase() : '';

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      failed += 1;
      errors.push({ row: rowNumber, field: 'email', message: 'Valid email is required' });
      continue;
    }

    if (seenEmails.has(email)) {
      alreadyEnrolled += 1;
      continue;
    }
    seenEmails.add(email);

    let candidate = userByEmail.get(email);
    if (candidate) {
      if (candidate.role !== 'candidate') {
        failed += 1;
        errors.push({
          row: rowNumber,
          field: 'email',
          message: `Account ${email} has role '${candidate.role}' and cannot be enrolled as candidate`,
        });
        continue;
      }
      if (!candidate.isActive) {
        failed += 1;
        errors.push({ row: rowNumber, field: 'email', message: `Candidate ${email} is inactive` });
        continue;
      }
    } else {
      if (!createMissingCandidates) {
        failed += 1;
        errors.push({ row: rowNumber, field: 'email', message: `Candidate ${email} not found` });
        continue;
      }

      const name = typeof row.name === 'string' ? row.name.trim() : '';
      if (name.length < 2 || name.length > 80) {
        failed += 1;
        errors.push({
          row: rowNumber,
          field: 'name',
          message: 'Name (2-80 chars) is required when creating missing candidates',
        });
        continue;
      }

      const rawPassword =
        typeof row.password === 'string' && row.password.length >= 6
          ? row.password
          : crypto.randomBytes(12).toString('base64url');
      const rollNo = typeof row.rollNo === 'string' ? row.rollNo.trim() : undefined;

      createdUsers += 1;
      if (!dryRun) {
        candidate = await User.create({
          name,
          email,
          passwordHash: rawPassword,
          role: 'candidate',
          ...(rollNo ? { rollNo } : {}),
        });
        userByEmail.set(email, candidate);
      }
    }

    if (!candidate) {
      imported += 1;
      continue;
    }

    const existing = enrollmentByUser.get(String(candidate._id));
    if (existing) {
      if (existing.status === 'active') {
        alreadyEnrolled += 1;
      } else {
        if (!dryRun) {
          existing.status = 'active';
          existing.enrolledBy = user._id;
          await existing.save();
        }
        imported += 1;
      }
    } else {
      if (!dryRun) {
        const created = await Enrollment.create({
          examId: exam._id,
          userId: candidate._id,
          enrolledBy: user._id,
          status: 'active',
        });
        enrollmentByUser.set(String(candidate._id), created);
      }
      imported += 1;
    }
  }

  return {
    total: rows.length,
    imported: dryRun ? 0 : imported,
    alreadyEnrolled,
    createdUsers: dryRun ? 0 : createdUsers,
    failed,
    dryRun,
    errors,
  };
};
