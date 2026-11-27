# PHASE EXECUTION REPORT

## 1. Phase Information
- **Phase Number**: Phase 5 (05)
- **Phase Name**: Attempt Engine & Server Timer
- **Date**: 2026-11-27
- **Final Status**: COMPLETED (`34/34` Vitest + Supertest tests passing across 5 suites against isolated local `mongod` via `MONGODB_TEST_URI`; `backend/.env` remains absent on disk)

---

## 2. Objective
Implement the complete modular **Candidate Attempt Engine** and **Server-Authoritative Timer**: candidate exam listing (`available` / `upcoming` / `completed` with `accessStatus`), idempotent exam start/resume with frozen shuffled `paper` snapshot (never leaking `correctOptionIds`), server-enforced `deadlineAt` timer (`strictEnd` capping), `seq`-checked idempotent autosave, scratchpad, heartbeat + connection gaps, neutral incident ingestion, atomic double-submit protection, lazy expiry + background sweeper (`attemptSweeper.js`), live `/api/admin/overview` attempt count, Vitest + Supertest verification in `tests/attempts.test.js`, updated `BACKEND.md`, and rebuilt `graphify-out/`.

---

## 3. Implementation Summary
1. **Preliminary Inspection**:
   - Checked `git status --short`, queried `graphify-out/` (`Exam.js, Enrollment.js, examStatus.js, time.js, routes/index.js`, 223 nodes), and reviewed [`Question.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/models/Question.js), [`time.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/utils/time.js), [`server.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/server.js), and [`validateEnv.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/utils/validateEnv.js).
2. **Models (`Attempt` & `Incident`)**:
   - [`backend/src/models/Attempt.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/models/Attempt.js): Full `Attempt` schema (`examId`, `userId`, `isSandbox`, `status`, `startedAt`, `deadlineAt`, `submittedAt`, `finalizedBy`, frozen `paper` subdocuments with `correctOptionIds: { select: false }`, `paperFingerprint`, `paperDifficultyIndex`, `answers`, `scratchpad`, `lastHeartbeatAt`, `connectionGaps`, `grades`, `totalScore`, `maxScore`, `percentage`, `gradingStatus`), unique partial index `{ examId: 1, userId: 1 }` (`{ isSandbox: false }`), and whitelisted [`serializeAttemptForCandidate`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/models/Attempt.js#L138-L180) computing live `serverNow` and `remainingMs` while stripping `correctOptionIds`.
   - [`backend/src/models/Incident.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/models/Incident.js): `Incident` schema (`attemptId`, `examId`, `userId`, `type`, `details`, `occurredAt`, `reviewStatus`, `reviewerNote`), indexes `{ examId: 1, occurredAt: -1 }` and `{ attemptId: 1 }`, plus `serializeIncident`.
3. **Pure Paper Snapshot Utility & Validators**:
   - [`backend/src/utils/paperBuilder.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/utils/paperBuilder.js): Pure `buildFrozenPaper(exam, questionDocs)` implementing Fisher-Yates shuffling for questions (`shuffleQuestions`) and options (`shuffleOptions`), SHA-256 `paperFingerprint`, `paperDifficultyIndex`, and `maxScore`.
   - [`backend/src/validators/attemptValidator.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/validators/attemptValidator.js): `.strict()` Zod schemas for exam/attempt IDs, autosave batches (`seq >= 0`), scratchpad (`max 10000`), optional-body heartbeats, and incident events.
