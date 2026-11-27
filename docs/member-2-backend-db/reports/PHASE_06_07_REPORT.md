# PHASE EXECUTION REPORT

## 1. Phase Information
- **Phase Number**: Phase 6 + 7 (06–07)
- **Phase Name**: Grading, Results, Analytics & Live Monitoring
- **Date**: 2026-11-27
- **Final Status**: COMPLETED (`39/39` Vitest + Supertest tests passing across 6 suites against isolated local `mongod` via `MONGODB_TEST_URI`; `backend/.env` remains absent on disk)

---

## 2. Objective
Implement end-to-end **Auto-Grading** (`single`, `multiple` `all_or_nothing` & `partial`, negative marking, `written` manual queue), **Manual Grading & Regrade**, **Result Publishing Gate & Candidate Result Views**, **Exam Analytics**, and **Live Exam Monitoring, Incident Triage & Exam Announcements**, tested via Vitest + Supertest, with [`BACKEND.md`](file:///Users/abdulrehman/Desktop/Techno%20verse/BACKEND.md) and `graphify-out/` updated.

---

## 3. Implementation Summary
1. **Preliminary Inspection**:
   - Checked `git status --short` and queried `graphify-out/` (`Attempt.js, Incident.js, attemptService.js, attemptRoutes.js, examRoutes.js`, 282 nodes).
2. **Models (`Announcement` & `AuditLog`)**:
   - [`backend/src/models/Announcement.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/models/Announcement.js): Exam-wide announcements (`examId`, `createdBy`, `message` 1–500 chars) indexed `{ examId: 1, createdAt: -1 }`, plus `serializeAnnouncement`.
   - [`backend/src/models/AuditLog.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/models/AuditLog.js): Immutable audit trail (`actorId`, `action`, `entityType`, `entityId`, `meta`, `at`) indexed `{ entityType: 1, entityId: 1 }`.
3. **Pure Scoring Engine & Acyclic Service Architecture**:
   - [`backend/src/utils/scoring.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/utils/scoring.js): Pure `scoreQuestion(paperItem, answerItem, examSettings)` handling `written` (`autoScore: null`, `pendingManual: true`), skipped answers (`0`), `single` exact match / optional negative marks, `multiple` `all_or_nothing` & `partial` credit (`marks * max(0, (correct - wrong) / totalCorrect)`), and `computeAttemptTotals(grades, maxScore, paper)` clamping `totalScore >= 0`.
   - [`backend/src/services/autoGrader.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/services/autoGrader.js): Idempotent `autoGradeAttempt(attemptId, { preserveManual = true })` separating auto-grading cleanly from `gradingService.js` and `attemptSweeper.js` so imports stay strictly acyclic.
   - Hooked `autoGradeAttempt` automatically into [`attemptService.finalizeAttempt`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/services/attemptService.js) and [`examService.completeExam`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/services/examService.js).
   - Added exam-scoped [`sweepExamOverdueAttempts(examId)`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/services/attemptSweeper.js) invoked ahead of monitor, submission list, results preview, publish, and analytics queries.
4. **Grading, Results & Analytics ([`gradingService.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/services/gradingService.js))**:
   - Implemented `listExamSubmissions`, `getAttemptForGrading` (examiner view exposing `correctOptionIds`), `gradeManualQuestion` (enforces `0 <= score <= maxMarks` -> `400 SCORE_OUT_OF_RANGE`, flips `gradingStatus: 'complete'` and `status: 'graded'` when all written items graded, logs `AuditLog('manual_grade')`), `regradeExam` (preserves manual scores, logs `AuditLog('regrade')`), `getResultsPreview`, `publishResults` (`409 GRADING_INCOMPLETE` unless `!pendingManualCount || force`, logs `AuditLog('publish_results')`), `unpublishResults`, `getExamAnalytics` (`attemptCount`, `gradedCount`, `mean`, `median`, `min`, `max`, `passRate`, `scoreHistogram`, `completionRate`, `avgTimeMinutes`), `listCandidateResults`, and `getCandidateResultDetail` (`403 FORBIDDEN` / `403 RESULTS_NOT_PUBLISHED`, zero `correctOptionIds`).
5. **Monitoring, Incidents & Announcements ([`monitoringService.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/services/monitoringService.js))**:
   - Implemented `getExamMonitor` (live `answeredCount`, `totalQuestions`, `remainingMs`, `lastHeartbeatAt`, `incidentCount`, `status`), `listExamIncidents` (filtered by `type`, `reviewStatus`, `userId`), `reviewIncident` (ownership via `assertExamAccess`, `AuditLog('review_incident')`), `createAnnouncement`, and `listAnnouncements` (exam owner/admin OR actively enrolled candidate).
   - Updated [`attemptService.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/services/attemptService.js): `recordHeartbeat` returns exam announcements (newest first, optional `since` filter); `reportIncident` caps events at 50 per attempt (`429 RATE_LIMITED`).
6. **Validators, Controllers, Routes, Docs & Graphify**:
   - Added [`gradingValidator.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/validators/gradingValidator.js), [`monitoringValidator.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/validators/monitoringValidator.js), [`gradingController.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/controllers/gradingController.js), [`monitoringController.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/controllers/monitoringController.js), [`incidentRoutes.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/routes/incidentRoutes.js), and [`candidateResultRoutes.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/routes/candidateResultRoutes.js).
   - Updated [`examRoutes.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/routes/examRoutes.js) (per-route RBAC so candidates can access `GET /api/exams/:id/announcements`), [`attemptRoutes.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/routes/attemptRoutes.js) (per-route RBAC allowing examiners/admins on grading endpoints), and [`routes/index.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/routes/index.js).
   - Wrote [`backend/tests/grading_monitoring.test.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/tests/grading_monitoring.test.js) (5 comprehensive specs), updated [`BACKEND.md`](file:///Users/abdulrehman/Desktop/Techno%20verse/BACKEND.md), and rebuilt `graphify-out/` (`350 nodes, 1093 edges, 9 communities`).

---

## 4. Files Created
- [`backend/src/models/Announcement.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/models/Announcement.js) — `Announcement` Mongoose schema, index, and `serializeAnnouncement`.
- [`backend/src/models/AuditLog.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/models/AuditLog.js) — `AuditLog` Mongoose schema and index.
- [`backend/src/utils/scoring.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/utils/scoring.js) — Pure `scoreQuestion`, `computeAttemptTotals`, and `round2`.
- [`backend/src/services/autoGrader.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/services/autoGrader.js) — Idempotent `autoGradeAttempt` engine preserving optional manual scores.
- [`backend/src/services/gradingService.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/services/gradingService.js) — Submissions, manual grading, regrade, publish gate, analytics, and candidate result views.
- [`backend/src/services/monitoringService.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/services/monitoringService.js) — Live monitor telemetry, incident filtering/review, and announcement management.
- [`backend/src/validators/gradingValidator.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/validators/gradingValidator.js) — Strict Zod schemas for grading, results publishing, and candidate result routes.
- [`backend/src/validators/monitoringValidator.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/validators/monitoringValidator.js) — Strict Zod schemas for incidents and announcements.
- [`backend/src/controllers/gradingController.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/controllers/gradingController.js) — Thin `asyncHandler` grading & results controllers.
- [`backend/src/controllers/monitoringController.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/controllers/monitoringController.js) — Thin `asyncHandler` monitoring & announcement controllers.
- [`backend/src/routes/incidentRoutes.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/routes/incidentRoutes.js) — `/api/incidents` review route (`examiner`, `admin`).
- [`backend/src/routes/candidateResultRoutes.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/routes/candidateResultRoutes.js) — `/api/candidate/results` routes (`candidate`).
- [`backend/tests/grading_monitoring.test.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/tests/grading_monitoring.test.js) — 5 Vitest + Supertest specs verifying auto-grading, manual grading, regrade, publishing gate, analytics, monitor, incident triage/cap, and heartbeat announcements.
- [`docs/member-2-backend-db/reports/PHASE_06_07_REPORT.md`](file:///Users/abdulrehman/Desktop/Techno%20verse/docs/member-2-backend-db/reports/PHASE_06_07_REPORT.md) — This execution report.

---

## 5. Files Modified
- [`backend/src/validators/attemptValidator.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/validators/attemptValidator.js) — Added optional `since` date parameter to `heartbeatSchema`.
- [`backend/src/services/attemptService.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/services/attemptService.js) — Added `autoGradeAttempt` on `finalizeAttempt`, announcement delivery on `recordHeartbeat`, and 50-incident per-attempt cap (`429 RATE_LIMITED`) on `reportIncident`.
- [`backend/src/services/attemptSweeper.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/services/attemptSweeper.js) — Added exam-scoped `sweepExamOverdueAttempts(examId)`.
- [`backend/src/services/examService.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/services/examService.js) — Invokes `autoGradeAttempt` on attempts finalized by `completeExam`.
- [`backend/src/controllers/attemptController.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/controllers/attemptController.js) — Passes optional `req.body?.since` into `recordHeartbeat`.
- [`backend/src/routes/examRoutes.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/routes/examRoutes.js) — Mounted grading/results/analytics/monitor/incidents/announcements routes with per-route RBAC.
- [`backend/src/routes/attemptRoutes.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/routes/attemptRoutes.js) — Moved `requireRole('candidate')` per route and mounted `GET /:id/grading` & `PUT /:id/grades/:questionId` for `examiner|admin`.
- [`backend/src/routes/index.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/routes/index.js) — Mounted `/incidents` and `/candidate/results`.
- [`BACKEND.md`](file:///Users/abdulrehman/Desktop/Techno%20verse/BACKEND.md) — Documented `Announcement`, `AuditLog`, B7 Grading/Analytics routes, B8 Monitoring/Announcements routes, and updated `backend/src/` tree.
- [`graphify-out/GRAPH_REPORT.md`](file:///Users/abdulrehman/Desktop/Techno%20verse/graphify-out/GRAPH_REPORT.md) (gitignored) — Rebuilt graph across 67 files (`350 nodes, 1093 edges, 9 communities`).

*(Verified untouched: `frontend/`, `backend/src/services/aiService.js`, `backend/src/routes/aiRoutes.js`.)*

---

## 6. Database Changes
- **`Announcement` Collection (`announcements`)**: `examId`, `createdBy`, `message`, timestamps; index `{ examId: 1, createdAt: -1 }`.
- **`AuditLog` Collection (`auditlogs`)**: `actorId`, `action`, `entityType`, `entityId`, `meta`, `at`; index `{ entityType: 1, entityId: 1 }`.
- No dev/prod data modified; verified solely against isolated local test DB.

---

## 7. APIs Implemented

| Method | Path | Access | Behavior | Verified? |
|---|---|---|---|---|
| `GET` | `/api/exams/:id/submissions` | Examiner (owner) / Admin | Sweeps overdue + lists real attempts & totals | Yes (Supertest) |
| `GET` | `/api/attempts/:id/grading` | Examiner (owner) / Admin | Returns full grading view including `correctOptionIds` | Yes (Supertest) |
| `PUT` | `/api/attempts/:id/grades/:questionId` | Examiner (owner) / Admin | Sets manual score (`0..maxMarks`, else `400 SCORE_OUT_OF_RANGE`), recalculates totals, logs `AuditLog` | Yes (Supertest) |
| `POST` | `/api/exams/:id/regrade` | Examiner (owner) / Admin | Re-runs objective auto-grading preserving manual grades (`AuditLog`) | Yes (Supertest) |
| `GET` | `/api/exams/:id/results/preview` | Examiner (owner) / Admin | Returns `totalAttempts`, `gradedCount`, `pendingManualCount`, `inProgressCount`, `readyToPublish` | Yes (Supertest) |
| `POST` | `/api/exams/:id/results/publish` | Examiner (owner) / Admin | Gates on `pendingManualCount === 0` (`409 GRADING_INCOMPLETE` unless `force`), publishes results | Yes (Supertest) |
| `POST` | `/api/exams/:id/results/unpublish` | Examiner (owner) / Admin | Sets `resultsPublished = false`, logs `AuditLog` | Yes (Supertest) |
| `GET` | `/api/exams/:id/analytics` | Examiner (owner) / Admin | Returns `mean`, `median`, `min`, `max`, `passRate`, `scoreHistogram`, `completionRate`, `avgTimeMinutes` | Yes (Supertest) |
| `GET` | `/api/candidate/results` | Candidate | Lists candidate's finalized attempts on published exams | Yes (Supertest) |
| `GET` | `/api/candidate/results/:attemptId` | Candidate (owner) | Returns candidate score breakdown (`403 RESULTS_NOT_PUBLISHED`, zero `correctOptionIds`) | Yes (Supertest) |
| `GET` | `/api/exams/:id/monitor` | Examiner (owner) / Admin | Sweeps overdue + returns live session telemetry (`answeredCount`, `incidentCount`, `remainingMs`) | Yes (Supertest) |
| `GET` | `/api/exams/:id/incidents` | Examiner (owner) / Admin | Lists filtered session indicators (`type`, `reviewStatus`, `userId`) | Yes (Supertest) |
| `PATCH` | `/api/incidents/:id` | Examiner (owner) / Admin | Updates `reviewStatus` & `reviewerNote`, logs `AuditLog` | Yes (Supertest) |
| `POST` | `/api/exams/:id/announcements` | Examiner (owner) / Admin | Broadcasts exam announcement (`201 { announcement }`) | Yes (Supertest) |
| `GET` | `/api/exams/:id/announcements` | Owner / Admin / Enrolled Candidate | Lists exam announcements (`403 NOT_ENROLLED` if unenrolled) | Yes (Supertest) |

---

## 8. Dependencies and Tools Used
- **Packages Installed**: None (reused Express, Mongoose, Zod, Vitest, Supertest).
- **Ephemeral Test Runtime**: Local `/opt/homebrew/bin/mongod` started in conversation scratch dir on `127.0.0.1:27117` for `MONGODB_TEST_URI`, cleaned up via `trap`.
- **Graphify (`0.9.92`)**: Queried before coding; rebuilt across 67 files (`350 nodes, 1093 edges, 9 communities`); verified `gradingService.js` (`32` connections) and `monitoringService.js` (`22` connections).
- **Skills Engaged**: `graphify`, `test-driven-development`, `verification-before-completion`, `ponytail`.

---

## 9. Testing Results

| Test | Command | Expected | Actual | Status |
|---|---|---|---|---|
| Full Vitest Suite (`grading_monitoring` + `auth` + `attempts` + `exams` + `questions` + `foundation`) | `(cd backend && MONGODB_TEST_URI="mongodb://127.0.0.1:27117/sems_test" npm test)` | All 39 tests pass across 6 files, exit 0 | `Test Files 6 passed (6)`, `Tests 39 passed (39)` in `11.58s` | PASS |
| Graphify Explain | `graphify explain "gradingService.js"` & `graphify explain "monitoringService.js"` | Maps Phase 6–7 graph edges cleanly | `gradingService.js` (`32` connections), `monitoringService.js` (`22` connections) verified | PASS |

### Full `npm test` Output Summary
```text
> technoverse-backend@1.0.0 test
> vitest run

 RUN  v5.1.2 /Users/abdulrehman/Desktop/Techno verse/backend

 ✓ tests/grading_monitoring.test.js (5 tests) 1465ms
 ✓ tests/auth.test.js (7 tests) 1846ms
 ✓ tests/attempts.test.js (7 tests) 996ms
 ✓ tests/exams.test.js (6 tests) 989ms
 ✓ tests/questions.test.js (7 tests) 767ms
 ✓ tests/foundation.test.js (7 tests) 39ms

 Test Files  6 passed (6)
      Tests  39 passed (39)
   Start at  13:14:15
   Duration  11.58s (tests 55%, import 43%, transform 1%)
```

---

## 10. Bugs Discovered and How Each Was Resolved
- None — all 6 Vitest suites (`39/39` tests) passed immediately on the very first run, and acyclic layering around `autoGrader.js` avoided circular imports across `attemptService.js`, `attemptSweeper.js`, `examService.js`, and `gradingService.js`.

---

## 11. Verification Checklist

| Acceptance Criterion | Status | Evidence |
|---|---|---|
| `npm test` passes all 6 suites (`foundation`, `auth`, `questions`, `exams`, `attempts`, `grading_monitoring`) | PASS | `6 passed (6)`, `39 passed (39)` in `11.58s`, exit 0. |
| Auto-grading (`single`, `multiple` `all_or_nothing` & `partial`, negative, `written`) + manual grading + regrade verified | PASS | Verified unit scoring table + live submit/manual/regrade workflow in `grading_monitoring.test.js` specs 1–2. |
| Result publishing gates & candidate ownership/privacy verified | PASS | Verified `409 GRADING_INCOMPLETE`, `403 RESULTS_NOT_PUBLISHED`, zero `correctOptionIds` in candidate result, cross-candidate `403`, and `unpublishResults` in spec 3. |
| Exam analytics (`mean`, `median`, `min`, `max`, `passRate`, `scoreHistogram`) verified | PASS | Verified exact math metrics in `grading_monitoring.test.js` spec 4. |
| Live monitoring, ownership `403`, incident triage, 50-event cap (`429`), and heartbeat announcements verified | PASS | Verified in `grading_monitoring.test.js` spec 5. |
| `BACKEND.md` and `graphify-out/` updated | PASS | [`BACKEND.md`](file:///Users/abdulrehman/Desktop/Techno%20verse/BACKEND.md) updated (`Announcement`, `AuditLog`, B7/B8 contracts, tree); `graphify-out/` rebuilt (`350 nodes, 1093 edges`). |

---

## 12. Remaining Work, Blockers, Known Limitations
- **Blocker — Missing `backend/.env`**: `backend/.env` remains absent on disk, so tests ran against an isolated local `mongod` instance rather than Atlas `MONGODB_TEST_URI`.
- **Publish `force: true` & `AuditLog` Assertions**: `publishResults` normal gated flow is Supertest-verified; `force: true` override flag and `AuditLog` document count assertions were not explicitly exercised in separate Supertest specs.
- **Git Branch**: Workspace remains on `main`.

---

## 13. Impact on Other Members
- **Member 1 (`frontend/`)**: Full grading, manual evaluation, result publishing, analytics, live monitoring telemetry, incident triage, and exam announcement contracts are locked in [`BACKEND.md`](file:///Users/abdulrehman/Desktop/Techno%20verse/BACKEND.md). Heartbeat responses now populate real `announcements`.
- **Member 3 (`feat/ai`)**: `aiService.js` and `aiRoutes.js` remain completely untouched.

---

## 14. Final Status
**COMPLETED** *(`39/39` Vitest + Supertest tests passing across 6 suites via isolated local `mongod`.)*

---

## 15. Next Phase Recommendation
Wait for user review and signal before beginning **Phase 8** (do not proceed automatically).

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
│   ├── controllers/ (adminUserController.js, attemptController.js, authController.js, enrollmentController.js, examController.js, gradingController.js, monitoringController.js, questionController.js)
│   ├── middleware/ (authMiddleware.js, errorMiddleware.js, notFoundMiddleware.js, rateLimitMiddleware.js, rbacMiddleware.js, validate.js)
│   ├── models/ (Announcement.js, Attempt.js, AuditLog.js, Enrollment.js, Exam.js, Incident.js, Question.js, User.js)
│   ├── routes/ (adminRoutes.js, aiRoutes.js, attemptRoutes.js, authRoutes.js, candidateDirectoryRoutes.js, candidateExamRoutes.js, candidateResultRoutes.js, examRoutes.js, healthRoutes.js, incidentRoutes.js, index.js, questionRoutes.js)
│   ├── scripts/ (seed.js)
│   ├── services/ (adminUserService.js, aiService.js, attemptService.js, attemptSweeper.js, authService.js, autoGrader.js, enrollmentService.js, examService.js, gradingService.js, monitoringService.js, questionService.js)
│   ├── utils/ (ApiError.js, asyncHandler.js, examStatus.js, generateToken.js, paperBuilder.js, response.js, sanitize.js, scoring.js, time.js, validateEnv.js)
│   └── validators/ (adminUserValidator.js, attemptValidator.js, authValidator.js, enrollmentValidator.js, examValidator.js, gradingValidator.js, monitoringValidator.js, questionValidator.js)
└── tests
    ├── attempts.test.js
    ├── auth.test.js
    ├── exams.test.js
    ├── foundation.test.js
    ├── grading_monitoring.test.js
    └── questions.test.js
```

### B. Key Technical Decisions
- Extracted `autoGradeAttempt` into `autoGrader.js` (re-exported by `gradingService.js`) so `attemptService`, `examService`, `attemptSweeper`, `gradingService`, and `monitoringService` form a clean acyclic dependency graph.
- Changed `examRoutes.js` and `attemptRoutes.js` from router-wide `requireRole` guards to explicit per-route `requireRole` middleware so mixed-role endpoints (`GET /api/exams/:id/announcements`, `/api/attempts/:id/grading`, `/api/attempts/:id/grades/:questionId`) share domain paths cleanly without weakening access checks.
- Clamped `totalScore >= 0` in `computeAttemptTotals` so cumulative negative marks across objective questions never yield negative total exam scores.

### C. Test Summary
- `(cd backend && MONGODB_TEST_URI="mongodb://127.0.0.1:27117/sems_test" npm test)` → **39 passed / 39 total** (`grading_monitoring` 5/5, `auth` 7/7, `attempts` 7/7, `exams` 6/6, `questions` 7/7, `foundation` 7/7, `11.58s`).

### D. Git Status Summary
- **Branch**: `main`.
- **Modified**: `.gitignore`, `BACKEND.md`, `backend/.env.example`, `backend/package-lock.json`, `backend/package.json`, `backend/src/config/db.js`, `backend/src/controllers/authController.js`, `backend/src/middleware/{authMiddleware,errorMiddleware,rateLimitMiddleware}.js`, `backend/src/models/User.js`, `backend/src/routes/{authRoutes,healthRoutes}.js`, `backend/src/server.js`, `backend/src/utils/{generateToken,validateEnv}.js`.
- **Untracked**: `backend/src/app.js`, `backend/src/controllers/{adminUserController,attemptController,enrollmentController,examController,gradingController,monitoringController,questionController}.js`, `backend/src/middleware/{notFoundMiddleware,rbacMiddleware,validate}.js`, `backend/src/models/{Announcement,Attempt,AuditLog,Enrollment,Exam,Incident,Question}.js`, `backend/src/routes/{adminRoutes,attemptRoutes,candidateDirectoryRoutes,candidateExamRoutes,candidateResultRoutes,examRoutes,incidentRoutes,index,questionRoutes}.js`, `backend/src/scripts/`, `backend/src/services/{adminUserService,attemptService,attemptSweeper,authService,autoGrader,enrollmentService,examService,gradingService,monitoringService,questionService}.js`, `backend/src/utils/{ApiError,asyncHandler,examStatus,paperBuilder,response,sanitize,scoring,time}.js`, `backend/src/validators/`, `backend/tests/`, `backend/vitest.config.js`, `docs/`, plus pre-existing `files/`, `TechnoVerse_WebeThon_Master_Prompt.md`, `Web-e-Thon Problem Statement.pdf`. (`graphify-out/` gitignored.)

### E. Environment Variable NAMES Present
- `backend/.env`: **DOES NOT EXIST**.
- `backend/.env.example`: `PORT`, `NODE_ENV`, `MONGO_URI`, `MONGODB_TEST_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `CLIENT_URL`, `VERIFY_HMAC_SECRET`, `ALLOW_SELF_REGISTER`, `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, `OPENROUTER_SITE_URL`, `OPENROUTER_SITE_NAME`, `USE_MOCK_AI`.
