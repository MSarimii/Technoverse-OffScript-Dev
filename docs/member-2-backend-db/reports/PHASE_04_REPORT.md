# PHASE EXECUTION REPORT

## 1. Phase Information
- **Phase Number**: Phase 4 (04)
- **Phase Name**: Exams, Lifecycle & Enrollment
- **Date**: 2026-11-27
- **Final Status**: COMPLETED (`27/27` Vitest + Supertest tests passing against isolated local `mongod` via `MONGODB_TEST_URI`; `backend/.env` remains absent on disk)

---

## 2. Objective
Implement modular Exam Management (`Exam` & `Enrollment` models, pure time-derived `resolveExamStatus` lifecycle state machine, question assignment with marks computation, pre-publish readiness check, randomized blueprint configuration, and idempotent candidate enrollment + directory search), update admin overview exam counts, verify via TDD (`RED -> GREEN`) across all 4 Vitest + Supertest suites, update `BACKEND.md`, and rebuild `graphify-out/`.

---

## 3. Implementation Summary
1. **TDD Workflow (`RED -> GREEN`)**:
   - Inspected `graphify-out/` (`Map routes/index.js, Question.js, User.js, and adminUserService.js`, 157 nodes / 94-node neighborhood).
   - Wrote [`backend/tests/exams.test.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/tests/exams.test.js) first (6 comprehensive test specs) and verified **RED** (failed importing missing `../src/models/Enrollment.js`).
2. **Pure Lifecycle Helper & Data Models**:
   - [`backend/src/utils/examStatus.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/utils/examStatus.js): Pure `resolveExamStatus(exam, currentTime = now())` preserving `draft`/`cancelled`/`completed` and deriving `published` (< `startAt`), `ongoing` (`[startAt, endAt)`), and `completed` (>= `endAt`) from `status: 'published'`.
   - [`backend/src/models/Exam.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/models/Exam.js): `Exam` schema (`createdBy`, `title`, `instructions`, `startAt`, `endAt`, `durationMinutes`, `totalMarks`, `status`, `settings`, `questions`, `blueprint`, `resultsPublished`, `resultsPublishedAt`, `publishedAt`), indexes (`{ createdBy: 1, status: 1 }`, `{ startAt: 1, endAt: 1 }`, `{ status: 1 }`), and `serializeExam(exam, { currentTime, enrolledCount })`.
   - [`backend/src/models/Enrollment.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/models/Enrollment.js): `Enrollment` schema (`examId`, `userId`, `enrolledBy`, `status: 'active'|'removed'`), unique index `{ examId: 1, userId: 1 }`, `{ userId: 1 }`, and `serializeEnrollment` mapping populated `userId` to safe `candidate` DTO via `serializeUser`.
