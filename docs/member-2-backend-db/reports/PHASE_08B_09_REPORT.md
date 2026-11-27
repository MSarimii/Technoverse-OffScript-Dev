# PHASE EXECUTION REPORT

## 1. Phase Information
- **Phase Number**: Phase 8b + 9 (08b–09)
- **Phase Name**: PDF Reports, QR Verification & Open Innovation (5.2 + 5.3)
- **Date**: 2026-11-27
- **Final Status**: COMPLETED (`47/47` Vitest + Supertest tests passing across 8 suites against isolated local `mongod` via `MONGODB_TEST_URI`; `backend/.env` remains absent on disk)

---

## 2. Objective
Implement **4.2 PDF Report Generation** (`pdfkit` summary & attempt score PDFs), **4.6 Verifiable Reports** (HMAC-SHA256 + `qrcode` verification PNG + privacy-masked public `GET /api/verify/:code`), **5.2 Innovation: Difficulty-Stratified Fairness** (per-stratum sampling + `GET /api/exams/:id/fairness`), and **5.3 Innovation: Bounded Reconnect-Grace Resilience** (`RECONNECT_GRACE_SECONDS` + four-guard buffered flush on `PUT /api/attempts/:id/answers`), tested with Vitest + Supertest, with [`BACKEND.md`](file:///Users/abdulrehman/Desktop/Techno%20verse/BACKEND.md), [`INNOVATION_NOTES.md`](file:///Users/abdulrehman/Desktop/Techno%20verse/docs/member-2-backend-db/INNOVATION_NOTES.md), and `graphify-out/` updated.

---

## 3. Implementation Summary
1. **Preliminary Inspection & Packages**:
   - Checked `git status --short`, queried `graphify-out/` (`paperBuilder.js, attemptService.js, gradingService.js, examService.js, validateEnv.js`, 379 nodes), read [`validateEnv.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/utils/validateEnv.js), [`paperBuilder.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/utils/paperBuilder.js), [`examService.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/services/examService.js), [`attemptService.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/services/attemptService.js), and [`backend/.env.example`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/.env.example), and installed `pdfkit` (`^0.21.0`) and `qrcode` (`^1.5.4`) in `backend/`.
2. **Environment Configuration**:
   - Added `RECONNECT_GRACE_SECONDS` (default `30`, integer >= 0) to [`validateEnv.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/utils/validateEnv.js) and [`backend/.env.example`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/.env.example).
3. **4.2 PDF Reports & 4.6 HMAC + QR Verification**:
   - Created [`ReportVerification.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/models/ReportVerification.js) (`code`, `attemptId`, `examId`, `scoreSnapshot`, `issuedAt`, `hmac`).
   - Created [`reportService.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/services/reportService.js):
     - Signs `${code}|${attemptId}|${examId}|${totalScore}|${maxScore}` via `HMAC-SHA256` (`VERIFY_HMAC_SECRET` with non-prod fallback) and verifies via `crypto.timingSafeEqual`.
     - `verifyReportCode` returns `{ valid: false }` on missing/tampered records, or strictly non-PII masked metadata (`valid: true`, `code`, `examTitle`, `issuedAt`, `score`, `candidateMasked`, optional `rollNoMasked`).
     - `generateExamReportPdf` & `generateAttemptReportPdf` stream clean `%PDF-` buffers via `pdfkit` (`qrcode.toBuffer` PNG embedded in attempt score PDFs alongside verification code; candidate views enforce ownership + `resultsPublished: true`).
   - Created [`reportValidator.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/validators/reportValidator.js), [`reportController.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/controllers/reportController.js), and [`verifyRoutes.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/routes/verifyRoutes.js); mounted `/verify` in [`routes/index.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/routes/index.js) and `/report.pdf` routes in [`examRoutes.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/routes/examRoutes.js) + [`attemptRoutes.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/routes/attemptRoutes.js).
4. **5.2 Innovation: Difficulty-Stratified Fairness**:
   - Updated [`examService.computeReadinessChecks`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/services/examService.js) to block publish (`hasSufficientPoolStrata`) when `blueprint.poolMode === true` and active pool counts fall short of configured `{ easy, medium, hard }`.
   - Updated [`paperBuilder.buildFrozenPaper`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/utils/paperBuilder.js) to stratify and Fisher-Yates shuffle within each difficulty tier when `poolMode === true` (preserving exact legacy behavior otherwise).
   - Created [`fairnessService.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/services/fairnessService.js) (`GET /api/exams/:id/fairness`) computing `uniqueFingerprints` and `difficultyIndexStats` (`min`, `max`, `mean`, `spread`) with `fairnessStatus`.
5. **5.3 Innovation: Bounded Reconnect-Grace Resilience**:
   - Extended [`attemptValidator.autosaveAnswersSchema`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/validators/attemptValidator.js) with optional `offlineBuffered` and `clientSavedAt`, forwarded by [`attemptController.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/controllers/attemptController.js).
   - Updated [`attemptService.autosaveAnswers`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/services/attemptService.js): `deadlineAt` is never extended; expired flushes succeed (`finalizedByGrace: true`, `remainingMs: 0`) only when `offlineBuffered === true`, `now - deadlineAt <= RECONNECT_GRACE_SECONDS * 1000`, `startedAt <= clientSavedAt <= deadlineAt`, and `lastHeartbeatAt <= deadlineAt`, then immediately finalize and auto-grade (`finalizedBy: 'expiry'`).
6. **Tests, Documentation & Graphify**:
   - Wrote [`backend/tests/reports_innovation.test.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/tests/reports_innovation.test.js) (3 comprehensive suites covering PDFs, HMAC/QR tamper/PII checks, 10-attempt fairness `spread === 0`, and bounded reconnect grace + `409` rejections).
   - Created [`docs/member-2-backend-db/INNOVATION_NOTES.md`](file:///Users/abdulrehman/Desktop/Techno%20verse/docs/member-2-backend-db/INNOVATION_NOTES.md), updated [`BACKEND.md`](file:///Users/abdulrehman/Desktop/Techno%20verse/BACKEND.md), and rebuilt `graphify-out/` across all 79 files under `backend/src` (`406 nodes, 1300 edges, 9 communities`).

---

## 4. Files Created
- [`backend/src/models/ReportVerification.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/models/ReportVerification.js) — `ReportVerification` Mongoose model and unique `code`/`attemptId` indexes.
- [`backend/src/services/reportService.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/services/reportService.js) — `pdfkit` PDF generators, `qrcode` QR PNG embedding, HMAC-SHA256 signing, timing-safe check, and PII masking.
- [`backend/src/services/fairnessService.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/services/fairnessService.js) — `getExamFairnessReport` calculating structural paper parity and difficulty index spread.
- [`backend/src/validators/reportValidator.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/validators/reportValidator.js) — `.strict()` verification code parameter schema.
- [`backend/src/controllers/reportController.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/controllers/reportController.js) — `asyncHandler` PDF download, public verify, and fairness report handlers.
- [`backend/src/routes/verifyRoutes.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/routes/verifyRoutes.js) — Public `GET /api/verify/:code` route.
- [`backend/tests/reports_innovation.test.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/tests/reports_innovation.test.js) — 3 Vitest + Supertest specs testing PDFs, QR/HMAC privacy & tampering, 10-candidate stratified pool fairness, and bounded reconnect grace.
- [`docs/member-2-backend-db/INNOVATION_NOTES.md`](file:///Users/abdulrehman/Desktop/Techno%20verse/docs/member-2-backend-db/INNOVATION_NOTES.md) — 1-page judge Q&A architecture summary of Innovations 5.2 and 5.3.
- [`docs/member-2-backend-db/reports/PHASE_08B_09_REPORT.md`](file:///Users/abdulrehman/Desktop/Techno%20verse/docs/member-2-backend-db/reports/PHASE_08B_09_REPORT.md) — This execution report.

---

## 5. Files Modified
- [`backend/package.json`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/package.json) & [`backend/package-lock.json`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/package-lock.json) — Added `pdfkit` (`^0.21.0`) and `qrcode` (`^1.5.4`).
- [`backend/.env.example`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/.env.example) & [`backend/src/utils/validateEnv.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/utils/validateEnv.js) — Added `RECONNECT_GRACE_SECONDS` (default `30`).
- [`backend/src/utils/paperBuilder.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/utils/paperBuilder.js) — Added stratified per-difficulty draw when `exam.blueprint.poolMode === true`.
- [`backend/src/services/examService.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/services/examService.js) — Added `hasSufficientPoolStrata` check inside `computeReadinessChecks`.
- [`backend/src/validators/attemptValidator.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/validators/attemptValidator.js), [`backend/src/controllers/attemptController.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/controllers/attemptController.js), & [`backend/src/services/attemptService.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/services/attemptService.js) — Added optional `offlineBuffered` + `clientSavedAt` bounded reconnect-grace flush logic.
- [`backend/src/routes/examRoutes.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/routes/examRoutes.js), [`backend/src/routes/attemptRoutes.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/routes/attemptRoutes.js), & [`backend/src/routes/index.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/routes/index.js) — Mounted PDF reports, fairness, and `/verify`.
- [`BACKEND.md`](file:///Users/abdulrehman/Desktop/Techno%20verse/BACKEND.md) — Updated env vars, `ReportVerification` schema, B6 reconnect-grace contract, B10 routes, and `backend/src/` tree.
- [`graphify-out/GRAPH_REPORT.md`](file:///Users/abdulrehman/Desktop/Techno%20verse/graphify-out/GRAPH_REPORT.md) (gitignored) — Rebuilt graph across 79 files (`406 nodes, 1300 edges, 9 communities`).

*(Verified untouched: `frontend/`, `backend/src/services/aiService.js`, `backend/src/routes/aiRoutes.js`.)*

---

## 6. Database Changes
- **`ReportVerification` Collection (`reportverifications`)**: Created schema with `code` (`unique`), `attemptId` (`unique`, ref `Attempt`), `examId` (ref `Exam`), `scoreSnapshot`, `issuedAt`, `hmac`, timestamps.
- Verified solely against isolated local test DB.

---

## 7. APIs Implemented

| Method | Path | Access | Behavior | Verified? |
|---|---|---|---|---|
| `GET` | `/api/exams/:id/report.pdf` | Examiner (owner) / Admin | Streams `%PDF-` summary & question calibration report via `pdfkit` | Yes (Supertest) |
| `GET` | `/api/attempts/:id/report.pdf` | Candidate (owner, published) / Examiner (owner) / Admin | Blocks unpublished candidate (`403 RESULTS_NOT_PUBLISHED`) & sandbox/`in_progress` (`409`); streams `%PDF-` with QR PNG & HMAC code | Yes (Supertest) |
| `GET` | `/api/verify/:code` | Public (`apiLimiter`) | Timing-safe HMAC verification; returns `{ valid: false }` or non-PII masked result summary | Yes (Supertest) |
| `GET` | `/api/exams/:id/fairness` | Examiner (owner) / Admin | Returns `uniqueFingerprints`, `strataConfigured`, `difficultyIndexStats`, and `fairnessStatus` | Yes (Supertest) |
| `PUT` | `/api/attempts/:id/answers` | Candidate (owner) / Sandbox | Enhanced with bounded `offlineBuffered` + `clientSavedAt` reconnect-grace flush (`finalizedByGrace: true`) without extending `deadlineAt` | Yes (Supertest) |

---

## 8. Dependencies and Tools Used
- **Installed Packages**:
  - `pdfkit` (`^0.21.0` in `backend/package.json`) — Generates standards-compliant multi-section PDF documents locally without headless Chrome.
  - `qrcode` (`^1.5.4` in `backend/package.json`) — Generates PNG QR code buffers embedded directly into verifiable candidate PDF reports.
- **Ephemeral Test Runtime**: Local `/opt/homebrew/bin/mongod` started in conversation scratch dir on `127.0.0.1:27117` for `MONGODB_TEST_URI`, cleaned up via `trap`.
- **Graphify (`0.9.92`)**: Queried before coding; rebuilt across 79 files (`406 nodes, 1300 edges, 9 communities`); verified `reportService.js` (`26` connections) and `fairnessService.js` (`8` connections).
- **Skills Engaged**: `graphify`, `test-driven-development`, `verification-before-completion`, `ponytail`.

---

## 9. Testing Results

| Test | Command | Expected | Actual | Status |
|---|---|---|---|---|
| Full Vitest Suite (all 8 test files) | `(cd backend && MONGODB_TEST_URI="mongodb://127.0.0.1:27117/sems_test" npm test)` | All 47 tests pass across 8 files, exit 0 | `Test Files 8 passed (8)`, `Tests 47 passed (47)` in `16.79s` | PASS |
| Graphify Explain | `graphify explain "reportService.js"` & `graphify explain "fairnessService.js"` | Maps Phase 8b+9 modules cleanly | `reportService.js` (`26` connections), `fairnessService.js` (`8` connections) verified | PASS |

### Full `npm test` Output Summary
```text
> technoverse-backend@1.0.0 test
> vitest run

 RUN  v5.1.2 /Users/abdulrehman/Desktop/Techno verse/backend

 ✓ tests/auth.test.js (7 tests) 2179ms
 ✓ tests/grading_monitoring.test.js (5 tests) 1102ms
 ✓ tests/secondary_part1.test.js (5 tests) 1005ms
 ✓ tests/attempts.test.js (7 tests) 988ms
 ✓ tests/exams.test.js (6 tests) 984ms
 ✓ tests/reports_innovation.test.js (3 tests) 2095ms
 ✓ tests/questions.test.js (7 tests) 755ms
 ✓ tests/foundation.test.js (7 tests) 46ms

 Test Files  8 passed (8)
      Tests  47 passed (47)
   Start at  14:01:55
   Duration  16.79s (tests 57%, import 41%, transform 2%)
```

---

## 10. Bugs Discovered and How Each Was Resolved
- None — all 8 Vitest suites (`47/47` tests) passed cleanly on the very first run, and existing `exams.test.js` pool-mode readiness spec remained green with `hasSufficientPoolStrata`.

---

## 11. Verification Checklist

| Acceptance Criterion | Status | Evidence |
|---|---|---|
| `npm test` passes all 8 suites (`foundation`, `auth`, `questions`, `exams`, `attempts`, `grading_monitoring`, `secondary_part1`, `reports_innovation`) | PASS | `8 passed (8)`, `47 passed (47)` in `16.79s`, exit 0. |
| PDF streams return `%PDF-`, enforce candidate publish gate & ownership, and embed QR verification | PASS | Verified in `reports_innovation.test.js` spec 1. |
| `/api/verify/:code` masks PII, omits emails/answers, and rejects unknown/tampered HMACs | PASS | Verified in `reports_innovation.test.js` spec 1. |
| 5.2 Stratified fairness produces `(2,2,1)` strata & `spread === 0` across 10 randomized candidates | PASS | Verified in `reports_innovation.test.js` spec 2. |
| 5.3 Bounded reconnect grace saves pre-deadline buffered answers within `30s`, blocks invalid/late flushes, and never extends `deadlineAt` | PASS | Verified in `reports_innovation.test.js` spec 3. |
| `BACKEND.md`, `INNOVATION_NOTES.md`, and `graphify-out/` updated | PASS | All docs updated cleanly; `graphify-out/` rebuilt (`406 nodes, 1300 edges`). |

---

## 12. Remaining Work, Blockers, Known Limitations
- **Blocker — Missing `backend/.env`**: `backend/.env` remains absent on disk, so tests ran against an isolated local `mongod` instance rather than Atlas `MONGODB_TEST_URI`.
- **QR Image Visual Decode**: PNG generation (`qrcode.toBuffer`) and PDF embedding are verified by `%PDF-` stream generation without throwing; optical pixel scanning of the embedded QR matrix via an external QR decoder library was not added.
- **Git Branch**: Workspace remains on `main`.

---

## 13. Impact on Other Members
- **Member 1 (`frontend/`)**: `/api/exams/:id/report.pdf`, `/api/attempts/:id/report.pdf`, public `/api/verify/:code`, `/api/exams/:id/fairness`, and optional `offlineBuffered` + `clientSavedAt` autosave fields are documented cleanly in [`BACKEND.md`](file:///Users/abdulrehman/Desktop/Techno%20verse/BACKEND.md).
- **Member 3 (`feat/ai`)**: `aiService.js` and `aiRoutes.js` remain untouched.

---

## 14. Final Status
**COMPLETED** *(`47/47` Vitest + Supertest tests passing across 8 suites via isolated local `mongod`.)*

---

## 15. Next Phase Recommendation
Wait for user review and signal before beginning **Phase 10** (do not proceed automatically).

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
│   ├── controllers/ (adminUserController.js, attemptController.js, authController.js, enrollmentController.js, examController.js, gradingController.js, importController.js, meController.js, monitoringController.js, questionController.js, reportController.js)
│   ├── middleware/ (authMiddleware.js, errorMiddleware.js, notFoundMiddleware.js, rateLimitMiddleware.js, rbacMiddleware.js, validate.js)
│   ├── models/ (Announcement.js, Attempt.js, AuditLog.js, Enrollment.js, Exam.js, Incident.js, Question.js, ReportVerification.js, User.js)
│   ├── routes/ (adminRoutes.js, aiRoutes.js, attemptRoutes.js, authRoutes.js, candidateDirectoryRoutes.js, candidateExamRoutes.js, candidateResultRoutes.js, examRoutes.js, healthRoutes.js, incidentRoutes.js, index.js, meRoutes.js, questionRoutes.js, verifyRoutes.js)
│   ├── scripts/ (seed.js)
│   ├── services/ (adminUserService.js, aiService.js, attemptService.js, attemptSweeper.js, authService.js, autoGrader.js, enrollmentService.js, examService.js, fairnessService.js, gradingService.js, importService.js, monitoringService.js, questionService.js, reportService.js)
│   ├── utils/ (ApiError.js, asyncHandler.js, examStatus.js, generateToken.js, paperBuilder.js, response.js, sanitize.js, scoring.js, time.js, validateEnv.js)
│   └── validators/ (adminUserValidator.js, attemptValidator.js, authValidator.js, enrollmentValidator.js, examValidator.js, gradingValidator.js, importValidator.js, meValidator.js, monitoringValidator.js, questionValidator.js, reportValidator.js)
└── tests
    ├── attempts.test.js
    ├── auth.test.js
    ├── exams.test.js
    ├── foundation.test.js
    ├── grading_monitoring.test.js
    ├── questions.test.js
    ├── reports_innovation.test.js
    └── secondary_part1.test.js
```

### B. Key Technical Decisions
- Buffered `pdfkit` PDF output cleanly via `buildPdfBuffer` before calling `res.send(buffer)` so `errorMiddleware` catches pre-stream auth/publish errors with JSON HTTP error envelopes rather than corrupted half-written PDF streams.
- Refreshed `ReportVerification` HMAC + `scoreSnapshot` automatically inside `getOrCreateVerification` if an attempt is regraded or manually adjusted between PDF downloads, keeping verification responses aligned with current grades.
- Read `RECONNECT_GRACE_SECONDS` dynamically in `attemptService.autosaveAnswers` (`Number(process.env.RECONNECT_GRACE_SECONDS ?? 30)`) so zero-grace (`0`) overrides and runtime config both behave predictably without extending `deadlineAt`.

### C. Test Summary
- `(cd backend && MONGODB_TEST_URI="mongodb://127.0.0.1:27117/sems_test" npm test)` → **47 passed / 47 total** across 8 suites (`auth` 7/7, `grading_monitoring` 5/5, `secondary_part1` 5/5, `attempts` 7/7, `exams` 6/6, `reports_innovation` 3/3, `questions` 7/7, `foundation` 7/7, `16.79s`).

### D. Git Status Summary
- **Branch**: `main`.
- **Modified**: `.gitignore`, `BACKEND.md`, `backend/.env.example`, `backend/package-lock.json`, `backend/package.json`, `backend/src/config/db.js`, `backend/src/controllers/authController.js`, `backend/src/middleware/{authMiddleware,errorMiddleware,rateLimitMiddleware}.js`, `backend/src/models/User.js`, `backend/src/routes/{authRoutes,healthRoutes}.js`, `backend/src/server.js`, `backend/src/utils/{generateToken,validateEnv}.js`.
- **Untracked**: `backend/src/app.js`, `backend/src/controllers/{adminUserController,attemptController,enrollmentController,examController,gradingController,importController,meController,monitoringController,questionController,reportController}.js`, `backend/src/middleware/{notFoundMiddleware,rbacMiddleware,validate}.js`, `backend/src/models/{Announcement,Attempt,AuditLog,Enrollment,Exam,Incident,Question,ReportVerification}.js`, `backend/src/routes/{adminRoutes,attemptRoutes,candidateDirectoryRoutes,candidateExamRoutes,candidateResultRoutes,examRoutes,incidentRoutes,index,meRoutes,questionRoutes,verifyRoutes}.js`, `backend/src/scripts/`, `backend/src/services/{adminUserService,attemptService,attemptSweeper,authService,autoGrader,enrollmentService,examService,fairnessService,gradingService,importService,monitoringService,questionService,reportService}.js`, `backend/src/utils/{ApiError,asyncHandler,examStatus,paperBuilder,response,sanitize,scoring,time}.js`, `backend/src/validators/`, `backend/tests/`, `backend/vitest.config.js`, `docs/`, plus pre-existing `files/`, `TechnoVerse_WebeThon_Master_Prompt.md`, `Web-e-Thon Problem Statement.pdf`. (`graphify-out/` gitignored.)

### E. Environment Variable NAMES Present
- `backend/.env`: **DOES NOT EXIST**.
- `backend/.env.example`: `PORT`, `NODE_ENV`, `MONGO_URI`, `MONGODB_TEST_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `CLIENT_URL`, `VERIFY_HMAC_SECRET`, `ALLOW_SELF_REGISTER`, `RECONNECT_GRACE_SECONDS`, `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, `OPENROUTER_SITE_URL`, `OPENROUTER_SITE_NAME`, `USE_MOCK_AI`.
