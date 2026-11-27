import { INITIAL_MOCK_DB } from './mockData';

const STORAGE_KEY = 'sems_mock_db_v2';

function loadDb() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore corrupted storage
  }
  const clone = structuredClone(INITIAL_MOCK_DB);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(clone));
  return clone;
}

function saveDb(db) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

function getCurrentUser(db) {
  const uid = localStorage.getItem('sems_mock_uid');
  return db.users.find((u) => u.id === uid) || null;
}

function delay(ms = 120) {
  return new Promise((r) => setTimeout(r, ms));
}

function deriveExamState(exam) {
  if (exam.status === 'draft') return 'draft';
  const now = Date.now();
  const start = Date.parse(exam.startAt);
  const end = Date.parse(exam.endAt);
  if (now < start) return 'published';
  if (now >= start && now <= end) return 'ongoing';
  return 'completed';
}

function stripAnswersForCandidate(question) {
  return {
    id: question.id,
    type: question.type,
    topic: question.topic,
    difficulty: question.difficulty,
    text: question.text,
    marks: question.marks,
    negativeMarks: question.negativeMarks || 0,
    multiSelectRule: question.multiSelectRule,
    options: (question.options || []).map(({ id, text }) => ({ id, text })),
  };
}

function maskName(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => (part.length <= 1 ? part : `${part[0]}${'*'.repeat(Math.min(4, part.length - 1))}`))
    .join(' ');
}