3. **Strict Zod Validators & Modular Services**:
   - [`backend/src/validators/examValidator.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/validators/examValidator.js): `.strict()` schemas for exam ID params, list filters, creation (`endAt > startAt`), partial updates, ordered question assignment (rejecting duplicate `questionId`s), and blueprint configuration.
   - [`backend/src/validators/enrollmentValidator.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/validators/enrollmentValidator.js): `.strict()` schemas for listing enrollments (`status`), enrolling via `userIds` and/or `emails`, removing enrollments, and searching candidates.
   - [`backend/src/services/examService.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/services/examService.js): Shared `assertExamAccess`, ownership-scoped `listExams` (with `Aggregation` active `enrolledCount` and time-consistent status filtering), `createExam`, `getExamById`, `updateExam` (locking `startAt`, `durationMinutes`, shortened `endAt`, and non-score-release settings on published exams with `409 CONFLICT`), `deleteExam` (hard delete on `draft`, cancel on active `published`, `409` on `completed`/`cancelled`), `setExamQuestions` (enforces ownership `403`, blocks archived/missing `400`, assigns `order: 0..n-1`, recomputes `totalMarks`), shared `computeReadinessChecks` + `getExamReadiness` + `publishExam`, `completeExam`, and `updateBlueprint`.
   - [`backend/src/services/enrollmentService.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/services/enrollmentService.js): Reuses `assertExamAccess` & `escapeRegex`; enforces active `candidate` role check (`400`), idempotently upserts/reactivates enrollments (`enrolledCount`, `alreadyEnrolledCount`), soft-removes enrollments (`status: 'removed'`), and searches active candidates by `name`/`email`/`rollNo`.
   - [`backend/src/services/adminUserService.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/services/adminUserService.js): Updated `getAdminOverview()` to query live `Exam.countDocuments()`.
4. **Controllers, Routing & Test Config**:
   - Added [`examController.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/controllers/examController.js), [`enrollmentController.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/controllers/enrollmentController.js), [`examRoutes.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/routes/examRoutes.js), and [`candidateDirectoryRoutes.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/routes/candidateDirectoryRoutes.js); mounted `/exams` and `/candidates` in [`routes/index.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/routes/index.js).
   - Disabled parallel test-file execution (`fileParallelism: false`) in [`backend/vitest.config.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/vitest.config.js) to eliminate cross-file DB contention on shared `MONGODB_TEST_URI`, and updated [`backend/tests/auth.test.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/tests/auth.test.js) overview expectation (`exams: expect.any(Number)`).
