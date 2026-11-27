import 'dotenv/config';
import { pathToFileURL } from 'node:url';
import { connectDB, disconnectDB } from '../config/db.js';
import Announcement from '../models/Announcement.js';
import Attempt from '../models/Attempt.js';
import AuditLog from '../models/AuditLog.js';
import Enrollment from '../models/Enrollment.js';
import Exam from '../models/Exam.js';
import Incident from '../models/Incident.js';
import Question from '../models/Question.js';
import User from '../models/User.js';
import { autoGradeAttempt } from '../services/autoGrader.js';
import { gradeManualQuestion } from '../services/gradingService.js';
import { buildOptionSubdocs } from '../services/questionService.js';
import { getOrCreateVerification } from '../services/reportService.js';
import { buildFrozenPaper } from '../utils/paperBuilder.js';
import { now } from '../utils/time.js';

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

const SEED_ACCOUNTS = [
  { name: 'System Admin', email: 'admin@sems.edu', role: 'admin' },
  { name: 'Examiner One', email: 'examiner1@sems.edu', role: 'examiner' },
  { name: 'Examiner Two', email: 'examiner2@sems.edu', role: 'examiner' },
  { name: 'Candidate One', email: 'candidate1@sems.edu', role: 'candidate', rollNo: 'SEMS-2026-001' },
  { name: 'Candidate Two', email: 'candidate2@sems.edu', role: 'candidate', rollNo: 'SEMS-2026-002' },
  { name: 'Candidate Three', email: 'candidate3@sems.edu', role: 'candidate', rollNo: 'SEMS-2026-003' },
  { name: 'Candidate Four', email: 'candidate4@sems.edu', role: 'candidate', rollNo: 'SEMS-2026-004' },
  { name: 'Candidate Five', email: 'candidate5@sems.edu', role: 'candidate', rollNo: 'SEMS-2026-005' },
  { name: 'Candidate Six', email: 'candidate6@sems.edu', role: 'candidate', rollNo: 'SEMS-2026-006' },
  { name: 'Candidate Seven', email: 'candidate7@sems.edu', role: 'candidate', rollNo: 'SEMS-2026-007' },
  { name: 'Candidate Eight', email: 'candidate8@sems.edu', role: 'candidate', rollNo: 'SEMS-2026-008' },
  { name: 'Candidate Nine', email: 'candidate9@sems.edu', role: 'candidate', rollNo: 'SEMS-2026-009' },
  { name: 'Candidate Ten', email: 'candidate10@sems.edu', role: 'candidate', rollNo: 'SEMS-2026-010' },
];