export const mockApi = {
  async login(email, _password) {
    await delay();
    const db = loadDb();
    const user = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase() && u.isActive);
    if (!user) {
      throw { code: 'UNAUTHORIZED', message: 'Invalid credentials or inactive account.', statusCode: 401 };
    }
    localStorage.setItem('sems_mock_uid', user.id);
    return {
      success: true,
      token: `mock-jwt-${user.id}`,
      data: { user },
    };
  },

  async getMe() {
    await delay(60);
    const db = loadDb();
    const user = getCurrentUser(db);
    if (!user) throw { code: 'UNAUTHORIZED', message: 'Not authenticated', statusCode: 401 };
    return { success: true, data: { user } };
  },

  // Admin
  async getUsers() {
    await delay();
    const db = loadDb();
    return { success: true, data: { users: db.users } };
  },
  async createUser(payload) {
    await delay();
    const db = loadDb();
    if (db.users.some((u) => u.email.toLowerCase() === payload.email.toLowerCase())) {
      throw { code: 'VALIDATION_ERROR', message: 'Email already exists.', fields: { email: 'Already taken' }, statusCode: 400 };
    }
    const newUser = {
      id: `u-${Date.now()}`,
      name: payload.name,
      email: payload.email,
      role: payload.role || 'candidate',
      isActive: true,
    };
    db.users.push(newUser);
    saveDb(db);
    return { success: true, data: { user: newUser } };
  },
  async updateUser(id, payload) {
    await delay();
    const db = loadDb();
    const idx = db.users.findIndex((u) => u.id === id);
    if (idx === -1) throw { code: 'NOT_FOUND', message: 'User not found', statusCode: 404 };
    db.users[idx] = { ...db.users[idx], ...payload };
    saveDb(db);
    return { success: true, data: { user: db.users[idx] } };
  },
  async deleteUser(id) {
    await delay();
    const db = loadDb();
    const idx = db.users.findIndex((u) => u.id === id);
    if (idx !== -1) {
      db.users[idx].isActive = false;
      saveDb(db);
    }
    return { success: true };
  },

  // Questions
  async getQuestions() {
    await delay();
    const db = loadDb();
    return { success: true, data: { questions: db.questions } };
  },
  async createQuestion(payload) {
    await delay();
    const db = loadDb();
    const q = { id: `q-${Date.now()}`, ownerId: 'u-exam-1', version: 1, ...payload };
    db.questions.unshift(q);
    saveDb(db);
    return { success: true, data: { question: q } };
  },
  async updateQuestion(id, payload) {
    await delay();
    const db = loadDb();
    const idx = db.questions.findIndex((q) => q.id === id);
    if (idx === -1) throw { code: 'NOT_FOUND', message: 'Question not found', statusCode: 404 };
    db.questions[idx] = { ...db.questions[idx], ...payload, version: (db.questions[idx].version || 1) + 1 };
    saveDb(db);
    return { success: true, data: { question: db.questions[idx] } };
  },
  async deleteQuestion(id) {
    await delay();
    const db = loadDb();
    db.questions = db.questions.filter((q) => q.id !== id);
    saveDb(db);
    return { success: true };
  },
  async importQuestions(rows) {
    await delay(200);
    const db = loadDb();
    const errors = [];
    let importedCount = 0;
    rows.forEach((row, index) => {
      if (!row.text || !row.type || !row.marks) {
        errors.push({ row: index + 1, message: 'Missing required fields: text, type, or marks' });
      } else {
        db.questions.unshift({
          id: `q-imp-${Date.now()}-${index}`,
          ownerId: 'u-exam-1',
          type: row.type,
          topic: row.topic || 'General',
          difficulty: Number(row.difficulty) || 2,
          text: row.text,
          options: row.options || [],
          marks: Number(row.marks) || 2,
          negativeMarks: Number(row.negativeMarks) || 0,
          multiSelectRule: row.multiSelectRule || 'all_or_nothing',
          rubric: row.rubric || '',
          version: 1,
        });
        importedCount += 1;
      }
    });
    saveDb(db);
    return { success: true, data: { importedCount, errors } };
  },

  // Exams
  async getExams() {
    await delay();
    const db = loadDb();
    const exams = db.exams.map((ex) => ({ ...ex, derivedStatus: deriveExamState(ex) }));
    return { success: true, data: { exams } };
  },
  async getExamById(id) {
    await delay();
    const db = loadDb();
    const ex = db.exams.find((e) => e.id === id);
    if (!ex) throw { code: 'NOT_FOUND', message: 'Exam not found', statusCode: 404 };
    return { success: true, data: { exam: { ...ex, derivedStatus: deriveExamState(ex) } } };
  },
  async createExam(payload) {
    await delay();
    const db = loadDb();
    const ex = {
      id: `ex-${Date.now()}`,
      ownerId: 'u-exam-1',
      status: 'draft',
      resultsPublished: false,
      enrolledCandidateIds: [],
      ...payload,
    };
    db.exams.unshift(ex);
    saveDb(db);
    return { success: true, data: { exam: { ...ex, derivedStatus: deriveExamState(ex) } } };
  },
  async updateExam(id, payload) {
    await delay();
    const db = loadDb();
    const idx = db.exams.findIndex((e) => e.id === id);
    if (idx === -1) throw { code: 'NOT_FOUND', message: 'Exam not found', statusCode: 404 };
    db.exams[idx] = { ...db.exams[idx], ...payload };
    saveDb(db);
    return { success: true, data: { exam: { ...db.exams[idx], derivedStatus: deriveExamState(db.exams[idx]) } } };
  },
  async publishExam(id) {
    return this.updateExam(id, { status: 'published' });
  },
  async enrollCandidates(id, candidateIds) {
    return this.updateExam(id, { enrolledCandidateIds: candidateIds });
  },
  async importCandidates(id, rows) {
    await delay(150);
    const db = loadDb();
    const ex = db.exams.find((e) => e.id === id);
    if (!ex) throw { code: 'NOT_FOUND', message: 'Exam not found', statusCode: 404 };
    const errors = [];
    const matchedIds = new Set(ex.enrolledCandidateIds || []);
    rows.forEach((r, i) => {
      const user = db.users.find((u) => u.email.toLowerCase() === (r.email || '').toLowerCase() && u.role === 'candidate');
      if (!user) {
        errors.push({ row: i + 1, email: r.email || '(empty)', message: 'Candidate email not found' });
      } else {
        matchedIds.add(user.id);
      }
    });
    ex.enrolledCandidateIds = Array.from(matchedIds);
    saveDb(db);
    return { success: true, data: { enrolledCount: matchedIds.size, errors } };
  },

  // Candidate Exams
  async getCandidateExams() {
    await delay();
    const db = loadDb();
    const user = getCurrentUser(db);
    const exams = db.exams
      .filter((ex) => ex.status !== 'draft' && (ex.enrolledCandidateIds || []).includes(user?.id))
      .map((ex) => {
        const derivedStatus = deriveExamState(ex);
        const attempt = db.attempts.find((a) => a.examId === ex.id && a.candidateId === user?.id && !a.isSandbox);
        return {
          id: ex.id,
          title: ex.title,
          instructions: ex.instructions,
          startAt: ex.startAt,
          endAt: ex.endAt,
          durationMin: ex.durationMin,
          totalMarks: ex.totalMarks,
          derivedStatus,
          attemptStatus: attempt?.status || 'not_started',
          attemptId: attempt?.id || null,
          resultsPublished: ex.resultsPublished,
        };
      });
    return { success: true, data: { exams } };
  },

  // Attempt Engine
  async startAttempt(examId, isSandbox = false) {
    await delay();
    const db = loadDb();
    const user = getCurrentUser(db);
    const exam = db.exams.find((e) => e.id === examId);
    if (!exam) throw { code: 'NOT_FOUND', message: 'Exam not found', statusCode: 404 };

    if (!isSandbox) {
      const state = deriveExamState(exam);
      if (state !== 'ongoing') {
        throw { code: 'EXAM_NOT_AVAILABLE', message: 'This examination is not currently open.', statusCode: 403 };
      }
      const existing = db.attempts.find((a) => a.examId === examId && a.candidateId === user?.id && !a.isSandbox);
      if (existing) {
        return { success: true, data: { attempt: existing, serverTime: new Date().toISOString() } };
      }
    }

    const questions = (exam.questionRefs || [])
      .map((ref) => {
        const q = db.questions.find((item) => item.id === ref.questionId);
        return q ? { ...stripAnswersForCandidate(q), marks: ref.marks ?? q.marks } : null;
      })
      .filter(Boolean);

    const avgDiff = questions.length
      ? Number((questions.reduce((sum, q) => sum + (q.difficulty || 2), 0) / questions.length).toFixed(2))
      : 2.0;

    const startedAt = new Date().toISOString();
    const deadlineAt = new Date(Date.now() + exam.durationMin * 60 * 1000).toISOString();

    const attempt = {
      id: `att-${Date.now()}`,
      examId,
      examTitle: exam.title,
      candidateId: user?.id || 'u-exam-1',
      isSandbox,
      status: 'in_progress',
      startedAt,
      deadlineAt,
      snapshot: {
        paperDifficultyIndex: avgDiff,
        questions,
      },
      answers: {},
      markedForReview: [],
      events: [],
      connectivityLedger: [],
      scores: { perQuestion: {}, total: 0 },
      gradingState: 'pending',
      preferences: { fontSize: 'md', palettePosition: 'right', theme: 'paper' },
      scratchpad: '',
    };

    db.attempts.push(attempt);
    saveDb(db);
    return { success: true, data: { attempt, serverTime: new Date().toISOString() } };
  },

  async getAttempt(attemptId) {
    await delay(80);
    const db = loadDb();
    const attempt = db.attempts.find((a) => a.id === attemptId);
    if (!attempt) throw { code: 'NOT_FOUND', message: 'Attempt not found', statusCode: 404 };
    const exam = db.exams.find((e) => e.id === attempt.examId);
    const remainingMs = Math.max(0, Date.parse(attempt.deadlineAt) - Date.now());
    return {
      success: true,
      data: {
        attempt: { ...attempt, examTitle: attempt.examTitle || exam?.title || 'Examination' },
        serverTime: new Date().toISOString(),
        remainingMs,
      },
    };
  },

  async saveAnswers(attemptId, batch, markedForReview) {
    await delay(100);
    const db = loadDb();
    const idx = db.attempts.findIndex((a) => a.id === attemptId);
    if (idx === -1) throw { code: 'NOT_FOUND', message: 'Attempt not found', statusCode: 404 };
    const attempt = db.attempts[idx];
    if (attempt.status === 'submitted' || attempt.status === 'graded') {
      throw { code: 'ALREADY_SUBMITTED', message: 'Attempt already submitted.', statusCode: 409 };
    }

    const nowMs = Date.now();
    const deadlineMs = Date.parse(attempt.deadlineAt);
    const lateSyncWindowMs = 3 * 60 * 1000; // 3-minute bounded late-sync window (5.3)
    const acceptedSeqs = [];
    const lateSyncedSeqs = [];

    (batch || []).forEach(({ qid, value, seq }) => {
      const isLate = nowMs > deadlineMs && nowMs <= deadlineMs + lateSyncWindowMs;
      if (nowMs <= deadlineMs + lateSyncWindowMs) {
        attempt.answers[qid] = {
          value,
          seq,
          savedAt: new Date().toISOString(),
          lateSynced: isLate,
        };
        acceptedSeqs.push(seq);
        if (isLate) lateSyncedSeqs.push(seq);
      }
    });

    if (Array.isArray(markedForReview)) {
      attempt.markedForReview = markedForReview;
    }

    saveDb(db);
    return {
      success: true,
      data: {
        attemptId,
        serverTime: new Date().toISOString(),
        deadlineAt: attempt.deadlineAt,
        acceptedSeqs,
        lateSyncedSeqs,
      },
    };
  },

  async sendHeartbeat(attemptId) {
    await delay(40);
    const db = loadDb();
    const attempt = db.attempts.find((a) => a.id === attemptId);
    if (!attempt) throw { code: 'NOT_FOUND', message: 'Attempt not found', statusCode: 404 };
    return {
      success: true,
      data: {
        serverTime: new Date().toISOString(),
        deadlineAt: attempt.deadlineAt,
        status: attempt.status,
      },
    };
  },

  async logEvent(attemptId, event) {
    const db = loadDb();
    const attempt = db.attempts.find((a) => a.id === attemptId);
    if (attempt) {
      attempt.events = attempt.events || [];
      attempt.events.push({ ...event, at: new Date().toISOString() });
      saveDb(db);
    }
    return { success: true };
  },

  async savePreferences(attemptId, preferences) {
    const db = loadDb();
    const attempt = db.attempts.find((a) => a.id === attemptId);
    if (attempt) {
      attempt.preferences = { ...attempt.preferences, ...preferences };
      saveDb(db);
    }
    return { success: true, data: { preferences: attempt?.preferences } };
  },

  async saveScratchpad(attemptId, scratchpad) {
    const db = loadDb();
    const attempt = db.attempts.find((a) => a.id === attemptId);
    if (attempt) {
      attempt.scratchpad = scratchpad;
      saveDb(db);
    }
    return { success: true };
  },

  async submitAttempt(attemptId) {
    await delay(150);
    const db = loadDb();
    const attempt = db.attempts.find((a) => a.id === attemptId);
    if (!attempt) throw { code: 'NOT_FOUND', message: 'Attempt not found', statusCode: 404 };
    if (attempt.status === 'submitted' || attempt.status === 'graded') {
      return { success: true, data: { attempt } };
    }

    // Deterministic auto-grading for objective questions
    const perQuestion = {};
    let total = 0;
    let hasWritten = false;

    (attempt.snapshot?.questions || []).forEach((sq) => {
      const bankQ = db.questions.find((q) => q.id === sq.id);
      const ans = attempt.answers?.[sq.id]?.value;
      if (sq.type === 'written') {
        hasWritten = true;
        perQuestion[sq.id] = 0;
      } else if (bankQ && sq.type === 'mcq_single') {
        const correctOpt = bankQ.options.find((o) => o.isCorrect);
        if (!ans) perQuestion[sq.id] = 0;
        else if (ans === correctOpt?.id) perQuestion[sq.id] = sq.marks;
        else perQuestion[sq.id] = -(sq.negativeMarks || 0);
        total += perQuestion[sq.id];
      } else if (bankQ && sq.type === 'mcq_multi') {
        const selected = Array.isArray(ans) ? ans : [];
        const correctIds = bankQ.options.filter((o) => o.isCorrect).map((o) => o.id);
        const correctSel = selected.filter((id) => correctIds.includes(id)).length;
        const wrongSel = selected.filter((id) => !correctIds.includes(id)).length;
        let score = 0;
        if (sq.multiSelectRule === 'partial' && correctIds.length > 0) {
          score = Number((sq.marks * Math.max(0, (correctSel - wrongSel) / correctIds.length)).toFixed(2));
        } else if (correctSel === correctIds.length && wrongSel === 0) {
          score = sq.marks;
        }
        perQuestion[sq.id] = score;
        total += score;
      }
    });

    attempt.status = 'submitted';
    attempt.submittedAt = new Date().toISOString();
    attempt.scores = { perQuestion, total: Number(total.toFixed(2)) };
    attempt.gradingState = hasWritten ? 'pending_manual' : 'graded';
    attempt.verificationId = `VER-2026-SEMS-${Math.floor(1000 + Math.random() * 9000)}`;
    saveDb(db);
    return { success: true, data: { attempt } };
  },

  // Monitor & Announcements
  async getMonitor(examId) {
    await delay(100);
    const db = loadDb();
    const attempts = db.attempts
      .filter((a) => a.examId === examId && !a.isSandbox)
      .map((a) => {
        const cand = db.users.find((u) => u.id === a.candidateId);
        const totalQ = a.snapshot?.questions?.length || 0;
        const answeredQ = Object.keys(a.answers || {}).length;
        const lateSyncedCount = Object.values(a.answers || {}).filter((x) => x.lateSynced).length;
        return {
          attemptId: a.id,
          candidateName: cand?.name || 'Candidate',
          status: a.status,
          answeredCount: answeredQ,
          totalQuestions: totalQ,
          lateSyncedCount,
          events: a.events || [],
          connectivityLedger: a.connectivityLedger || [],
          deadlineAt: a.deadlineAt,
        };
      });
    const announcements = db.announcements.filter((an) => an.examId === examId);
    return { success: true, data: { attempts, announcements } };
  },

  async postAnnouncement(examId, message) {
    await delay(100);
    const db = loadDb();
    const item = { id: `ann-${Date.now()}`, examId, message, createdAt: new Date().toISOString() };
    db.announcements.unshift(item);
    saveDb(db);
    return { success: true, data: { announcement: item } };
  },

  async getAnnouncements(examId, since) {
    const db = loadDb();
    const list = db.announcements.filter(
      (a) => a.examId === examId && (!since || Date.parse(a.createdAt) > Date.parse(since))
    );
    return { success: true, data: { announcements: list } };
  },

  // Grading & Publish
  async getGradingQueue(examId) {
    await delay();
    const db = loadDb();
    const exam = db.exams.find((e) => e.id === examId);
    const attempts = db.attempts
      .filter((a) => a.examId === examId && !a.isSandbox && (a.status === 'submitted' || a.status === 'graded'))
      .map((a) => {
        const cand = db.users.find((u) => u.id === a.candidateId);
        return { ...a, candidateName: cand?.name || 'Candidate' };
      });
    return { success: true, data: { exam, attempts } };
  },

  async gradeAttempt(attemptId, writtenScores) {
    await delay(120);
    const db = loadDb();
    const attempt = db.attempts.find((a) => a.id === attemptId);
    if (!attempt) throw { code: 'NOT_FOUND', message: 'Attempt not found', statusCode: 404 };
    Object.entries(writtenScores).forEach(([qid, score]) => {
      attempt.scores.perQuestion[qid] = Number(score);
    });
    attempt.scores.total = Number(
      Object.values(attempt.scores.perQuestion).reduce((sum, v) => sum + Number(v || 0), 0).toFixed(2)
    );
    attempt.status = 'graded';
    attempt.gradingState = 'graded';
    saveDb(db);
    return { success: true, data: { attempt } };
  },

  async publishResults(examId) {
    await delay(120);
    const db = loadDb();
    const exam = db.exams.find((e) => e.id === examId);
    if (exam) {
      exam.resultsPublished = true;
      saveDb(db);
    }
    return { success: true, data: { exam } };
  },

  // Results & Verify
  async getCandidateResults() {
    await delay();
    const db = loadDb();
    const user = getCurrentUser(db);
    const results = db.attempts
      .filter((a) => a.candidateId === user?.id && !a.isSandbox)
      .map((a) => {
        const exam = db.exams.find((e) => e.id === a.examId);
        if (!exam?.resultsPublished) return null;
        return {
          attemptId: a.id,
          examId: a.examId,
          examTitle: exam.title,
          totalMarks: exam.totalMarks,
          score: a.scores?.total ?? 0,
          submittedAt: a.submittedAt,
          verificationId: a.verificationId,
        };
      })
      .filter(Boolean);
    return { success: true, data: { results } };
  },

  async getCandidateResultDetail(attemptId) {
    await delay();
    const db = loadDb();
    const attempt = db.attempts.find((a) => a.id === attemptId);
    if (!attempt) throw { code: 'NOT_FOUND', message: 'Result not found', statusCode: 404 };
    const exam = db.exams.find((e) => e.id === attempt.examId);
    if (!exam?.resultsPublished) {
      throw { code: 'FORBIDDEN', message: 'Results have not been published yet.', statusCode: 403 };
    }
    return { success: true, data: { attempt, exam } };
  },

  async verifyReport(verificationId) {
    await delay(120);
    const db = loadDb();
    const attempt = db.attempts.find((a) => a.verificationId === verificationId && !a.isSandbox);
    if (!attempt) {
      return { success: true, data: { valid: false } };
    }
    const exam = db.exams.find((e) => e.id === attempt.examId);
    const cand = db.users.find((u) => u.id === attempt.candidateId);
    return {
      success: true,
      data: {
        valid: true,
        examTitle: exam?.title || 'Examination',
        issuedAt: attempt.submittedAt || attempt.startedAt,
        maskedCandidateName: maskName(cand?.name || 'Candidate'),
      },
    };
  },

  // Analytics & Fairness
  async getAnalytics(examId) {
    await delay();
    const db = loadDb();
    const exam = db.exams.find((e) => e.id === examId);
    const realAttempts = db.attempts.filter((a) => a.examId === examId && !a.isSandbox && a.status === 'graded');
    const scores = realAttempts.map((a) => a.scores?.total ?? 0);
    const mean = scores.length ? Number((scores.reduce((s, v) => s + v, 0) / scores.length).toFixed(2)) : 0;
    const sorted = [...scores].sort((a, b) => a - b);
    const median = sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0;
    const passRate = scores.length && exam?.totalMarks
      ? Math.round((scores.filter((s) => s >= exam.totalMarks * 0.5).length / scores.length) * 100)
      : 0;

    return {
      success: true,
      data: {
        exam,
        summary: {
          attemptCount: realAttempts.length,
          mean,
          median,
          passRate,
          distribution: [
            { bucket: '0-25%', count: scores.filter((s) => s <= (exam?.totalMarks || 10) * 0.25).length },
            { bucket: '26-50%', count: scores.filter((s) => s > (exam?.totalMarks || 10) * 0.25 && s <= (exam?.totalMarks || 10) * 0.5).length },
            { bucket: '51-75%', count: scores.filter((s) => s > (exam?.totalMarks || 10) * 0.5 && s <= (exam?.totalMarks || 10) * 0.75).length },
            { bucket: '76-100%', count: scores.filter((s) => s > (exam?.totalMarks || 10) * 0.75).length },
          ],
        },
      },
    };
  },

  async getQuestionAnalytics(examId) {
    await delay();
    const db = loadDb();
    const exam = db.exams.find((e) => e.id === examId);
    const realAttempts = db.attempts.filter((a) => a.examId === examId && !a.isSandbox);
    const questions = (exam?.questionRefs || []).map((ref) => {
      const q = db.questions.find((item) => item.id === ref.questionId);
      const total = realAttempts.length || 1;
      const skipped = realAttempts.filter((a) => !a.answers?.[ref.questionId]?.value).length;
      const incorrect = realAttempts.filter((a) => (a.scores?.perQuestion?.[ref.questionId] ?? 0) <= 0).length;
      return {
        questionId: ref.questionId,
        text: q?.text || 'Question',
        topic: q?.topic || 'General',
        assignedDifficulty: q?.difficulty || 2,
        skipRate: Math.round((skipped / total) * 100),
        incorrectRate: Math.round((incorrect / total) * 100),
      };
    });
    return { success: true, data: { questions } };
  },

  async getFairness(examId) {
    await delay();
    const db = loadDb();
    const realAttempts = db.attempts.filter((a) => a.examId === examId && !a.isSandbox);
    const indices = realAttempts.map((a) => a.snapshot?.paperDifficultyIndex || 2.0);
    const min = indices.length ? Math.min(...indices) : 2.0;
    const max = indices.length ? Math.max(...indices) : 2.0;
    const mean = indices.length ? indices.reduce((s, v) => s + v, 0) / indices.length : 2.0;
    const stdev = indices.length
      ? Number(Math.sqrt(indices.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / indices.length).toFixed(3))
      : 0;

    return {
      success: true,
      data: {
        paperCount: realAttempts.length,
        minDifficulty: min,
        maxDifficulty: max,
        stdev,
        papers: realAttempts.map((a, i) => ({
          label: `Paper #${i + 1}`,
          difficultyIndex: a.snapshot?.paperDifficultyIndex || 2.0,
        })),
      },
    };
  },

  async suggestGradeAI({ answerText, maxMarks }) {
    await delay(350);
    const wordCount = (answerText || '').trim().split(/\s+/).filter(Boolean).length;
    const suggested = Math.min(maxMarks, Math.max(1, Math.round((wordCount / 28) * maxMarks * 2) / 2));
    return {
      success: true,
      data: {
        suggestedMarks: suggested,
        rationale: 'Mock AI analysis: addresses server-authoritative deadline and offline queue sync.',
        mock: true,
      },
    };
  },

  // 5.4 Disputes
  async createDispute(attemptId, payload) {
    await delay(120);
    const db = loadDb();
    const user = getCurrentUser(db);
    const attempt = db.attempts.find((a) => a.id === attemptId);
    if (!attempt) throw { code: 'NOT_FOUND', message: 'Attempt not found', statusCode: 404 };
    const dispute = {
      id: `disp-${Date.now()}`,
      examId: attempt.examId,
      attemptId,
      candidateId: user?.id,
      candidateName: user?.name || 'Candidate',
      questionId: payload.questionId,
      category: payload.category,
      explanation: payload.explanation,
      status: 'submitted',
      reason: '',
      createdAt: new Date().toISOString(),
      gradeVersions: [
        {
          version: 1,
          marks: attempt.scores?.perQuestion?.[payload.questionId] ?? 0,
          at: attempt.submittedAt || new Date().toISOString(),
          reason: 'Original grade',
        },
      ],
    };
    db.disputes = db.disputes || [];
    db.disputes.unshift(dispute);
    saveDb(db);
    return { success: true, data: { dispute } };
  },

  async getExamDisputes(examId) {
    await delay(100);
    const db = loadDb();
    const disputes = (db.disputes || [])
      .filter((d) => d.examId === examId)
      .map((d) => {
        const attempt = db.attempts.find((a) => a.id === d.attemptId);
        const question = (attempt?.snapshot?.questions || []).find((q) => q.id === d.questionId);
        const bankQ = db.questions.find((q) => q.id === d.questionId);
        return {
          ...d,
          questionText: question?.text || bankQ?.text || 'Question',
          maxMarks: question?.marks || bankQ?.marks || 5,
          rubric: bankQ?.rubric || '',
          candidateAnswer: attempt?.answers?.[d.questionId]?.value || '(No response)',
          connectivityLedger: attempt?.connectivityLedger || [],
        };
      });
    return { success: true, data: { disputes } };
  },

  async resolveDispute(disputeId, { status, reason, newMarks }) {
    await delay(120);
    const db = loadDb();
    const dispute = (db.disputes || []).find((d) => d.id === disputeId);
    if (!dispute) throw { code: 'NOT_FOUND', message: 'Dispute not found', statusCode: 404 };
    dispute.status = status;
    dispute.reason = reason;
    if (status === 'resolved' && newMarks !== undefined && newMarks !== '') {
      const nextVersion = (dispute.gradeVersions?.length || 1) + 1;
      dispute.gradeVersions = [
        ...(dispute.gradeVersions || []),
        { version: nextVersion, marks: Number(newMarks), at: new Date().toISOString(), reason },
      ];
      const attempt = db.attempts.find((a) => a.id === dispute.attemptId);
      if (attempt) {
        attempt.scores.perQuestion[dispute.questionId] = Number(newMarks);
        attempt.scores.total = Number(
          Object.values(attempt.scores.perQuestion).reduce((s, v) => s + Number(v || 0), 0).toFixed(2)
        );
      }
    }
    saveDb(db);
    return { success: true, data: { dispute } };
  },
};