4. **Services, Sweeper & Cross-Service Hooks**:
   - [`backend/src/services/attemptService.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/services/attemptService.js): Implements `listCandidateExams`, `getCandidateExamDetail`, `startOrResumeAttempt` (including `11000` race handling and lazy expiry), `getAttemptById`, `autosaveAnswers` (`seq > existing.seq`, `STALE_SAVE`, option/question membership check, `409 ATTEMPT_EXPIRED`), `saveScratchpad`, `recordHeartbeat` (`connectionGaps` when elapsed > 60s), `reportIncident`, shared atomic `finalizeAttempt`, and idempotent `submitAttempt`.
   - [`backend/src/services/attemptSweeper.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/services/attemptSweeper.js): Exports `sweepExpiredAttempts(currentTime)` reusing `finalizeAttempt`, plus unref'd `startSweeper()` / `stopSweeper()` wired into [`server.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/server.js) when `NODE_ENV !== 'test'`.
   - Updated [`enrollmentService.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/services/enrollmentService.js) (`removeEnrollment` blocks `409 CONFLICT` once a candidate has started), [`examService.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/services/examService.js) (`completeExam` finalizes active `in_progress` attempts with `finalizedBy: 'examiner'`), and [`adminUserService.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/services/adminUserService.js) (`getAdminOverview` returns live `Attempt.countDocuments({ isSandbox: false })`).
5. **Controllers, Routes, Docs & Graphify**:
   - Added [`attemptController.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/controllers/attemptController.js), [`candidateExamRoutes.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/routes/candidateExamRoutes.js), and [`attemptRoutes.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/routes/attemptRoutes.js); mounted `/candidate/exams` and `/attempts` in [`routes/index.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/routes/index.js).
   - Added [`backend/tests/attempts.test.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/tests/attempts.test.js) (7 specs) and updated [`backend/tests/auth.test.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/tests/auth.test.js) overview expectation.
   - Updated [`BACKEND.md`](file:///Users/abdulrehman/Desktop/Techno%20verse/BACKEND.md) and rebuilt `graphify-out/` across all 55 files under `backend/src` (`282 nodes, 825 edges, 8 communities`).

---

## 4. Files Created
- [`backend/src/models/Attempt.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/models/Attempt.js) — `Attempt` Mongoose schema, partial unique index, and whitelisted `serializeAttemptForCandidate`.
- [`backend/src/models/Incident.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/models/Incident.js) — `Incident` Mongoose schema, indexes, and `serializeIncident`.
- [`backend/src/utils/paperBuilder.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/utils/paperBuilder.js) — Pure `buildFrozenPaper` snapshot generator, Fisher-Yates shuffle, and metrics calculator.
- [`backend/src/validators/attemptValidator.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/validators/attemptValidator.js) — Strict Zod schemas for candidate attempt routes.
- [`backend/src/services/attemptService.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/services/attemptService.js) — Attempt lifecycle, lazy expiry, autosave, scratchpad, heartbeat, incident reporting, and atomic submit logic.
- [`backend/src/services/attemptSweeper.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/services/attemptSweeper.js) — Overdue attempt sweeper and configurable background interval.
- [`backend/src/controllers/attemptController.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/controllers/attemptController.js) — Thin `asyncHandler` candidate attempt controllers.
- [`backend/src/routes/candidateExamRoutes.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/routes/candidateExamRoutes.js) — `/api/candidate/exams` endpoints behind `requireAuth, requireRole('candidate')`.
- [`backend/src/routes/attemptRoutes.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/routes/attemptRoutes.js) — `/api/attempts` endpoints behind `requireAuth, requireRole('candidate')`.
- [`backend/tests/attempts.test.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/tests/attempts.test.js) — 7 Vitest + Supertest specs verifying access gates, paper snapshot immutability, zero answer-key leakage, `strictEnd` timing, idempotent `seq` autosave + lazy expiry, scratchpad/heartbeat/incidents, concurrent double submits, sweeper, cross-candidate `403`, and examiner exam completion.
- [`docs/member-2-backend-db/reports/PHASE_05_REPORT.md`](file:///Users/abdulrehman/Desktop/Techno%20verse/docs/member-2-backend-db/reports/PHASE_05_REPORT.md) — This execution report.

---

## 5. Files Modified
- [`backend/src/routes/index.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/routes/index.js) — Mounted `/candidate/exams` and `/attempts`.
- [`backend/src/server.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/server.js) — Calls `startSweeper()` on non-test startup.
- [`backend/src/services/enrollmentService.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/services/enrollmentService.js) — Blocks `removeEnrollment` with `409 CONFLICT` once candidate has an existing real attempt.
- [`backend/src/services/examService.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/services/examService.js) — Updates `completeExam` to finalize active `in_progress` attempts (`finalizedBy: 'examiner'`).
- [`backend/src/services/adminUserService.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/services/adminUserService.js) — Replaced static `attempts: 0` with `Attempt.countDocuments({ isSandbox: false })`.
- [`backend/tests/auth.test.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/tests/auth.test.js) — Updated `/api/admin/overview` assertion to accept live `attempts: expect.any(Number)`.
- [`BACKEND.md`](file:///Users/abdulrehman/Desktop/Techno%20verse/BACKEND.md) — Documented `Attempt`, `Incident`, `/api/candidate/exams/*`, `/api/attempts/*`, live `/api/admin/overview` attempts count, and updated tree.
- [`graphify-out/GRAPH_REPORT.md`](file:///Users/abdulrehman/Desktop/Techno%20verse/graphify-out/GRAPH_REPORT.md) (gitignored) — Rebuilt graph across 55 files (`282 nodes, 825 edges, 8 communities`).

*(Verified untouched: `frontend/`, `backend/src/services/aiService.js`, `backend/src/routes/aiRoutes.js`.)*

---

## 6. Database Changes
- **`Attempt` Collection (`attempts`)**:
  - Created schema with `examId`, `userId`, `isSandbox`, `status`, `startedAt`, `deadlineAt`, `submittedAt`, `finalizedBy`, frozen `paper` subdocuments (`correctOptionIds` `select: false`), `paperFingerprint`, `paperDifficultyIndex`, `answers`, `scratchpad`, `lastHeartbeatAt`, `connectionGaps`, `grades`, `totalScore`, `maxScore`, `percentage`, `gradingStatus`.
  - Indexes: `{ examId: 1, userId: 1 }` (`unique`, `partialFilterExpression: { isSandbox: false }`), `{ examId: 1, status: 1 }`, `{ status: 1, deadlineAt: 1 }`, `{ userId: 1 }`.
- **`Incident` Collection (`incidents`)**:
  - Created schema with `attemptId`, `examId`, `userId`, `type`, `details`, `occurredAt`, `reviewStatus`, `reviewerNote`.
  - Indexes: `{ examId: 1, occurredAt: -1 }`, `{ attemptId: 1 }`.
- No dev/prod data modified; verified solely against isolated local test DB.

---

## 7. APIs Implemented

| Method | Path | Access | Behavior | Verified? |
|---|---|---|---|---|
| `GET` | `/api/candidate/exams` | Candidate | Lists active enrolled non-draft exams grouped `{ available, upcoming, completed, serverNow }` with `accessStatus` | Yes (Supertest) |
| `GET` | `/api/candidate/exams/:id` | Candidate (enrolled) | Returns exam instructions, window, settings, `accessStatus` (no questions); `403 NOT_ENROLLED` | Yes (Supertest) |
| `POST` | `/api/candidate/exams/:id/start` | Candidate (enrolled) | Starts attempt with frozen paper (`201`, zero `correctOptionIds`), caps `deadlineAt` at `endAt`, resumes active (`200`), blocks early/late (`409`) | Yes (Supertest) |
| `GET` | `/api/attempts/:id` | Candidate (owner) | Lazy-expiry check + returns safe attempt with live `serverNow`/`remainingMs`; `403` for other candidate | Yes (Supertest) |
| `PUT` | `/api/attempts/:id/answers` | Candidate (owner) | Validates question/options, rejects stale `seq` (`STALE_SAVE`), lazy-expires overdue writes (`409 ATTEMPT_EXPIRED`) | Yes (Supertest) |
| `PUT` | `/api/attempts/:id/scratchpad` | Candidate (owner) | Persists scratchpad text on active attempt with lazy-expiry guard | Yes (Supertest) |
| `POST` | `/api/attempts/:id/heartbeat` | Candidate (owner) | Updates `lastHeartbeatAt`, records `connectionGaps` (> 60s), returns `{ remainingMs, serverNow, announcements: [] }` | Yes (Supertest) |
| `POST` | `/api/attempts/:id/events` | Candidate (owner) | Creates neutral `Incident` record (`201 { incident }`) on active attempt | Yes (Supertest) |
| `POST` | `/api/attempts/:id/submit` | Candidate (owner) | Atomically finalizes active attempt (`submitted` / `expired`); concurrent and repeat submits return `alreadySubmitted` | Yes (Supertest) |

---

## 8. Dependencies and Tools Used
- **Packages Installed**: None in Phase 5 (reused Node built-in `node:crypto`, Express, Mongoose, Zod, Vitest, Supertest).
- **Ephemeral Test Runtime**: Local `/opt/homebrew/bin/mongod` started in conversation scratch dir on `127.0.0.1:27117` for `MONGODB_TEST_URI`, stopped and cleaned up via `trap`.
- **Graphify (`0.9.92`)**: Queried before coding; rebuilt across 55 files (`282 nodes, 825 edges, 8 communities`); verified `Attempt.js` (`16` connections) and `attemptService.js` (`32` connections).
- **Skills Engaged**: `graphify`, `test-driven-development`, `verification-before-completion`, `ponytail`.

---

## 9. Testing Results

| Test | Command | Expected | Actual | Status |
|---|---|---|---|---|
| Full Vitest Suite (`attempts` + `auth` + `exams` + `questions` + `foundation`) | `(cd backend && MONGODB_TEST_URI="mongodb://127.0.0.1:27117/sems_test" npm test)` | All 34 tests pass across 5 files, exit 0 | `Test Files 5 passed (5)`, `Tests 34 passed (34)` in `8.91s` | PASS |
| Graphify Explain | `graphify explain "Attempt.js"` & `graphify explain "attemptService.js"` | Maps Phase 5 nodes and cross-service edges | `Attempt.js` (`16` connections), `attemptService.js` (`32` connections) verified | PASS |

### Full `npm test` Output Summary
```text
> technoverse-backend@1.0.0 test
> vitest run

 RUN  v5.1.2 /Users/abdulrehman/Desktop/Techno verse/backend

 ✓ tests/attempts.test.js (7 tests) 1279ms
 ✓ tests/auth.test.js (7 tests) 1848ms
 ✓ tests/exams.test.js (6 tests) 965ms
 ✓ tests/questions.test.js (7 tests) 756ms
 ✓ tests/foundation.test.js (7 tests) 38ms

 Test Files  5 passed (5)
      Tests  34 passed (34)
   Start at  13:06:15
   Duration  8.91s (tests 58%, import 41%, transform 1%)
```

---

## 10. Bugs Discovered and How Each Was Resolved
- Initial `attempts.test.js` run failed 2 assertions due to test-authoring issues (backend behavior was correct):
  1. `attempts.test.js` checked `not.toContain(String(optRight))` against the entire JSON response, which falsely tripped on the legitimate `optionOrder` list sent to the candidate so they can pick answers; updated assertion to verify zero `correctOptionIds` / `isCorrect` fields anywhere in the JSON response.
  2. Test 7 triggered `POST /api/exams/:id/complete` on the shared exam before `sweepExpiredAttempts()`, which legitimately finalized both candidates' attempts before the sweeper ran; split exam instances in Test 7 so both `sweepExpiredAttempts()` (`expired` / `expiry`) and `completeExam()` (`submitted` / `examiner`) verify cleanly.

---

## 11. Verification Checklist

| Acceptance Criterion | Status | Evidence |
|---|---|---|
| `npm test` passes all 5 suites (`foundation`, `auth`, `questions`, `exams`, `attempts`) | PASS | `5 passed (5)`, `34 passed (34)` in `8.91s`, exit 0. |
| Zero `correctOptionIds` leaked in any candidate payload & bank edits isolated | PASS | Verified via JSON serialization and key checks plus post-start Question mutation test in `attempts.test.js` spec 2. |
| Server clock, `strictEnd` capping, lazy expiry, atomic submit, `seq` autosave & sweeper verified | PASS | Verified via `setClock()`/`resetClock()`, concurrent `Promise.all` submit, stale `STALE_SAVE`, lazy `409 ATTEMPT_EXPIRED`, and `sweepExpiredAttempts()` in `attempts.test.js` specs 1–7. |
| `BACKEND.md` and `graphify-out/` updated | PASS | [`BACKEND.md`](file:///Users/abdulrehman/Desktop/Techno%20verse/BACKEND.md) updated with `Attempt`/`Incident` models + `/api/candidate/exams/*` + `/api/attempts/*`; `graphify-out/` rebuilt (`282 nodes, 825 edges`). |

---

## 12. Remaining Work, Blockers, Known Limitations
- **Blocker — Missing `backend/.env`**: `backend/.env` still does not exist on disk, so tests ran against an isolated local `mongod` instance rather than Atlas `MONGODB_TEST_URI`.
- **Sweeper Interval Timer**: `sweepExpiredAttempts()` is tested directly in `attempts.test.js`; `startSweeper()` interval scheduling in [`server.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/server.js) is skipped when `NODE_ENV === 'test'` and not invoked inside unit tests.
- **Git Branch**: Workspace remains on `main`.

---

## 13. Impact on Other Members
- **Member 1 (`frontend/`)**: Candidate exam session contract (`/api/candidate/exams*`, `/api/attempts*`) is locked in [`BACKEND.md`](file:///Users/abdulrehman/Desktop/Techno%20verse/BACKEND.md). Frontends should track monotonic per-question `seq` numbers for autosaves, sync countdown timers using server-returned `remainingMs`, and poll `POST /api/attempts/:id/heartbeat`.
- **Member 3 (`feat/ai`)**: `aiService.js` and `aiRoutes.js` remain untouched.

---

## 14. Final Status
**COMPLETED** *(`34/34` Vitest + Supertest tests passing across 5 suites via isolated local `mongod`.)*

---

## 15. Next Phase Recommendation
Wait for user review and signal before beginning **Phase 6: Auto-Grading, Manual Grading & Results**.

---

## 16. Actual Project State

### A. Verified `backend/` Folder Tree (Depth 3, excluding `node_modules/`)
```text
backend
├── .env.example
├── .gitignore
├── package-lock.json
├── package.json
├── vitest.config.js
├── src
│   ├── app.js
│   ├── server.js
│   ├── config/ (db.js)
│   ├── controllers/ (adminUserController.js, attemptController.js, authController.js, enrollmentController.js, examController.js, questionController.js)
│   ├── middleware/ (authMiddleware.js, errorMiddleware.js, notFoundMiddleware.js, rateLimitMiddleware.js, rbacMiddleware.js, validate.js)
│   ├── models/ (Attempt.js, Enrollment.js, Exam.js, Incident.js, Question.js, User.js)
│   ├── routes/ (adminRoutes.js, aiRoutes.js, attemptRoutes.js, authRoutes.js, candidateDirectoryRoutes.js, candidateExamRoutes.js, examRoutes.js, healthRoutes.js, index.js, questionRoutes.js)
│   ├── scripts/ (seed.js)
│   ├── services/ (adminUserService.js, aiService.js, attemptService.js, attemptSweeper.js, authService.js, enrollmentService.js, examService.js, questionService.js)
│   ├── utils/ (ApiError.js, asyncHandler.js, examStatus.js, generateToken.js, paperBuilder.js, response.js, sanitize.js, time.js, validateEnv.js)
│   └── validators/ (adminUserValidator.js, attemptValidator.js, authValidator.js, enrollmentValidator.js, examValidator.js, questionValidator.js)
└── tests
    ├── attempts.test.js
    ├── auth.test.js
    ├── exams.test.js
    ├── foundation.test.js
    └── questions.test.js
```

### B. Key Technical Decisions
- `Attempt.paper.correctOptionIds` is marked `select: false` at the Mongoose schema level AND omitted cleanly by whitelisting in `serializeAttemptForCandidate` (defense-in-depth).
- Atomic `findOneAndUpdate({ _id, status: 'in_progress' })` is shared across manual submit, lazy expiry, and background sweeping so concurrent finalization cannot double-submit or overwrite status.
- Unique partial index `{ examId: 1, userId: 1 }` with `{ partialFilterExpression: { isSandbox: false } }` prevents duplicate real attempts even under simultaneous `/start` requests while preserving future sandbox rehearsal attempts (Phase 8).

### C. Test Summary
- `(cd backend && MONGODB_TEST_URI="mongodb://127.0.0.1:27117/sems_test" npm test)` → **34 passed / 34 total** (`attempts` 7/7, `auth` 7/7, `exams` 6/6, `questions` 7/7, `foundation` 7/7, `8.91s`).

### D. Git Status Summary
- **Branch**: `main`.
- **Modified**: `.gitignore`, `BACKEND.md`, `backend/.env.example`, `backend/package-lock.json`, `backend/package.json`, `backend/src/config/db.js`, `backend/src/controllers/authController.js`, `backend/src/middleware/{authMiddleware,errorMiddleware,rateLimitMiddleware}.js`, `backend/src/models/User.js`, `backend/src/routes/{authRoutes,healthRoutes}.js`, `backend/src/server.js`, `backend/src/utils/{generateToken,validateEnv}.js`.
- **Untracked**: `backend/src/app.js`, `backend/src/controllers/{adminUserController,attemptController,enrollmentController,examController,questionController}.js`, `backend/src/middleware/{notFoundMiddleware,rbacMiddleware,validate}.js`, `backend/src/models/{Attempt,Enrollment,Exam,Incident,Question}.js`, `backend/src/routes/{adminRoutes,attemptRoutes,candidateDirectoryRoutes,candidateExamRoutes,examRoutes,index,questionRoutes}.js`, `backend/src/scripts/`, `backend/src/services/{adminUserService,attemptService,attemptSweeper,authService,enrollmentService,examService,questionService}.js`, `backend/src/utils/{ApiError,asyncHandler,examStatus,paperBuilder,response,sanitize,time}.js`, `backend/src/validators/`, `backend/tests/`, `backend/vitest.config.js`, `docs/`, plus pre-existing `files/`, `TechnoVerse_WebeThon_Master_Prompt.md`, `Web-e-Thon Problem Statement.pdf`. (`graphify-out/` gitignored.)

### E. Environment Variable NAMES Present
- `backend/.env`: **DOES NOT EXIST**.
- `backend/.env.example`: `PORT`, `NODE_ENV`, `MONGO_URI`, `MONGODB_TEST_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `CLIENT_URL`, `VERIFY_HMAC_SECRET`, `ALLOW_SELF_REGISTER`, `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, `OPENROUTER_SITE_URL`, `OPENROUTER_SITE_NAME`, `USE_MOCK_AI`.