const TOPIC_CONCEPTS = {
  Algorithms: {
    easy: [
      {
        text: 'What is the worst-case time complexity of binary search on a sorted array of n elements?',
        type: 'single',
        marks: 2,
        options: ['O(log n)', 'O(n)', 'O(n log n)', 'O(1)'],
        correctIndexes: [0],
        explanation: 'Each comparison halves the remaining search interval.',
      },
      {
        text: 'Which operations run in O(1) amortized time on a standard dynamic array?',
        type: 'multiple',
        marks: 3,
        scheme: { mode: 'partial', negativeMarks: 0 },
        options: ['Random index read', 'Append at the tail', 'Insert at index 0', 'Arbitrary value search'],
        correctIndexes: [0, 1],
        explanation: 'Index lookup and amortized tail append do not shift existing elements.',
      },
      {
        text: 'Which data structure follows Last-In First-Out (LIFO) ordering?',
        type: 'single',
        marks: 2,
        options: ['Stack', 'Queue', 'Min-Heap', 'Trie'],
        correctIndexes: [0],
      },
    ],
    medium: [
      {
        text: 'Which algorithm computes single-source shortest paths when edge weights are non-negative?',
        type: 'single',
        marks: 3,
        options: ["Dijkstra's algorithm", 'Kruskal algorithm', "Prim's algorithm", 'Topological sort'],
        correctIndexes: [0],
      },
      {
        text: 'Select the divide-and-conquer sorting algorithms with guaranteed O(n log n) worst-case runtime.',
        type: 'multiple',
        marks: 4,
        scheme: { mode: 'all_or_nothing', negativeMarks: 0.5 },
        options: ['Merge Sort', 'Heap Sort', 'Quick Sort (unrandomized)', 'Insertion Sort'],
        correctIndexes: [0, 1],
        explanation: 'Merge Sort and Heap Sort guarantee O(n log n) in the worst case; standard Quick Sort can degrade to O(n^2).',
      },
      {
        text: 'Explain why memoization converts exponential recursive Fibonacci into O(n) time.',
        type: 'written',
        marks: 5,
        rubric: 'Must mention overlapping subproblems, caching results per state 0..n, and O(n) distinct subproblem evaluations.',
        explanation: 'Caching prevents recomputing identical F(k) calls, leaving n+1 unique states.',
      },
    ],
    hard: [
      {
        text: 'Why can Bellman-Ford detect negative-weight cycles while standard Dijkstra cannot safely handle negative edges?',
        type: 'single',
        marks: 4,
        options: [
          'Dijkstra greedily finalizes vertices once popped, whereas Bellman-Ford relaxes all edges |V|-1 times',
          'Dijkstra requires adjacency matrices only',
          'Bellman-Ford uses dynamic Fibonacci heaps exclusively',
          'Dijkstra skips directed edges',
        ],
        correctIndexes: [0],
      },
      {
        text: 'Which properties hold for strongly connected components (SCCs) in a directed graph?',
        type: 'multiple',
        marks: 4,
        scheme: { mode: 'partial', negativeMarks: 0 },
        options: [
          'Condensing each SCC yields a DAG',
          'Kosaraju runs two DFS passes in O(V + E)',
          'Every SCC contains an even number of vertices',
          'Mutual reachability forms an equivalence relation',
        ],
        correctIndexes: [0, 1, 3],
      },
      {
        text: 'Which recurrence describes standard 7-multiplication Strassen matrix multiplication?',
        type: 'single',
        marks: 4,
        options: ['T(n) = 7T(n/2) + O(n^2)', 'T(n) = 8T(n/2) + O(n^2)', 'T(n) = 4T(n/2) + O(n)', 'T(n) = 2T(n/2) + O(n^2)'],
        correctIndexes: [0],
      },
    ],
  },
  Databases: {
    easy: [
      {
        text: 'Which SQL constraint uniquely identifies each row in a relational table and disallows NULL?',
        type: 'single',
        marks: 2,
        options: ['PRIMARY KEY', 'FOREIGN KEY', 'CHECK', 'DEFAULT'],
        correctIndexes: [0],
      },
      {
        text: 'Which properties belong to the ACID transaction guarantee?',
        type: 'multiple',
        marks: 3,
        scheme: { mode: 'partial', negativeMarks: 0 },
        options: ['Atomicity', 'Consistency', 'Sharding', 'Durability'],
        correctIndexes: [0, 1, 3],
      },
      {
        text: 'Which index structure is most commonly used by relational engines for range queries?',
        type: 'single',
        marks: 2,
        options: ['B+ Tree', 'Hash bucket only', 'Bloom filter', 'Heap file'],
        correctIndexes: [0],
      },
    ],
    medium: [
      {
        text: 'What anomaly does a higher isolation level such as Repeatable Read prevent compared to Read Committed?',
        type: 'single',
        marks: 3,
        options: ['Non-repeatable reads', 'Disk block fragmentation', 'Schema syntax errors', 'Client DNS timeouts'],
        correctIndexes: [0],
      },
      {
        text: 'Which statements about compound indexes (a, b) in B-Tree engines like MongoDB are accurate?',
        type: 'multiple',
        marks: 4,
        scheme: { mode: 'all_or_nothing', negativeMarks: 0.5 },
        options: [
          'Queries filtering on prefix (a) can utilize the index',
          'Queries filtering on (a, b) can utilize the index',
          'Queries filtering only on (b) generally cannot use the prefix efficiently',
          'Compound indexes encrypt string fields automatically',
        ],
        correctIndexes: [0, 1, 2],
      },
      {
        text: 'Compare embedding vs referencing documents in MongoDB when modeling exam attempts with frozen papers.',
        type: 'written',
        marks: 5,
        rubric: 'Should explain snapshot immutability if source questions mutate later, bounded document size, and read-locality.',
        explanation: 'Embedding the frozen paper snapshot prevents later bank edits from altering historical attempts.',
      },
    ],
    hard: [
      {
        text: 'Why do MVCC databases avoid blocking readers during concurrent row updates?',
        type: 'single',
        marks: 4,
        options: [
          'Readers observe a consistent snapshot version via transaction timestamps/xmin-xmax',
          'Writers skip write-ahead logging during reads',
          'All tables are locked in exclusive mode globally',
          'MVCC disables indexes during transactions',
        ],
        correctIndexes: [0],
      },
      {
        text: 'Which conditions define Third Normal Form (3NF) and BCNF trade-offs?',
        type: 'multiple',
        marks: 4,
        scheme: { mode: 'partial', negativeMarks: 0 },
        options: [
          'Every non-prime attribute is non-transitively dependent on superkeys in 3NF',
          'BCNF eliminates all non-trivial functional dependencies whose determinant is not a superkey',
          'BCNF always preserves every functional dependency',
          '3NF decomposition can always preserve dependencies',
        ],
        correctIndexes: [0, 1, 3],
      },
      {
        text: 'In write-ahead logging (WAL), why must log records be flushed before dirty data pages reach disk?',
        type: 'single',
        marks: 4,
        options: [
          'To guarantee redo/undo recovery of committed and uncommitted writes after crashes',
          'To avoid maintaining buffer pool frames in RAM',
          'To compress SQL query plans',
          'To bypass disk sync syscalls',
        ],
        correctIndexes: [0],
      },
    ],
  },
  Networks: {
    easy: [
      {
        text: 'Which transport-layer protocol provides reliable, ordered byte-stream delivery?',
        type: 'single',
        marks: 2,
        options: ['TCP', 'UDP', 'ICMP', 'ARP'],
        correctIndexes: [0],
      },
      {
        text: 'Which HTTP status codes indicate client errors rather than server errors?',
        type: 'multiple',
        marks: 3,
        scheme: { mode: 'partial', negativeMarks: 0 },
        options: ['400 Bad Request', '403 Forbidden', '429 Too Many Requests', '502 Bad Gateway'],
        correctIndexes: [0, 1, 2],
      },
      {
        text: 'What is the default well-known port for HTTPS traffic?',
        type: 'single',
        marks: 2,
        options: ['443', '80', '22', '53'],
        correctIndexes: [0],
      },
    ],
    medium: [
      {
        text: 'Why does TCP use a three-way handshake (SYN, SYN-ACK, ACK) before transferring data?',
        type: 'single',
        marks: 3,
        options: [
          'To synchronize initial sequence numbers and verify bidirectional reachability',
          'To negotiate DNS TTL values',
          'To disable congestion control',
          'To replace TLS certificates',
        ],
        correctIndexes: [0],
      },
      {
        text: 'Which mechanisms help prevent congestion collapse in TCP?',
        type: 'multiple',
        marks: 4,
        scheme: { mode: 'all_or_nothing', negativeMarks: 0.5 },
        options: ['Slow Start', 'Congestion Avoidance (AIMD)', 'Fast Retransmit / Fast Recovery', 'Disabling ACKs completely'],
        correctIndexes: [0, 1, 2],
      },
      {
        text: 'Which DNS record maps a domain name to an IPv4 address?',
        type: 'single',
        marks: 3,
        options: ['A record', 'AAAA record', 'MX record', 'TXT record'],
        correctIndexes: [0],
      },
    ],
    hard: [
      {
        text: 'How does TLS 1.3 reduce handshake latency compared to TLS 1.2?',
        type: 'single',
        marks: 4,
        options: [
          'By sending key share extensions in the initial ClientHello for a 1-RTT handshake',
          'By removing ephemeral Diffie-Hellman',
          'By transmitting session keys in plaintext',
          'By disabling server authentication',
        ],
        correctIndexes: [0],
      },
      {
        text: 'Select accurate statements regarding HTTP/2 multiplexing over TCP.',
        type: 'multiple',
        marks: 4,
        scheme: { mode: 'partial', negativeMarks: 0 },
        options: [
          'Multiple streams interleave frames on one TCP connection',
          'Eliminates HTTP-level head-of-line blocking per connection',
          'Eliminates TCP packet-loss head-of-line blocking',
          'Compresses headers with HPACK',
        ],
        correctIndexes: [0, 1, 3],
      },
      {
        text: 'Explain head-of-line blocking at the transport layer and why QUIC mitigates it for independent streams.',
        type: 'written',
        marks: 5,
        rubric: 'Must mention ordered single byte-stream in TCP stalls all multiplexed streams on one lost packet vs independent UDP-based QUIC streams.',
        explanation: 'QUIC separates stream ordering per stream over UDP so packet loss only stalls affected streams.',
      },
    ],
  },
  Security: {
    easy: [
      {
        text: 'How should user passwords be stored before saving accounts to MongoDB?',
        type: 'single',
        marks: 2,
        options: [
          'Hashed with an adaptive salted algorithm such as bcrypt or Argon2',
          'Encrypted with reversible Base64 encoding',
          'Stored in lowercase plaintext',
          'Hashed with unsalted MD5',
        ],
        correctIndexes: [0],
      },
      {
        text: 'Which safeguards help defend an Express REST API against brute-force and injection abuse?',
        type: 'multiple',
        marks: 3,
        scheme: { mode: 'partial', negativeMarks: 0 },
        options: [
          'Route-specific rate limiting on auth endpoints',
          'Strict schema validation rejecting unknown keys',
          'Stripping $-prefixed MongoDB operators',
          'Returning raw stack traces in production',
        ],
        correctIndexes: [0, 1, 2],
      },
      {
        text: 'Which HTTP header middleware adds CSP, X-Frame-Options, and related defensive headers in Express?',
        type: 'single',
        marks: 2,
        options: ['helmet', 'morgan', 'multer', 'nodemon'],
        correctIndexes: [0],
      },
    ],
    medium: [
      {
        text: 'How does storing a per-user tokenVersion prevent stale JWT misuse after deactivation or password reset?',
        type: 'single',
        marks: 3,
        options: [
          'Auth middleware compares JWT tokenVersion against the live DB record and rejects mismatches with 401',
          'Clients manually delete tokens in cookies',
          'The JWT secret changes on every request',
          'Rate limiters ignore expired tokens',
        ],
        correctIndexes: [0],
      },
      {
        text: 'Which controls mitigate Insecure Direct Object Reference (IDOR) in exam endpoints?',
        type: 'multiple',
        marks: 4,
        scheme: { mode: 'all_or_nothing', negativeMarks: 0.5 },
        options: [
          'Deriving actor identity strictly from verified req.user rather than request body',
          'Verifying resource ownership (exam.createdBy or attempt.userId) on every service call',
          'Returning 403 FORBIDDEN on cross-owner mutations',
          'Hiding ObjectIds in client URLs without server checks',
        ],
        correctIndexes: [0, 1, 2],
      },
      {
        text: 'Why should verification endpoints use crypto.timingSafeEqual when comparing HMAC signatures?',
        type: 'single',
        marks: 3,
        options: [
          'To avoid timing side-channel leaks during byte-by-byte comparison',
          'To compress hex strings by half',
          'To automatically sign PDFs',
          'To bypass secret rotation',
        ],
        correctIndexes: [0],
      },
    ],
    hard: [
      {
        text: 'Why is a partial unique index { examId: 1, userId: 1 } with partialFilterExpression { isSandbox: false } critical for SEMS?',
        type: 'single',
        marks: 4,
        options: [
          'It guarantees one real candidate attempt per exam at the DB layer while letting examiners test multiple sandboxes',
          'It automatically deletes finished attempts after 24 hours',
          'It indexes answer arrays alphabetically',
          'It hashes exam titles',
        ],
        correctIndexes: [0],
      },
      {
        text: 'Which vulnerabilities arise if MongoDB queries receive unsanitized req.query objects in Express?',
        type: 'multiple',
        marks: 4,
        scheme: { mode: 'partial', negativeMarks: 0 },
        options: [
          'NoSQL operator injection via { "$gt": "" } or { "$ne": null }',
          'Bypassing password/email equality checks',
          'Unexpected dot-notation nested path probing',
          'Automatic TLS downgrade',
        ],
        correctIndexes: [0, 1, 2],
      },
      {
        text: 'Describe why SEMS excludes correctOptionIds via schema select: false AND strips answer keys in candidate DTOs.',
        type: 'written',
        marks: 5,
        rubric: 'Must discuss defense-in-depth: preventing accidental DB projection leaks plus strict DTO output whitelisting during active attempts.',
        explanation: 'Defense-in-depth ensures answer keys neither leave MongoDB by default nor pass through candidate serializers.',
      },
    ],
  },
};

