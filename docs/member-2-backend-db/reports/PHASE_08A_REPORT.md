# PHASE EXECUTION REPORT

## 1. Phase Information
- **Phase Number**: Phase 8a (08a)
- **Phase Name**: Sandbox, Bulk Import, Question Analytics & Preferences
- **Date**: 2026-11-27
- **Final Status**: COMPLETED (`44/44` Vitest + Supertest tests passing across 7 suites against isolated local `mongod` via `MONGODB_TEST_URI`; `backend/.env` remains absent on disk)

---

## 2. Objective
Implement four SEMS Secondary Features cleanly in one modular pass: **4.7 Workspace Preferences** (`GET/PUT /api/me/preferences`), **4.3 Examination Sandbox** (`POST /api/exams/:id/sandbox/start`, `DELETE /api/exams/:id/sandbox`, sandbox isolation on `/api/attempts/*`), **4.5 Question Analytics** (`GET /api/exams/:id/questions/analytics`), and **4.4 Bulk CSV/JSON Import** (`POST /api/questions/import`, `POST /api/exams/:id/enrollments/import` via `csv-parse`), tested with Vitest + Supertest, with [`BACKEND.md`](file:///Users/abdulrehman/Desktop/Techno%20verse/BACKEND.md) and `graphify-out/` updated.

---

## 3. Implementation Summary
1. **Preliminary Inspection & Dependency**:
   - Checked `git status --short`, queried `graphify-out/` (`User.js, attemptRoutes.js, questionRoutes.js, examRoutes.js, gradingService.js`, 350 nodes), read [`User.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/models/User.js), [`questionValidator.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/validators/questionValidator.js), and [`questionService.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/services/questionService.js), and installed `csv-parse` (`^7.0.3`) in `backend/`.
2. **4.7 Workspace Preferences**:
   - Updated [`User.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/models/User.js) `preferencesSchema` to support `'system'` (`theme`) and `'split'` (`layout`).
   - Added [`meValidator.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/validators/meValidator.js) (`.strict()` schema), [`meController.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/controllers/meController.js), and [`meRoutes.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/routes/meRoutes.js) mounted at `/api/me` (`candidate`, `examiner`, `admin`).
3. **4.3 Examination Sandbox**:
   - Added `startSandboxAttempt` and `deleteExamSandbox` in [`attemptService.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/services/attemptService.js), wired in [`attemptController.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/controllers/attemptController.js) and [`examRoutes.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/routes/examRoutes.js).
   - Updated [`Attempt.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/models/Attempt.js) (`serializeAttemptForCandidate` exposes `totalScore`, `maxScore`, `percentage`, `gradingStatus` ONLY when `isSandbox: true && status !== 'in_progress'`), [`attemptRoutes.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/routes/attemptRoutes.js) (opened session routes to `'candidate', 'examiner', 'admin'`), and `attemptService.getOwnedAttempt` (real attempts require `candidate` owner; sandbox attempts require sandbox owner or `admin`).
   - Updated [`monitoringService.listExamIncidents`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/services/monitoringService.js) to restrict incident listing to `isSandbox: false` attempts (alongside existing `isSandbox: false` guards in submissions, analytics, monitor, and admin overview).
4. **4.5 Question Analytics**:
   - Added [`getExamQuestionAnalytics`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/services/gradingService.js) + controller + `GET /api/exams/:id/questions/analytics` route computing `totalAttempts`, `answeredCount`, `skippedCount`, `skippedRate`, `correctCount`, `correctRate`, `avgScore`, calibrated `observedDifficulty` (`uncalibrated|easy|medium|hard`), and per-option `optionDistribution`.
5. **4.4 Bulk CSV/JSON Import**:
   - Exported shared `buildOptionSubdocs` from [`questionService.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/services/questionService.js).
   - Added [`importValidator.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/validators/importValidator.js), [`importService.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/services/importService.js) (using `csv-parse/sync`, max 500 rows, `?dryRun=true` & `createMissingCandidates`, per-row error collection using `createQuestionSchema.body.safeParse`, rejecting non-candidate accounts), and [`importController.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/controllers/importController.js); mounted `POST /api/questions/import` and `POST /api/exams/:id/enrollments/import`.
6. **Tests, Docs & Graphify**:
   - Wrote [`backend/tests/secondary_part1.test.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/tests/secondary_part1.test.js) (5 specs), verified `44/44` passing across all 7 suites, updated [`BACKEND.md`](file:///Users/abdulrehman/Desktop/Techno%20verse/BACKEND.md), and rebuilt `graphify-out/` (`379 nodes, 1209 edges, 8 communities`).

---

## 4. Files Created
- [`backend/src/validators/meValidator.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/validators/meValidator.js) — `.strict()` workspace preferences Zod schema.
- [`backend/src/controllers/meController.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/controllers/meController.js) — `GET` and `PUT /api/me/preferences` handlers.
- [`backend/src/routes/meRoutes.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/routes/meRoutes.js) — `/api/me` router (`candidate`, `examiner`, `admin`).
- [`backend/src/validators/importValidator.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/validators/importValidator.js) — `.strict()` bulk import schemas for questions and enrollments.
- [`backend/src/services/importService.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/services/importService.js) — `csv-parse/sync` + JSON bulk importer with 500-row limit, row-level validation, `dryRun`, and `createMissingCandidates`.
- [`backend/src/controllers/importController.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/controllers/importController.js) — Thin `asyncHandler` bulk import controllers.
- [`backend/tests/secondary_part1.test.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/tests/secondary_part1.test.js) — 5 Vitest + Supertest specs testing preferences, sandbox isolation/wiping, question analytics, CSV/JSON question import (`dryRun`), and candidate enrollment import.
- [`docs/member-2-backend-db/reports/PHASE_08A_REPORT.md`](file:///Users/abdulrehman/Desktop/Techno%20verse/docs/member-2-backend-db/reports/PHASE_08A_REPORT.md) — This execution report.

---

## 5. Files Modified
- [`backend/package.json`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/package.json) & [`backend/package-lock.json`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/package-lock.json) — Added `csv-parse` (`^7.0.3`).
- [`backend/src/models/User.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/models/User.js) — Added `'system'` theme and `'split'` layout enums to `preferencesSchema`.
- [`backend/src/models/Attempt.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/models/Attempt.js) — Included safe sandbox score fields on finished `isSandbox: true` responses.
- [`backend/src/services/questionService.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/services/questionService.js) — Exported shared `buildOptionSubdocs`.
- [`backend/src/services/attemptService.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/services/attemptService.js) — Enforced sandbox vs candidate access in `getOwnedAttempt` and added `startSandboxAttempt` / `deleteExamSandbox`.
- [`backend/src/services/gradingService.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/services/gradingService.js) — Added `getExamQuestionAnalytics`.
- [`backend/src/services/monitoringService.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/services/monitoringService.js) — Excluded sandbox attempts from `listExamIncidents`.
- [`backend/src/controllers/attemptController.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/controllers/attemptController.js) — Added `startSandboxController` & `deleteSandboxController`.
- [`backend/src/controllers/gradingController.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/controllers/gradingController.js) — Added `getExamQuestionAnalyticsController`.
- [`backend/src/routes/attemptRoutes.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/routes/attemptRoutes.js) — Updated session role guard to `requireRole('candidate', 'examiner', 'admin')` for sandbox attempts.
- [`backend/src/routes/questionRoutes.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/routes/questionRoutes.js) — Mounted `POST /import`.
- [`backend/src/routes/examRoutes.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/routes/examRoutes.js) — Mounted `POST /:id/sandbox/start`, `DELETE /:id/sandbox`, `GET /:id/questions/analytics`, and `POST /:id/enrollments/import`.
- [`backend/src/routes/index.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/routes/index.js) — Mounted `/me` (`meRoutes`).
- [`BACKEND.md`](file:///Users/abdulrehman/Desktop/Techno%20verse/BACKEND.md) — Updated `User.preferences`, documented B9 routes, and refreshed `backend/src/` tree.
- [`graphify-out/GRAPH_REPORT.md`](file:///Users/abdulrehman/Desktop/Techno%20verse/graphify-out/GRAPH_REPORT.md) (gitignored) — Rebuilt graph across 73 files (`379 nodes, 1209 edges, 8 communities`).

*(Verified untouched: `frontend/`, `backend/src/services/aiService.js`, `backend/src/routes/aiRoutes.js`.)*

---

## 6. Database Changes
- **`User` Schema (`users`)**: Expanded `preferences.theme` enum (`'dark'|'light'|'system'`) and `preferences.layout` enum (`'standard'|'compact'|'split'`).
- No new collections or index migrations required (`Attempt.isSandbox` partial unique index already existed from Phase 5).
- Verified solely against isolated local test DB.

---

## 7. APIs Implemented

| Method | Path | Access | Behavior | Verified? |
|---|---|---|---|---|
| `GET` | `/api/me/preferences` | Candidate / Examiner / Admin | Returns user workspace `{ preferences }` | Yes (Supertest) |
| `PUT` | `/api/me/preferences` | Candidate / Examiner / Admin | Strict validation + merges workspace `{ preferences }` | Yes (Supertest) |
| `POST` | `/api/exams/:id/sandbox/start` | Examiner (owner) / Admin | Launches `isSandbox: true` attempt on `draft`/`published` exam with >=1 question (`409` if empty) | Yes (Supertest) |
| `DELETE` | `/api/exams/:id/sandbox` | Examiner (owner) / Admin | Deletes caller's sandbox `Attempt`s and sandbox `Incident`s | Yes (Supertest) |
| `GET` | `/api/exams/:id/questions/analytics` | Examiner (owner) / Admin | Sweeps real attempts; computes `correctRate`, `skippedRate`, `observedDifficulty`, `optionDistribution` | Yes (Supertest) |
| `POST` | `/api/questions/import` | Examiner / Admin | Bulk CSV/JSON question validation + insert (max 500 rows, `?dryRun=true`, row errors) | Yes (Supertest) |
| `POST` | `/api/exams/:id/enrollments/import` | Examiner (owner) / Admin | Bulk CSV/JSON enrollment (max 500 rows, optional `createMissingCandidates`, rejects non-candidates) | Yes (Supertest) |

---

## 8. Dependencies and Tools Used
- **Installed Package**: `csv-parse` (`^7.0.3` in `backend/package.json`) — RFC-compliant synchronous CSV parsing (`csv-parse/sync`) for bulk question and candidate roster imports.
- **Ephemeral Test Runtime**: Local `/opt/homebrew/bin/mongod` started in conversation scratch dir on `127.0.0.1:27117` for `MONGODB_TEST_URI`, terminated and cleaned up via `trap`.
- **Graphify (`0.9.92`)**: Queried before coding; rebuilt across 73 files (`379 nodes, 1209 edges, 8 communities`); verified `importService.js` (`21` connections) and `meRoutes.js` (`14` connections).
- **Skills Engaged**: `graphify`, `test-driven-development`, `verification-before-completion`, `ponytail`.

---

## 9. Testing Results

| Test | Command | Expected | Actual | Status |
|---|---|---|---|---|
| Full Vitest Suite (`auth` + `grading_monitoring` + `attempts` + `exams` + `secondary_part1` + `questions` + `foundation`) | `(cd backend && MONGODB_TEST_URI="mongodb://127.0.0.1:27117/sems_test" npm test)` | All 44 tests pass across 7 files, exit 0 | `Test Files 7 passed (7)`, `Tests 44 passed (44)` in `13.68s` | PASS |
| Graphify Explain | `graphify explain "importService.js"` & `graphify explain "meRoutes.js"` | Maps Phase 8a modules cleanly | `importService.js` (`21` connections), `meRoutes.js` (`14` connections) verified | PASS |

### Full `npm test` Output Summary
```text
> technoverse-backend@1.0.0 test
> vitest run

 RUN  v5.1.2 /Users/abdulrehman/Desktop/Techno verse/backend

 ✓ tests/auth.test.js (7 tests) 2241ms
 ✓ tests/grading_monitoring.test.js (5 tests) 1102ms
 ✓ tests/attempts.test.js (7 tests) 1023ms
 ✓ tests/exams.test.js (6 tests) 947ms
 ✓ tests/secondary_part1.test.js (5 tests) 1030ms
 ✓ tests/questions.test.js (7 tests) 780ms
 ✓ tests/foundation.test.js (7 tests) 43ms

 Test Files  7 passed (7)
      Tests  44 passed (44)
   Start at  13:24:15
   Duration  13.68s (tests 55%, import 43%, transform 2%)
```

---

## 10. Bugs Discovered and How Each Was Resolved
- Caught and resolved upfront during implementation: [`monitoringService.listExamIncidents`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/services/monitoringService.js) previously matched all incidents by `examId` without filtering out `isSandbox: true` attempts; updated it to constrain `attemptId` to `isSandbox: false` attempts so sandbox events never leak into real exam incident feeds even before sandbox cleanup.

---

## 11. Verification Checklist

| Acceptance Criterion | Status | Evidence |
|---|---|---|
| `npm test` passes all 7 suites (`foundation`, `auth`, `questions`, `exams`, `attempts`, `grading_monitoring`, `secondary_part1`) | PASS | `7 passed (7)`, `44 passed (44)` in `13.68s`, exit 0. |
| Preferences `GET`/`PUT` and unknown-key rejection verified | PASS | Verified defaults, `system`/`split` update, and `400 VALIDATION_ERROR` in `secondary_part1.test.js` spec 1. |
| Sandbox start on draft, cross-user `403`, auto-grade on submit, real data isolation, and `DELETE` wipe verified | PASS | Verified in `secondary_part1.test.js` spec 2. |
| Question analytics (`correctRate`, `skippedRate`, `observedDifficulty`, `optionDistribution`) verified | PASS | Verified accuracy and sandbox exclusion in `secondary_part1.test.js` spec 3. |
| CSV/JSON question & candidate import (`dryRun`, `createMissingCandidates`, error reporting) verified | PASS | Verified in `secondary_part1.test.js` specs 4 & 5. |
| `BACKEND.md` and `graphify-out/` updated | PASS | [`BACKEND.md`](file:///Users/abdulrehman/Desktop/Techno%20verse/BACKEND.md) updated (`User.preferences`, B9, tree); `graphify-out/` rebuilt (`379 nodes, 1209 edges`). |

---

## 12. Remaining Work, Blockers, Known Limitations
- **Blocker — Missing `backend/.env`**: `backend/.env` remains absent on disk, so tests ran against an isolated local `mongod` instance rather than Atlas `MONGODB_TEST_URI`.
- **500-Row Overflow Spec**: The `> 500` row `400 IMPORT_INVALID` guard is implemented in `parseImportRows`, though `secondary_part1.test.js` focused on 3-row CSV/JSON + `dryRun` + error-row payloads.
- **Git Branch**: Workspace remains on `main`.

---

## 13. Impact on Other Members
- **Member 1 (`frontend/`)**: `/api/me/preferences`, exam sandbox mode, per-question analytics, and bulk CSV/JSON import contracts are documented and ready in [`BACKEND.md`](file:///Users/abdulrehman/Desktop/Techno%20verse/BACKEND.md).
- **Member 3 (`feat/ai`)**: `aiService.js` and `aiRoutes.js` remain untouched.

---

## 14. Final Status
**COMPLETED** *(`44/44` Vitest + Supertest tests passing across 7 suites via isolated local `mongod`.)*

---

## 15. Next Phase Recommendation
Wait for user review and signal before starting **Phase 8b / Phase 9** (do not proceed automatically).

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
│   ├── controllers/ (adminUserController.js, attemptController.js, authController.js, enrollmentController.js, examController.js, gradingController.js, importController.js, meController.js, monitoringController.js, questionController.js)
│   ├── middleware/ (authMiddleware.js, errorMiddleware.js, notFoundMiddleware.js, rateLimitMiddleware.js, rbacMiddleware.js, validate.js)
│   ├── models/ (Announcement.js, Attempt.js, AuditLog.js, Enrollment.js, Exam.js, Incident.js, Question.js, User.js)
│   ├── routes/ (adminRoutes.js, aiRoutes.js, attemptRoutes.js, authRoutes.js, candidateDirectoryRoutes.js, candidateExamRoutes.js, candidateResultRoutes.js, examRoutes.js, healthRoutes.js, incidentRoutes.js, index.js, meRoutes.js, questionRoutes.js)
│   ├── scripts/ (seed.js)
│   ├── services/ (adminUserService.js, aiService.js, attemptService.js, attemptSweeper.js, authService.js, autoGrader.js, enrollmentService.js, examService.js, gradingService.js, importService.js, monitoringService.js, questionService.js)
│   ├── utils/ (ApiError.js, asyncHandler.js, examStatus.js, generateToken.js, paperBuilder.js, response.js, sanitize.js, scoring.js, time.js, validateEnv.js)
│   └── validators/ (adminUserValidator.js, attemptValidator.js, authValidator.js, enrollmentValidator.js, examValidator.js, gradingValidator.js, importValidator.js, meValidator.js, monitoringValidator.js, questionValidator.js)
└── tests
    ├── attempts.test.js
    ├── auth.test.js
    ├── exams.test.js
    ├── foundation.test.js
    ├── grading_monitoring.test.js
    ├── questions.test.js
    └── secondary_part1.test.js
```

### B. Key Technical Decisions
- Reused `createQuestionSchema.body.safeParse` and `buildOptionSubdocs` inside [`importService.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/services/importService.js) so bulk question imports enforce identical validation rules to interactive Question Bank CRUD without rule drift.
- Kept `/api/attempts/:id/*` endpoints shared across candidate sessions and owner/admin sandboxes by delegating strict ownership + `isSandbox` role verification into `attemptService.getOwnedAttempt`.
- Calibrated `observedDifficulty` on real finalized attempts only and excluded `isSandbox: true` from `getExamQuestionAnalytics` and `listExamIncidents`.

### C. Test Summary
- `(cd backend && MONGODB_TEST_URI="mongodb://127.0.0.1:27117/sems_test" npm test)` → **44 passed / 44 total** (`auth` 7/7, `grading_monitoring` 5/5, `attempts` 7/7, `exams` 6/6, `secondary_part1` 5/5, `questions` 7/7, `foundation` 7/7, `13.68s`).

### D. Git Status Summary
- **Branch**: `main`.
- **Modified**: `.gitignore`, `BACKEND.md`, `backend/.env.example`, `backend/package-lock.json`, `backend/package.json`, `backend/src/config/db.js`, `backend/src/controllers/authController.js`, `backend/src/middleware/{authMiddleware,errorMiddleware,rateLimitMiddleware}.js`, `backend/src/models/User.js`, `backend/src/routes/{authRoutes,healthRoutes}.js`, `backend/src/server.js`, `backend/src/utils/{generateToken,validateEnv}.js`.
- **Untracked**: `backend/src/app.js`, `backend/src/controllers/{adminUserController,attemptController,enrollmentController,examController,gradingController,importController,meController,monitoringController,questionController}.js`, `backend/src/middleware/{notFoundMiddleware,rbacMiddleware,validate}.js`, `backend/src/models/{Announcement,Attempt,AuditLog,Enrollment,Exam,Incident,Question}.js`, `backend/src/routes/{adminRoutes,attemptRoutes,candidateDirectoryRoutes,candidateExamRoutes,candidateResultRoutes,examRoutes,incidentRoutes,index,meRoutes,questionRoutes}.js`, `backend/src/scripts/`, `backend/src/services/{adminUserService,attemptService,attemptSweeper,authService,autoGrader,enrollmentService,examService,gradingService,importService,monitoringService,questionService}.js`, `backend/src/utils/{ApiError,asyncHandler,examStatus,paperBuilder,response,sanitize,scoring,time}.js`, `backend/src/validators/`, `backend/tests/`, `backend/vitest.config.js`, `docs/`, plus pre-existing `files/`, `TechnoVerse_WebeThon_Master_Prompt.md`, `Web-e-Thon Problem Statement.pdf`. (`graphify-out/` gitignored.)

### E. Environment Variable NAMES Present
- `backend/.env`: **DOES NOT EXIST**.
- `backend/.env.example`: `PORT`, `NODE_ENV`, `MONGO_URI`, `MONGODB_TEST_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `CLIENT_URL`, `VERIFY_HMAC_SECRET`, `ALLOW_SELF_REGISTER`, `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, `OPENROUTER_SITE_URL`, `OPENROUTER_SITE_NAME`, `USE_MOCK_AI`.