5. **Docs & Graphify**:
   - Updated [`BACKEND.md`](file:///Users/abdulrehman/Desktop/Techno%20verse/BACKEND.md) with `Exam` & `Enrollment` models, `resolveExamStatus`, `/api/exams/*`, `/api/candidates`, live `/api/admin/overview` `exams` count, and updated `backend/src/` tree.
   - Rebuilt `graphify-out/` across all 46 files under `backend/src` (`223 nodes, 627 edges, 7 communities`).

---

## 4. Files Created
- [`backend/src/utils/examStatus.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/utils/examStatus.js) — Pure `resolveExamStatus(exam, currentTime)` helper.
- [`backend/src/models/Exam.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/models/Exam.js) — `Exam` Mongoose model, indexes, and `serializeExam` DTO.
- [`backend/src/models/Enrollment.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/models/Enrollment.js) — `Enrollment` Mongoose model, unique index, and `serializeEnrollment` DTO.
- [`backend/src/validators/examValidator.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/validators/examValidator.js) — Strict Zod schemas for exam CRUD, questions, and blueprint endpoints.
- [`backend/src/validators/enrollmentValidator.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/validators/enrollmentValidator.js) — Strict Zod schemas for exam enrollment and candidate search endpoints.
- [`backend/src/services/examService.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/services/examService.js) — Exam CRUD, ownership guard, lifecycle state transitions, question assignment, readiness checks, and blueprint service.
- [`backend/src/services/enrollmentService.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/services/enrollmentService.js) — Idempotent candidate enrollment, soft removal, and candidate directory search service.
- [`backend/src/controllers/examController.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/controllers/examController.js) — Thin `asyncHandler` exam controllers.
- [`backend/src/controllers/enrollmentController.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/controllers/enrollmentController.js) — Thin `asyncHandler` enrollment & candidate search controllers.
- [`backend/src/routes/examRoutes.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/routes/examRoutes.js) — `/api/exams` route definitions behind `requireAuth, requireRole('examiner', 'admin')`.
- [`backend/src/routes/candidateDirectoryRoutes.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/routes/candidateDirectoryRoutes.js) — `/api/candidates` route behind `requireAuth, requireRole('examiner', 'admin')`.
- [`backend/tests/exams.test.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/tests/exams.test.js) — 6 Vitest + Supertest specs verifying `resolveExamStatus`, question assignment/marks calculation, readiness & publish gates, published edit/cancel locks, RBAC/ownership + `/api/admin/overview`, and idempotent enrollments + candidate search.
- [`docs/member-2-backend-db/reports/PHASE_04_REPORT.md`](file:///Users/abdulrehman/Desktop/Techno%20verse/docs/member-2-backend-db/reports/PHASE_04_REPORT.md) — This execution report.

---

## 5. Files Modified
- [`backend/src/routes/index.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/routes/index.js) — Mounted `/exams` (`examRoutes`) and `/candidates` (`candidateDirectoryRoutes`).
- [`backend/src/services/adminUserService.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/services/adminUserService.js) — Replaced static `exams: 0` with `Exam.countDocuments()` in `getAdminOverview()`.
- [`backend/vitest.config.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/vitest.config.js) — Added `fileParallelism: false` for deterministic test execution against shared `MONGODB_TEST_URI`.
- [`backend/tests/auth.test.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/tests/auth.test.js) — Updated `/api/admin/overview` assertion to expect `{ exams: expect.any(Number), attempts: 0 }`.
- [`BACKEND.md`](file:///Users/abdulrehman/Desktop/Techno%20verse/BACKEND.md) — Documented `Exam`, `Enrollment`, `resolveExamStatus`, `/api/exams/*`, `/api/candidates`, updated `/api/admin/overview`, and `backend/src/` tree.
- [`graphify-out/GRAPH_REPORT.md`](file:///Users/abdulrehman/Desktop/Techno%20verse/graphify-out/GRAPH_REPORT.md) (gitignored) — Rebuilt graph across 46 files (`223 nodes, 627 edges, 7 communities`).

*(Verified untouched: `frontend/`, `backend/src/services/aiService.js`, `backend/src/routes/aiRoutes.js`.)*

---

## 6. Database Changes
- **`Exam` Collection (`exams`)**:
  - Added schema (`createdBy`, `title`, `instructions`, `startAt`, `endAt`, `durationMinutes`, `totalMarks`, `status`, `settings`, `questions`, `blueprint`, `resultsPublished`, `resultsPublishedAt`, `publishedAt`, timestamps).
  - Indexes: `{ createdBy: 1, status: 1 }`, `{ startAt: 1, endAt: 1 }`, `{ status: 1 }`.
- **`Enrollment` Collection (`enrollments`)**:
  - Added schema (`examId`, `userId`, `enrolledBy`, `status`, timestamps).
  - Indexes: `{ examId: 1, userId: 1 }` (`unique`), `{ userId: 1 }`.
- No dev/prod data modified; verified solely against isolated local test DB.

---

## 7. APIs Implemented

| Method | Path | Access | Behavior | Verified? |
|---|---|---|---|---|
| `GET` | `/api/exams` | Examiner (own) / Admin (all) | Filter by derived `status`, paginate, include `effectiveStatus` and `enrolledCount` | Yes |
| `POST` | `/api/exams` | Examiner / Admin | Creates `draft` exam (`totalMarks: 0`, `201 { exam }`) | Yes (Supertest) |
| `GET` | `/api/exams/:id` | Examiner (owner) / Admin | Returns `{ exam }` with `enrolledCount`; `403` for non-owner examiner | Yes (Supertest) |
| `PATCH` | `/api/exams/:id` | Examiner (owner) / Admin | Full edits in `draft`; locks `durationMinutes`/`startAt`/shortened `endAt`/disallowed settings on `published` (`409`); blocks `completed`/`cancelled` (`409`) | Yes (Supertest) |
| `DELETE` | `/api/exams/:id` | Examiner (owner) / Admin | Hard-deletes `draft` + enrollments; cancels `published` -> `cancelled` (`200 { exam }`); rejects `completed`/`cancelled` (`409`) | Yes (Supertest) |
| `PUT` | `/api/exams/:id/questions` | Examiner (owner) / Admin | Assigns ordered questions in `draft`, enforces active + owner (`400`/`403`), recomputes `totalMarks` | Yes (Supertest) |
| `GET` | `/api/exams/:id/readiness` | Examiner (owner) / Admin | Returns `{ ready, checks, blockers, warnings }` | Yes (Supertest) |
| `POST` | `/api/exams/:id/publish` | Examiner (owner) / Admin | Transitions `draft` -> `published` (`publishedAt`) when `ready === true`, or `409 CONFLICT` | Yes (Supertest) |
| `POST` | `/api/exams/:id/complete` | Examiner (owner) / Admin | Transitions `published` -> `completed` (`409` otherwise) | Yes |
| `PUT` | `/api/exams/:id/blueprint` | Examiner (owner) / Admin | Configures `{ easy, medium, hard, poolMode }` in `draft` | Yes (Supertest) |
| `GET` | `/api/exams/:id/enrollments` | Examiner (owner) / Admin | Lists enrollments with populated `candidate` DTO (optional `?status=active\|removed`) | Yes |
| `POST` | `/api/exams/:id/enrollments` | Examiner (owner) / Admin | Idempotently enrolls/reactivates active candidates by `userIds`/`emails`; rejects non-candidate/inactive/missing (`400`) | Yes (Supertest) |
| `DELETE` | `/api/exams/:id/enrollments/:userId` | Examiner (owner) / Admin | Marks enrollment `status: 'removed'` | Yes (Supertest) |
| `GET` | `/api/candidates` | Examiner / Admin | Searches active `candidate` accounts by `?q=` (`name`, `email`, `rollNo`) with pagination | Yes (Supertest) |
| `GET` | `/api/admin/overview` | Admin | Updated `exams` field to query live `Exam.countDocuments()` | Yes (Supertest) |

---

## 8. Dependencies and Tools Used
- **Packages Installed**: None in Phase 4 (reused Express, Mongoose, Zod, Vitest, Supertest).
- **Ephemeral Test Runtime**: Local `/opt/homebrew/bin/mongod` started in conversation scratch dir on `127.0.0.1:27117` for `MONGODB_TEST_URI`, terminated and cleaned up via `trap`.
- **Graphify (`0.9.92`)**: Queried existing graph before Batch 1; rebuilt across 46 files (`223 nodes, 627 edges, 7 communities`); verified via `graphify explain "Exam.js"` (`11` connections) and `graphify explain "examService.js"` (`26` connections).
- **Skills Engaged**: `graphify`, `test-driven-development`, `verification-before-completion`, `ponytail`.

---

## 9. Testing Results

| Test | Command | Expected | Actual | Status |
|---|---|---|---|---|
| TDD RED Phase (`exams.test.js`) | `MONGODB_TEST_URI="mongodb://127.0.0.1:27117/sems_test" npx vitest run tests/exams.test.js` | Suite fails before implementation | Failed importing missing `../src/models/Enrollment.js` | PASS (Expected RED) |
| Full Vitest Suite (`exams` + `auth` + `questions` + `foundation`) | `(cd backend && MONGODB_TEST_URI="mongodb://127.0.0.1:27117/sems_test" npm test)` | All 27 tests pass across 4 files, exit 0 | `Test Files 4 passed (4)`, `Tests 27 passed (27)` in `7.67s` | PASS |
| Graphify Explain | `graphify explain "Exam.js"` & `graphify explain "examService.js"` | Maps new Phase 4 exam & enrollment graph edges | `Exam.js` (`11` connections), `examService.js` (`26` connections) verified | PASS |

### Full `npm test` Output Summary
```text
> technoverse-backend@1.0.0 test
> vitest run

 RUN  v5.1.2 /Users/abdulrehman/Desktop/Techno verse/backend

 ✓ tests/exams.test.js (6 tests) 1137ms
 ✓ tests/auth.test.js (7 tests) 1841ms
 ✓ tests/questions.test.js (7 tests) 756ms
 ✓ tests/foundation.test.js (7 tests) 48ms

 Test Files  4 passed (4)
      Tests  27 passed (27)
   Start at  12:54:41
   Duration  7.67s (tests 52%, import 46%, transform 2%)
```

---

## 10. Bugs Discovered and How Each Was Resolved
- None in Phase 4 Batch 2 implementation — all 4 Vitest suites (`27/27` tests) passed immediately on the first full run after Batch 2 services, controllers, and routes were wired. `fileParallelism: false` in `backend/vitest.config.js` prevented cross-suite `Exam` DB contention with `auth.test.js` overview assertions.
- Cleaned up stray `backend/src/graphify-out` cache directory created by default `graphify` extraction paths.

---

## 11. Verification Checklist

| Acceptance Criterion | Status | Evidence |
|---|---|---|
| `npm test` passes `foundation.test.js`, `auth.test.js`, `questions.test.js`, and `exams.test.js` | PASS | `4 passed (4)`, `27 passed (27)` in `7.67s`, exit 0. |
| `resolveExamStatus` & lifecycle state machine (`draft`/`published`/`ongoing`/`completed`/`cancelled`) verified | PASS | Verified unit edge timestamps + publish readiness blocking (`409`) + post-publish field locks (`409`) + cancel-on-delete (`cancelled`) in `exams.test.js` specs 1, 3, 4. |
| Question assignment, ownership/archived rejection, and `totalMarks` recomputation verified | PASS | Verified `400` duplicate/archived, `403` cross-examiner question, `totalMarks` = `11`, `order: 0..1` in `exams.test.js` spec 2. |
| Enrollment idempotency, active-candidate guard, removal, candidate search, and admin overview count verified | PASS | Verified in `exams.test.js` specs 5 & 6 (`enrolledCount`/`alreadyEnrolledCount`, `removed` -> reactivation, `/api/candidates`, `/api/admin/overview`). |
| `BACKEND.md` and `graphify-out/` updated | PASS | [`BACKEND.md`](file:///Users/abdulrehman/Desktop/Techno%20verse/BACKEND.md) documents `Exam`, `Enrollment`, `resolveExamStatus`, `/api/exams/*`, `/api/candidates`; `graphify-out/` updated (`223 nodes, 627 edges, 7 communities`). |

---

## 12. Remaining Work, Blockers, Known Limitations
- **Blocker — Missing `backend/.env`**: `backend/.env` still does not exist on disk (`MONGO_URI` / `MONGODB_TEST_URI`), so automated tests ran against an isolated local `mongod` instance rather than Atlas `MONGODB_TEST_URI`.
- **Git Branch**: Workspace remains on `main`; user handles branching/commits to `feat/backend`.
- **Route Paths Not Exercised by Supertest**: `POST /api/exams/:id/complete` and `GET /api/exams/:id/enrollments` were wired and checked via `validate`/service logic cleanly, while `exams.test.js` focused on CRUD, readiness, publish, cancel-on-delete, enroll, remove, reactivate, and candidate search.

---

## 13. Impact on Other Members
- **Member 1 (`frontend/`)**: Exam lifecycle, readiness check, blueprint, enrollment, and candidate directory contracts are locked in [`BACKEND.md`](file:///Users/abdulrehman/Desktop/Techno%20verse/BACKEND.md). Frontends should display `effectiveStatus` (returned alongside `status`), call `GET /api/exams/:id/readiness` before publish, and expect `409 CONFLICT` on locked post-publish edits.
- **Member 3 (`feat/ai`)**: `aiService.js` and `aiRoutes.js` remain completely untouched.

---

## 14. Final Status
**COMPLETED** *(`27/27` Vitest + Supertest tests passing across 4 suites via isolated local `mongod`.)*

---

## 15. Next Phase Recommendation
Wait for user review and signal before beginning **Phase 5: Candidate Exam Session & Attempt Engine** (`Attempt`, immutable question snapshots, timed submission, auto-grading).

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
│   ├── controllers/ (adminUserController.js, authController.js, enrollmentController.js, examController.js, questionController.js)
│   ├── middleware/ (authMiddleware.js, errorMiddleware.js, notFoundMiddleware.js, rateLimitMiddleware.js, rbacMiddleware.js, validate.js)
│   ├── models/ (Enrollment.js, Exam.js, Question.js, User.js)
│   ├── routes/ (adminRoutes.js, aiRoutes.js, authRoutes.js, candidateDirectoryRoutes.js, examRoutes.js, healthRoutes.js, index.js, questionRoutes.js)
│   ├── scripts/ (seed.js)
│   ├── services/ (adminUserService.js, aiService.js, authService.js, enrollmentService.js, examService.js, questionService.js)
│   ├── utils/ (ApiError.js, asyncHandler.js, examStatus.js, generateToken.js, response.js, sanitize.js, time.js, validateEnv.js)
│   └── validators/ (adminUserValidator.js, authValidator.js, enrollmentValidator.js, examValidator.js, questionValidator.js)
└── tests
    ├── auth.test.js
    ├── exams.test.js
    ├── foundation.test.js
    └── questions.test.js
```

### B. Key Technical Decisions
- `resolveExamStatus(exam, currentTime)` derives `ongoing` and expiry-based `completed` cleanly from server clock without background cron drift.
- `computeReadinessChecks` is shared between `GET /api/exams/:id/readiness` and `POST /api/exams/:id/publish` so UI diagnostics and the hard `409 CONFLICT` publish gate cannot diverge.
- `Enrollment` soft-removals set `status: 'removed'` and are reactivated in place upon re-enrollment rather than deleting audit history or duplicating `(examId, userId)` pairs.

### C. Test Summary
- `(cd backend && MONGODB_TEST_URI="mongodb://127.0.0.1:27117/sems_test" npm test)` → **27 passed / 27 total** (`exams` 6/6, `auth` 7/7, `questions` 7/7, `foundation` 7/7, `7.67s`).

### D. Git Status Summary
- **Branch**: `main`.
- **Modified**: `.gitignore`, `BACKEND.md`, `backend/.env.example`, `backend/package-lock.json`, `backend/package.json`, `backend/src/config/db.js`, `backend/src/controllers/authController.js`, `backend/src/middleware/{authMiddleware,errorMiddleware,rateLimitMiddleware}.js`, `backend/src/models/User.js`, `backend/src/routes/{authRoutes,healthRoutes}.js`, `backend/src/server.js`, `backend/src/utils/{generateToken,validateEnv}.js`.
- **Untracked**: `backend/src/app.js`, `backend/src/controllers/{adminUserController,enrollmentController,examController,questionController}.js`, `backend/src/middleware/{notFoundMiddleware,rbacMiddleware,validate}.js`, `backend/src/models/{Enrollment,Exam,Question}.js`, `backend/src/routes/{adminRoutes,candidateDirectoryRoutes,examRoutes,index,questionRoutes}.js`, `backend/src/scripts/`, `backend/src/services/{adminUserService,authService,enrollmentService,examService,questionService}.js`, `backend/src/utils/{ApiError,asyncHandler,examStatus,response,sanitize,time}.js`, `backend/src/validators/`, `backend/tests/`, `backend/vitest.config.js`, `docs/`, plus pre-existing `files/`, `TechnoVerse_WebeThon_Master_Prompt.md`, `Web-e-Thon Problem Statement.pdf`. (`graphify-out/` gitignored.)

### E. Environment Variable NAMES Present
- `backend/.env`: **DOES NOT EXIST**.
- `backend/.env.example`: `PORT`, `NODE_ENV`, `MONGO_URI`, `MONGODB_TEST_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `CLIENT_URL`, `VERIFY_HMAC_SECRET`, `ALLOW_SELF_REGISTER`, `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, `OPENROUTER_SITE_URL`, `OPENROUTER_SITE_NAME`, `USE_MOCK_AI`.