const buildSeedQuestionDefinitions = () => {
  const list = [];
  for (const [topic, byDiff] of Object.entries(TOPIC_CONCEPTS)) {
    for (const [difficulty, entries] of Object.entries(byDiff)) {
      for (const entry of entries) {
        list.push({
          ...entry,
          topic,
          difficulty,
          scheme: entry.scheme ?? { mode: 'all_or_nothing', negativeMarks: 0 },
          rubric: entry.rubric ?? '',
          explanation: entry.explanation ?? '',
        });
      }
    }
  }
  return list;
};

/**
 * Idempotently seeds 1 admin, 2 examiners, and 10 candidates (find-or-create by email, never destructive).
 */
export const seedUsers = async (
  defaultPassword = process.env.SEED_DEFAULT_PASSWORD || 'Pass1234!'
) => {
  let created = 0;
  let existing = 0;
  const usersByEmail = new Map();

  for (const account of SEED_ACCOUNTS) {
    let user = await User.findOne({ email: account.email });
    if (user) {
      existing += 1;
    } else {
      user = await User.create({
        name: account.name,
        email: account.email,
        passwordHash: defaultPassword,
        role: account.role,
        ...(account.rollNo ? { rollNo: account.rollNo } : {}),
      });
      created += 1;
    }
    usersByEmail.set(account.email, user);
  }

  return { created, existing, total: SEED_ACCOUNTS.length, usersByEmail };
};

const ensureQuestion = async (examinerId, def) => {
  const existing = await Question.findOne({ createdBy: examinerId, text: def.text }).select(
    '+correctOptionIds'
  );
  if (existing) {
    return { doc: existing, created: false };
  }

  const { optionDocs, correctOptionIds } = buildOptionSubdocs(
    (def.options ?? []).map((text) => ({ text })),
    def.correctIndexes ?? []
  );

  const created = await Question.create({
    createdBy: examinerId,
    type: def.type,
    text: def.text,
    options: optionDocs,
    correctOptionIds,
    topic: def.topic,
    difficulty: def.difficulty,
    marks: def.marks,
    scheme: def.scheme,
    rubric: def.rubric,
    explanation: def.explanation,
  });

  return { doc: created, created: true };
};

const ensureExam = async (examinerId, spec, selectedDocs) => {
  const existing = await Exam.findOne({ createdBy: examinerId, title: spec.title });
  if (existing) {
    return { doc: existing, created: false };
  }

  const questionRefs = selectedDocs.map((qDoc, idx) => ({
    questionId: qDoc._id,
    marks: qDoc.marks,
    order: idx,
  }));
  const totalMarks =
    Math.round(questionRefs.reduce((sum, q) => sum + q.marks, 0) * 100) / 100;

  const created = await Exam.create({
    createdBy: examinerId,
    title: spec.title,
    instructions: spec.instructions,
    startAt: spec.startAt,
    endAt: spec.endAt,
    durationMinutes: spec.durationMinutes,
    status: spec.status,
    publishedAt: spec.publishedAt ?? null,
    resultsPublished: Boolean(spec.resultsPublished),
    resultsPublishedAt: spec.resultsPublishedAt ?? null,
    settings: spec.settings,
    blueprint: spec.blueprint,
    questions: questionRefs,
    totalMarks,
  });

  return { doc: created, created: true };
};

const ensureEnrollments = async (examId, enrolledById, candidates) => {
  let created = 0;
  let existing = 0;

  for (const candidate of candidates) {
    const found = await Enrollment.findOne({ examId, userId: candidate._id });
    if (found) {
      existing += 1;
      continue;
    }
    await Enrollment.create({
      examId,
      userId: candidate._id,
      enrolledBy: enrolledById,
      status: 'active',
    });
    created += 1;
  }

  return { created, existing };
};

const buildDemoAnswers = (paper, mode, answeredAt) => {
  return paper.map((item, idx) => {
    if (item.type === 'written') {
      const responseText =
        mode === 'high'
          ? 'Caching F(k) results avoids redundant recursive trees, reducing states from exponential to O(n).'
          : mode === 'mid'
            ? 'Memoization stores computed subproblems so each state runs once.'
            : 'Stores answers to speed up recursion.';
      return {
        questionId: item.questionId,
        selectedOptionIds: [],
        text: responseText,
        markedForReview: false,
        seq: idx + 1,
        savedAt: answeredAt,
      };
    }

    const correctSet = new Set((item.correctOptionIds || []).map(String));
    const wrongOpts = (item.optionOrder || []).filter((o) => !correctSet.has(String(o.optionId)));

    let selectedOptionIds = [];
    if (mode === 'high') {
      selectedOptionIds = [...(item.correctOptionIds || [])];
    } else if (mode === 'mid') {
      selectedOptionIds =
        idx % 2 === 0
          ? [...(item.correctOptionIds || [])]
          : wrongOpts.slice(0, 1).map((o) => o.optionId);
    } else {
      selectedOptionIds =
        item.type === 'multiple'
          ? (item.correctOptionIds || []).slice(0, 1)
          : wrongOpts.slice(0, 1).map((o) => o.optionId);
    }

    return {
      questionId: item.questionId,
      selectedOptionIds,
      text: '',
      markedForReview: idx === 1 && mode === 'mid',
      seq: idx + 1,
      savedAt: answeredAt,
    };
  });
};

/**
 * Idempotently seeds full demo data: users, ~36 questions, 4 lifecycle exams,
 * enrollments, graded attempts with verification codes, and proctoring/audit artifacts.
 */
export const seedDemoData = async (
  defaultPassword = process.env.SEED_DEFAULT_PASSWORD || 'Pass1234!'
) => {
  const userSummary = await seedUsers(defaultPassword);
  const examiner1 = userSummary.usersByEmail.get('examiner1@sems.edu');
  const candidates = SEED_ACCOUNTS.filter((a) => a.role === 'candidate').map((a) =>
    userSummary.usersByEmail.get(a.email)
  );

  const defs = buildSeedQuestionDefinitions();
  const questionDocs = [];
  let questionsCreated = 0;
  let questionsExisting = 0;

  for (const def of defs) {
    const res = await ensureQuestion(examiner1._id, def);
    questionDocs.push(res.doc);
    if (res.created) questionsCreated += 1;
    else questionsExisting += 1;
  }

  const baseNow = now();
  const singleQs = questionDocs.filter((q) => q.type === 'single');
  const multiQs = questionDocs.filter((q) => q.type === 'multiple');
  const writtenQs = questionDocs.filter((q) => q.type === 'written');

  const completedQuestions = [
    singleQs[0],
    singleQs[4],
    multiQs[0],
    multiQs[3],
    writtenQs[0],
    singleQs[8],
  ].filter(Boolean);

  const easyPool = questionDocs.filter((q) => q.difficulty === 'easy').slice(0, 4);
  const mediumPool = questionDocs.filter((q) => q.difficulty === 'medium' && q.type !== 'written').slice(0, 4);
  const hardPool = questionDocs.filter((q) => q.difficulty === 'hard' && q.type !== 'written').slice(0, 4);
  const ongoingPool = [...easyPool, ...mediumPool, ...hardPool];

  const upcomingQuestions = questionDocs.slice(0, 8);
  const draftQuestions = questionDocs.slice(8, 14);

  const examSpecs = [
    {
      spec: {
        title: 'CS-401 Midterm: Systems & Security (Completed Demo)',
        instructions: 'Closed-book midterm assessment covering Algorithms, Databases, Networks, and Security.',
        startAt: new Date(baseNow.getTime() - 7 * DAY_MS),
        endAt: new Date(baseNow.getTime() - 5 * DAY_MS),
        durationMinutes: 60,
        status: 'completed',
        publishedAt: new Date(baseNow.getTime() - 8 * DAY_MS),
        resultsPublished: true,
        resultsPublishedAt: new Date(baseNow.getTime() - 4 * DAY_MS),
        settings: {
          shuffleQuestions: false,
          shuffleOptions: true,
          showScoreImmediately: false,
          allowLateStart: true,
          strictEnd: true,
          negativeMarkingEnabled: true,
        },
        blueprint: { easy: 0, medium: 0, hard: 0, poolMode: false },
      },
      questions: completedQuestions,
      candidates: candidates.slice(0, 5),
    },
    {
      spec: {
        title: 'CS-402 Live Adaptive Quiz (Ongoing Demo)',
        instructions: 'Stratified difficulty quiz drawing 2 easy, 2 medium, and 1 hard question per candidate.',
        startAt: new Date(baseNow.getTime() - 2 * HOUR_MS),
        endAt: new Date(baseNow.getTime() + 7 * DAY_MS),
        durationMinutes: 45,
        status: 'published',
        publishedAt: new Date(baseNow.getTime() - 3 * HOUR_MS),
        resultsPublished: false,
        settings: {
          shuffleQuestions: true,
          shuffleOptions: true,
          showScoreImmediately: false,
          allowLateStart: true,
          strictEnd: true,
          negativeMarkingEnabled: false,
        },
        blueprint: { easy: 2, medium: 2, hard: 1, poolMode: true },
      },
      questions: ongoingPool,
      candidates,
    },
    {
      spec: {
        title: 'CS-403 Final Assessment (Upcoming Demo)',
        instructions: 'Comprehensive final assessment window opens in 3 days.',
        startAt: new Date(baseNow.getTime() + 3 * DAY_MS),
        endAt: new Date(baseNow.getTime() + 10 * DAY_MS),
        durationMinutes: 90,
        status: 'published',
        publishedAt: new Date(baseNow.getTime() - DAY_MS),
        resultsPublished: false,
        settings: {
          shuffleQuestions: true,
          shuffleOptions: false,
          showScoreImmediately: false,
          allowLateStart: false,
          strictEnd: true,
          negativeMarkingEnabled: false,
        },
        blueprint: { easy: 0, medium: 0, hard: 0, poolMode: false },
      },
      questions: upcomingQuestions,
      candidates: candidates.slice(0, 6),
    },
    {
      spec: {
        title: 'CS-404 Distributed Architecture (Draft Demo)',
        instructions: 'Draft exam prepared for Examiner Sandbox preview and readiness checks.',
        startAt: new Date(baseNow.getTime() + 14 * DAY_MS),
        endAt: new Date(baseNow.getTime() + 21 * DAY_MS),
        durationMinutes: 60,
        status: 'draft',
        resultsPublished: false,
        settings: {
          shuffleQuestions: false,
          shuffleOptions: false,
          showScoreImmediately: false,
          allowLateStart: true,
          strictEnd: true,
          negativeMarkingEnabled: false,
        },
        blueprint: { easy: 0, medium: 0, hard: 0, poolMode: false },
      },
      questions: draftQuestions,
      candidates: candidates.slice(0, 2),
    },
  ];

  const createdExams = [];
  let examsCreated = 0;
  let examsExisting = 0;
  let enrollmentsCreated = 0;
  let enrollmentsExisting = 0;

  for (const item of examSpecs) {
    const res = await ensureExam(examiner1._id, item.spec, item.questions);
    createdExams.push(res.doc);
    if (res.created) examsCreated += 1;
    else examsExisting += 1;

    const enrollSummary = await ensureEnrollments(res.doc._id, examiner1._id, item.candidates);
    enrollmentsCreated += enrollSummary.created;
    enrollmentsExisting += enrollSummary.existing;
  }

  const completedExam = createdExams[0];
  let attemptsCreated = 0;
  let attemptsExisting = 0;
  let primaryVerificationCode = null;

  const attemptProfiles = [
    { user: candidates[0], mode: 'high', manualScore: 5, feedback: 'Clear O(n) memoization explanation.' },
    { user: candidates[1], mode: 'mid', manualScore: 3.5, feedback: 'Correct idea; include explicit state count.' },
    { user: candidates[2], mode: 'high', manualScore: 4.5, feedback: 'Strong analysis across all steps.' },
    { user: candidates[3], mode: 'low', manualScore: 2, feedback: 'Review overlapping subproblems definition.' },
  ];

  for (let i = 0; i < attemptProfiles.length; i++) {
    const profile = attemptProfiles[i];
    let attempt = await Attempt.findOne({
      examId: completedExam._id,
      userId: profile.user._id,
      isSandbox: false,
    });

    if (attempt) {
      attemptsExisting += 1;
    } else {
      const { paper, paperFingerprint, paperDifficultyIndex, maxScore } = buildFrozenPaper(
        completedExam,
        completedQuestions
      );
      const startedAt = new Date(completedExam.startAt.getTime() + (i + 1) * HOUR_MS);
      const submittedAt = new Date(startedAt.getTime() + 38 * 60 * 1000);
      const deadlineAt = new Date(startedAt.getTime() + completedExam.durationMinutes * 60 * 1000);

      attempt = await Attempt.create({
        examId: completedExam._id,
        userId: profile.user._id,
        isSandbox: false,
        status: 'submitted',
        startedAt,
        deadlineAt,
        submittedAt,
        finalizedBy: 'candidate',
        paper,
        paperFingerprint,
        paperDifficultyIndex,
        answers: buildDemoAnswers(paper, profile.mode, submittedAt),
        scratchpad: 'Working notes saved cleanly during assessment.',
        lastHeartbeatAt: submittedAt,
      });

      await autoGradeAttempt(attempt._id);
      const writtenItem = paper.find((item) => item.type === 'written');
      if (writtenItem) {
        const graded = await gradeManualQuestion({
          user: examiner1,
          attemptId: attempt._id,
          questionId: writtenItem.questionId,
          score: profile.manualScore,
          feedback: profile.feedback,
        });
        attempt = await Attempt.findById(graded.attempt.id);
      } else {
        attempt = await Attempt.findById(attempt._id);
        attempt.maxScore = maxScore;
        await attempt.save();
      }
      attemptsCreated += 1;
    }

    const verification = await getOrCreateVerification(attempt);
    if (i === 0) {
      primaryVerificationCode = verification.code;
    }
  }

  const announcementMessage =
    'Official CS-401 Midterm results are now published. Download your verifiable PDF report for your records.';
  const existingAnnouncement = await Announcement.findOne({
    examId: completedExam._id,
    message: announcementMessage,
  });
  if (!existingAnnouncement) {
    await Announcement.create({
      examId: completedExam._id,
      createdBy: examiner1._id,
      message: announcementMessage,
    });
  }

  const candidateTwoAttempt = await Attempt.findOne({
    examId: completedExam._id,
    userId: candidates[1]._id,
    isSandbox: false,
  });
  if (candidateTwoAttempt) {
    const existingIncident = await Incident.findOne({
      attemptId: candidateTwoAttempt._id,
      type: 'tab_hidden',
    });
    if (!existingIncident) {
      await Incident.create({
        attemptId: candidateTwoAttempt._id,
        examId: completedExam._id,
        userId: candidates[1]._id,
        type: 'tab_hidden',
        details: 'Brief browser focus shift (1.8s) logged during section 2.',
        occurredAt: new Date(candidateTwoAttempt.startedAt.getTime() + 14 * 60 * 1000),
        reviewStatus: 'dismissed',
        reviewerNote: 'Single brief notification click; no material anomaly.',
      });
    }
  }

  const existingAudit = await AuditLog.findOne({
    action: 'results.published',
    entityType: 'Exam',
    entityId: completedExam._id,
  });
  if (!existingAudit) {
    await AuditLog.create({
      actorId: examiner1._id,
      action: 'results.published',
      entityType: 'Exam',
      entityId: completedExam._id,
      meta: { gradedAttempts: attemptProfiles.length },
      at: completedExam.resultsPublishedAt ?? baseNow,
    });
  }

  return {
    users: {
      created: userSummary.created,
      existing: userSummary.existing,
      total: userSummary.total,
    },
    questions: {
      created: questionsCreated,
      existing: questionsExisting,
      total: questionDocs.length,
    },
    exams: {
      created: examsCreated,
      existing: examsExisting,
      total: createdExams.length,
    },
    enrollments: {
      created: enrollmentsCreated,
      existing: enrollmentsExisting,
    },
    attempts: {
      created: attemptsCreated,
      existing: attemptsExisting,
    },
    verificationCode: primaryVerificationCode,
  };
};

const runCli = async () => {
  try {
    await connectDB();
    const summary = await seedDemoData();
    console.log(
      `[Seed] Users: ${summary.users.created} created, ${summary.users.existing} existing (${summary.users.total} total)`
    );
    console.log(
      `[Seed] Questions: ${summary.questions.created} created, ${summary.questions.existing} existing (${summary.questions.total} total)`
    );
    console.log(
      `[Seed] Exams: ${summary.exams.created} created, ${summary.exams.existing} existing (${summary.exams.total} total)`
    );
    console.log(
      `[Seed] Enrollments: ${summary.enrollments.created} created, ${summary.enrollments.existing} existing`
    );
    console.log(
      `[Seed] Completed Attempts: ${summary.attempts.created} created, ${summary.attempts.existing} existing`
    );
    if (summary.verificationCode) {
      console.log(
        `[Seed] Demo Verification Code (/api/verify/${summary.verificationCode}): ${summary.verificationCode}`
      );
    }
  } catch (error) {
    console.error(`[Seed Error] ${error.message}`);
    process.exitCode = 1;
  } finally {
    await disconnectDB();
  }
};

const isDirectRun =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  runCli();
}
