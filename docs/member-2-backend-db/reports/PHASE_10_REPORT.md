# PHASE EXECUTION REPORT

## 1. Phase Information
- **Phase Number**: Phase 10
- **Phase Name**: Hardening, Demo Seed & Security Audit
- **Date**: 2026-11-27
- **Final Status**: COMPLETED (`51/51` Vitest + Supertest tests passing across 9 suites; double-run idempotent `npm run seed` verified against isolated local `mongod`; 5-check security audit PASS; `backend/.env` remains absent on disk)

---

## 2. Objective
Execute the **5-Check Security & Technical Quality Audit** across `backend/src/`, `backend/tests/`, [`BACKEND.md`](file:///Users/abdulrehman/Desktop/Techno%20verse/BACKEND.md), and [`README.md`](file:///Users/abdulrehman/Desktop/Techno%20verse/README.md); fix every hardening gap discovered; expand [`backend/src/scripts/seed.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/scripts/seed.js) into an idempotent full-demo seed; add [`backend/tests/security_audit.test.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/tests/security_audit.test.js) covering mass assignment, NoSQL operator stripping, IDOR isolation, and `syncIndexes()` across all 9 models; update [`README.md`](file:///Users/abdulrehman/Desktop/Techno%20verse/README.md), [`BACKEND.md`](file:///Users/abdulrehman/Desktop/Techno%20verse/BACKEND.md), and `graphify-out/`; and verify everything against isolated local `mongod` instances.

---

## 3. Implementation Summary
1. **5-Check Security & Quality Audit & Hardening Fixes**:
   - Audited all validators (`backend/src/validators/`), services (`backend/src/services/`), middleware pipeline (`app.js`, `sanitize.js`, `authMiddleware.js`, `rateLimitMiddleware.js`, `errorMiddleware.js`), and routes (`backend/src/routes/`).
   - **Hardening Fix 1**: Added `.strict()` to `questionIdParamSchema.params` in [`questionValidator.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/validators/questionValidator.js#L82-L87) and `objectIdParam` in [`adminUserValidator.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/validators/adminUserValidator.js#L3-L7) so every Zod schema in `backend/src/validators/` uniformly rejects unknown keys.
   - **Hardening Fix 2**: Added `emptyStrictBodySchema` (`z.preprocess((val) => (val === undefined ? {} : val), z.object({}).strict())`) to new `startAttemptSchema` and `submitAttemptSchema` in [`attemptValidator.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/validators/attemptValidator.js#L13-L26) and wired them into [`candidateExamRoutes.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/routes/candidateExamRoutes.js#L18) and [`attemptRoutes.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/routes/attemptRoutes.js#L60) so unexpected body payloads like `{ isSandbox: true }` on `/start` or `{ totalScore: 100 }` on `/submit` fail fast with `400 VALIDATION_ERROR`.
2. **Full Idempotent Demo Seed ([`backend/src/scripts/seed.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/scripts/seed.js))**:
   - Kept find-or-create logic strictly non-destructive (zero database wipes).
   - Expanded `seedUsers()` to 13 accounts: `admin@sems.edu`, `examiner1@sems.edu`, `examiner2@sems.edu`, and `candidate1@sems.edu`–`candidate10@sems.edu` (`rollNo: "SEMS-2026-001"`–`"SEMS-2026-010"`), password from `SEED_DEFAULT_PASSWORD || 'Pass1234!'`.
   - Added `seedDemoData()` idempotently provisioning:
     - **36 questions** across 4 topics (`Algorithms`, `Databases`, `Networks`, `Security`) × 3 difficulties (`easy`, `medium`, `hard`), covering `single`, `multiple` (`all_or_nothing` with `negativeMarks: 0.5` and `partial`), and `written` questions with rubrics.
     - **4 lifecycle exams**:
       1. `CS-401 Midterm: Systems & Security (Completed Demo)` (`status: 'completed'`, `resultsPublished: true`, 5 enrollments, 4 finalized & auto+manually graded attempts, 1 `Announcement`, 1 dismissed `Incident`, `AuditLog` entries, and HMAC `ReportVerification` records with demo verification code printed at completion).
       2. `CS-402 Live Adaptive Quiz (Ongoing Demo)` (active window around `now()`, `blueprint: { poolMode: true, easy: 2, medium: 2, hard: 1 }`, 12-question pool, 10 enrolled candidates).
       3. `CS-403 Final Assessment (Upcoming Demo)` (`startAt` +3d, `status: 'published'`, 8 questions, 6 enrolled candidates).
       4. `CS-404 Distributed Architecture (Draft Demo)` (`status: 'draft'`, 6 questions, 2 enrolled candidates, readiness-ready for Sandbox/Publish demos).
3. **Security Audit Test Suite ([`backend/tests/security_audit.test.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/tests/security_audit.test.js))**:
   - Added 4 focused security integration tests verifying: mass-assignment rejection (`400 VALIDATION_ERROR`), `sanitizeMiddleware` NoSQL `$`/dotted-key stripping across body and query, full Candidate and Examiner cross-tenant IDOR isolation (`403 FORBIDDEN`) across attempts, results, PDFs, exams, analytics, monitoring, and questions, and `syncIndexes()` across all 9 Mongoose models.
4. **Documentation & Graphify**:
   - Wrote hackathon-ready [`README.md`](file:///Users/abdulrehman/Desktop/Techno%20verse/README.md) with architecture, setup, `.env` variables, demo credentials (`Pass1234!`), seeded dataset summary, and Innovations 5.2 & 5.3.
   - Updated the seed summary line in [`BACKEND.md`](file:///Users/abdulrehman/Desktop/Techno%20verse/BACKEND.md#L333) and synced `graphify-out/` (`416 nodes, 1343 edges, 10 communities`).

---

## 4. Files Created
- [`backend/tests/security_audit.test.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/tests/security_audit.test.js) — 4 Vitest + Supertest security hardening specs (mass assignment, NoSQL sanitization, cross-tenant IDOR matrix, all-9-model `syncIndexes()`).
- [`docs/member-2-backend-db/reports/PHASE_10_REPORT.md`](file:///Users/abdulrehman/Desktop/Techno%20verse/docs/member-2-backend-db/reports/PHASE_10_REPORT.md) — This execution report.

---

## 5. Files Modified
- [`backend/src/validators/questionValidator.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/validators/questionValidator.js#L82-L87) — Added `.strict()` to `questionIdParamSchema.params`.
- [`backend/src/validators/adminUserValidator.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/validators/adminUserValidator.js#L3-L7) — Added `.strict()` to `objectIdParam`.
- [`backend/src/validators/attemptValidator.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/validators/attemptValidator.js#L13-L26) — Added `startAttemptSchema` and `submitAttemptSchema` enforcing strict empty-or-absent request bodies.
- [`backend/src/routes/candidateExamRoutes.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/routes/candidateExamRoutes.js#L18) — Bound `validate(startAttemptSchema)` to `POST /api/candidate/exams/:id/start`.
- [`backend/src/routes/attemptRoutes.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/routes/attemptRoutes.js#L60) — Bound `validate(submitAttemptSchema)` to `POST /api/attempts/:id/submit`.
- [`backend/src/scripts/seed.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/scripts/seed.js) — Expanded from 8-user seed to full idempotent demo dataset across all 9 collections (13 users, 36 questions, 4 lifecycle exams, 23 enrollments, 4 graded attempts, `Announcement`, `Incident`, `AuditLog`, `ReportVerification`).
- [`README.md`](file:///Users/abdulrehman/Desktop/Techno%20verse/README.md) — Replaced stub heading with complete project setup, env configuration, demo credentials, and Innovation 5.2 + 5.3 documentation.
- [`BACKEND.md`](file:///Users/abdulrehman/Desktop/Techno%20verse/BACKEND.md#L333) — Updated `Seed Script (npm run seed)` description to reflect the expanded demo dataset.
- [`graphify-out/GRAPH_REPORT.md`](file:///Users/abdulrehman/Desktop/Techno%20verse/graphify-out/GRAPH_REPORT.md) (gitignored) — Updated AST code graph to `416 nodes, 1343 edges, 10 communities`.

*(Verified untouched via `git status --short`: `frontend/`, `backend/src/services/aiService.js`, `backend/src/routes/aiRoutes.js`.)*

---

## 6. Database Changes
- No schema shape changes; added `syncIndexes()` verification test across all 9 models (`User`, `Question`, `Exam`, `Enrollment`, `Attempt`, `Incident`, `Announcement`, `AuditLog`, `ReportVerification`) against isolated local `mongod`.
- Verified idempotent demo seeding on isolated `mongod` (`sems_demo`), populating `users: 13`, `questions: 36`, `exams: 4`, `enrollments: 23`, `attempts: 4`, `incidents: 1`, `announcements: 1`, `auditLogs: 5`, `verifications: 4` with zero duplicate creation on a second consecutive run.

---

## 7. APIs Implemented / Audited
No new endpoints added in Phase 10; hardened validation contracts across existing endpoints:
- `POST /api/candidate/exams/:id/start` — Now rejects unexpected request body fields (such as `{ isSandbox: true }`) with `400 VALIDATION_ERROR` while still accepting empty `undefined` or `{}` payloads.
- `POST /api/attempts/:id/submit` — Now rejects unexpected request body fields (such as `{ totalScore: 100 }`) with `400 VALIDATION_ERROR` while still accepting empty `undefined` or `{}` payloads.
- Verified parameter `.strict()` enforcement across all 11 validator modules in `backend/src/validators/`.

---

## 8. Dependencies and Tools Used
- No new npm dependencies installed.
- **Ephemeral Test & Seed Runtime**: Isolated local `/opt/homebrew/bin/mongod` instances on `127.0.0.1:27117` (`sems_test`) and `127.0.0.1:27118` (`sems_demo`) cleaned up cleanly via shell `trap`.
- **Graphify (`0.9.92`)**: Updated `graphify-out/` via `graphify update backend/src` (`79 files`, `416 nodes`, `1343 edges`, `10 communities`, verified `seedDemoData()` with `13` connections).
- **Skills Engaged**: `ponytail`, `ponytail-audit`, `graphify`, `verification-before-completion`.

---

## 9. Testing Results

| Check / Test | Command | Expected | Actual | Status |
|---|---|---|---|---|
| 5-Check Security Audit: Check 1 (Secret Leak Scan) | `grep -rnE "(mongodb\+srv://\|sk-or-v1-\|sk-or-\|BEGIN (RSA \|EC )?PRIVATE KEY)" backend/src backend/tests BACKEND.md README.md` | Zero hardcoded secret matches | `ZERO_SECRET_MATCHES` | PASS |
| Check 2 (PII & Key Flow Audit) | Audited `passwordHash`, `tokenVersion`, `correctOptionIds`, `verifyReportCode` masking | Sensitive fields have `select: false`/omitted DTOs; public verify masks name & rollNo | Verified in source & Supertest | PASS |
| Check 3 (Production Config Audit) | Inspected `app.js`, `errorMiddleware.js`, `rateLimitMiddleware.js`, `validateEnv.js` | `helmet()`, CORS allow-list, `1mb` JSON limit, `authLimiter` (5/min) + `apiLimiter` (120/min), prod stack/500 redaction | Verified in source & `foundation.test.js` | PASS |
| Check 4 (Auth, RBAC & Route Audit) | Audited all 14 route files under `backend/src/routes/` | Only `/health`, `/time`, `/auth/login`, `/auth/register`, `/verify/:code`, `/ai/test` lack `requireAuth`; every protected route uses `requireRole` | Verified across all route files | PASS |
| Check 5 (Attacker-Perspective Audit) | Audited Express `^4.21.2`, Zod `.strict()`, `sanitizeMiddleware`, IDOR ownership, `isSandbox: false` filters | Mass assignment returns `400 VALIDATION_ERROR`; `$`/`.` keys stripped; IDOR returns `403 FORBIDDEN`; analytics exclude sandboxes | Verified in source & `security_audit.test.js` | PASS |
| Full Vitest Suite (9 suites, 51 tests) | `(cd backend && MONGODB_TEST_URI="mongodb://127.0.0.1:27117/sems_test" npm test)` | `9` test files, `51` tests pass, exit 0 | `Test Files 9 passed (9)`, `Tests 51 passed (51)` in `19.99s` | PASS |
| Double Idempotent Seed Run | `MONGO_URI="mongodb://127.0.0.1:27118/sems_demo" ... npm run seed` executed twice | Run 1 populates all collections; Run 2 creates `0` duplicates | Run 1: `13` users, `36` questions, `4` exams, `23` enrollments, `4` attempts, code `SEMS-6606C5FF49`; Run 2: `0 created` across all entities | PASS |

### Full `npm test` Output Summary
```text
 ✓ tests/security_audit.test.js (4 tests) 2514ms
 ✓ tests/reports_innovation.test.js (3 tests) 2100ms
 ✓ tests/auth.test.js (7 tests) 1835ms
 ✓ tests/grading_monitoring.test.js (5 tests) 1424ms
 ✓ tests/secondary_part1.test.js (5 tests) 1028ms
 ✓ tests/attempts.test.js (7 tests) 996ms
 ✓ tests/exams.test.js (6 tests) 955ms
 ✓ tests/questions.test.js (7 tests) 801ms
 ✓ tests/foundation.test.js (7 tests) 39ms

 Test Files  9 passed (9)
      Tests  51 passed (51)
   Start at  14:20:47
   Duration  19.99s (tests 61%, import 38%, transform 1%)
```

### Double-Run `npm run seed` Output & Collection Counts
```text
=== SEED RUN 1 ===
[Seed] Users: 13 created, 0 existing (13 total)
[Seed] Questions: 36 created, 0 existing (36 total)
[Seed] Exams: 4 created, 0 existing (4 total)
[Seed] Enrollments: 23 created, 0 existing
[Seed] Completed Attempts: 4 created, 0 existing
[Seed] Demo Verification Code (/api/verify/SEMS-6606C5FF49): SEMS-6606C5FF49

=== SEED RUN 2 (IDEMPOTENCY CHECK) ===
[Seed] Users: 0 created, 13 existing (13 total)
[Seed] Questions: 0 created, 36 existing (36 total)
[Seed] Exams: 0 created, 4 existing (4 total)
[Seed] Enrollments: 0 created, 23 existing
[Seed] Completed Attempts: 0 created, 4 existing
[Seed] Demo Verification Code (/api/verify/SEMS-6606C5FF49): SEMS-6606C5FF49

DB Counts: {"users":13,"questions":36,"exams":4,"enrollments":23,"attempts":4,"incidents":1,"announcements":1,"auditLogs":5,"verifications":4}
```

---

## 10. Bugs Discovered and How Each Was Resolved
1. **Unstrict Param Schemas (`questionValidator.js`, `adminUserValidator.js`)**: `questionIdParamSchema.params` and `objectIdParam` lacked `.strict()`. Fixed by chaining `.strict()` on both.
2. **Unvalidated POST Bodies on `/start` and `/submit` (`attemptValidator.js`)**: `POST /api/candidate/exams/:id/start` and `POST /api/attempts/:id/submit` validated only `:id` route params, so spurious JSON fields were ignored instead of returning `400 VALIDATION_ERROR`. Added `startAttemptSchema` and `submitAttemptSchema` using `emptyStrictBodySchema`, rejecting unexpected payload keys with `400 VALIDATION_ERROR` while still accepting empty or `{}` requests.
3. **Graphify Output Sync Path (`graphify update`)**: `graphify update backend/src` writes output under `backend/src/graphify-out/` rather than root `graphify-out/`. Synced regenerated artifacts into root `graphify-out/` and removed `backend/src/graphify-out/` so workspace hygiene and graph queries stay current.

---

## 11. Verification Checklist

| Acceptance Criterion | Status | Evidence |
|---|---|---|
| 5-check security & technical quality audit executed and all findings fixed | PASS | Zero secret matches; param/body `.strict()` gaps patched; RBAC, PII, prod config, and IDOR verified |
| `seed.js` idempotently creates 13 users, ~36 questions, 4 lifecycle exams, graded attempts, and verification code without wiping DB | PASS | Seed run 1 created `13` users, `36` questions, `4` exams, `23` enrollments, `4` attempts, code `SEMS-6606C5FF49`; run 2 created `0` |
| `security_audit.test.js` verifies mass assignment, NoSQL operator stripping, IDOR, and `syncIndexes()` across all 9 models | PASS | `4/4` tests passed (`2514ms`) |
| Full `npm test` passes across all 9 suites | PASS | `9/9` files, `51/51` tests passed (`19.99s`) |
| `README.md`, `BACKEND.md`, and `graphify-out/` updated | PASS | [`README.md`](file:///Users/abdulrehman/Desktop/Techno%20verse/README.md), [`BACKEND.md`](file:///Users/abdulrehman/Desktop/Techno%20verse/BACKEND.md), and `graphify-out/` (`416 nodes, 1343 edges`) updated cleanly |

---

## 12. Remaining Work, Blockers, Known Limitations
- **Missing `backend/.env` / Atlas URI**: `backend/.env` is not present on disk, so Phase 10 integration suites and `npm run seed` were verified against ephemeral local `mongod` instances rather than a persistent MongoDB Atlas cluster. Team operators must populate `backend/.env` from [`backend/.env.example`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/.env.example) before running against Atlas.
- **Standalone Member Modules Untouched**: `frontend/`, `backend/src/services/aiService.js`, and `backend/src/routes/aiRoutes.js` remain unmodified per Member 2 ownership scope (`AI_GUIDELINES.md` / `/api/ai` logic was not modified or audited beyond checking public `/api/ai/test` mount).
- **Git Branch**: Workspace remains on `main` with no commits executed in this phase.

---

## 13. Impact on Other Members
- **Member 1 (`frontend/`)**: Can immediately log into seeded accounts (`admin@sems.edu`, `examiner1@sems.edu`, `examiner2@sems.edu`, `candidate1@sems.edu`–`candidate10@sems.edu` with `Pass1234!`) and demo Completed, Ongoing (`poolMode`), Upcoming, and Draft flows once `backend/.env` + `npm run seed` run against shared MongoDB. Note: `POST /api/candidate/exams/:id/start` and `POST /api/attempts/:id/submit` strictly require empty (`undefined` or `{}`) request bodies.
- **Member 3 (`feat/ai`)**: [`backend/src/services/aiService.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/services/aiService.js) and [`backend/src/routes/aiRoutes.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/routes/aiRoutes.js) remain completely untouched.

---

## 14. Final Status
**COMPLETED** *(`51/51` Vitest + Supertest tests passing across all 9 suites, double-run idempotent seed verified, and 5-check security audit PASS against isolated local `mongod`.)*

---

## 15. Next Phase Recommendation
Core backend Phases 1–10 are complete. Next suggested action: populate `backend/.env` with real MongoDB Atlas `MONGO_URI`, `JWT_SECRET`, and `VERIFY_HMAC_SECRET`, run `npm run seed`, and smoke-test live endpoints with Member 1 (`frontend/`) integration (wait for user instruction before creating branches or committing).

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
    ├── secondary_part1.test.js
    └── security_audit.test.js
```

### B. Key Technical Decisions
- Reused `buildOptionSubdocs`, `buildFrozenPaper`, `autoGradeAttempt`, `gradeManualQuestion`, and `getOrCreateVerification` inside [`seed.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/scripts/seed.js) so seeded exams, frozen papers, grades, and HMAC verification codes exercise exact production code paths rather than hand-crafted DB shortcuts.
- Used `z.preprocess((val) => (val === undefined ? {} : val), z.object({}).strict())` for `startAttemptSchema` and `submitAttemptSchema` so bodiless `POST` and `{}` calls continue working seamlessly while injected payload properties trigger `400 VALIDATION_ERROR`.

### C. Test Summary
- `(cd backend && MONGODB_TEST_URI="mongodb://127.0.0.1:27117/sems_test" npm test)` → **51 passed / 51 total** across 9 suites (`security_audit` 4/4, `reports_innovation` 3/3, `auth` 7/7, `grading_monitoring` 5/5, `secondary_part1` 5/5, `attempts` 7/7, `exams` 6/6, `questions` 7/7, `foundation` 7/7; `19.99s`).
- `npm run seed` (executed twice on `127.0.0.1:27118/sems_demo`) → Run 1 created `13` users, `36` questions, `4` exams, `23` enrollments, `4` attempts, code `SEMS-6606C5FF49`; Run 2 created `0` duplicates.

### D. Git Status Summary
- **Branch**: `main`.
- **Modified**: `.gitignore`, `BACKEND.md`, `README.md`, `backend/.env.example`, `backend/package-lock.json`, `backend/package.json`, `backend/src/config/db.js`, `backend/src/controllers/authController.js`, `backend/src/middleware/{authMiddleware,errorMiddleware,rateLimitMiddleware}.js`, `backend/src/models/User.js`, `backend/src/routes/{authRoutes,healthRoutes}.js`, `backend/src/server.js`, `backend/src/utils/{generateToken,validateEnv}.js`.
- **Untracked**: `backend/src/app.js`, `backend/src/controllers/{adminUserController,attemptController,enrollmentController,examController,gradingController,importController,meController,monitoringController,questionController,reportController}.js`, `backend/src/middleware/{notFoundMiddleware,rbacMiddleware,validate}.js`, `backend/src/models/{Announcement,Attempt,AuditLog,Enrollment,Exam,Incident,Question,ReportVerification}.js`, `backend/src/routes/{adminRoutes,attemptRoutes,candidateDirectoryRoutes,candidateExamRoutes,candidateResultRoutes,examRoutes,incidentRoutes,index,meRoutes,questionRoutes,verifyRoutes}.js`, `backend/src/scripts/`, `backend/src/services/{adminUserService,attemptService,attemptSweeper,authService,autoGrader,enrollmentService,examService,fairnessService,gradingService,importService,monitoringService,questionService,reportService}.js`, `backend/src/utils/{ApiError,asyncHandler,examStatus,paperBuilder,response,sanitize,scoring,time}.js`, `backend/src/validators/`, `backend/tests/`, `backend/vitest.config.js`, `docs/`, plus pre-existing `files/`, `TechnoVerse_WebeThon_Master_Prompt.md`, `Web-e-Thon Problem Statement.pdf`. (`graphify-out/` gitignored.)

### E. Environment Variable NAMES Present
- `backend/.env`: **DOES NOT EXIST**.
- `backend/.env.example`: `PORT`, `NODE_ENV`, `MONGO_URI`, `MONGODB_TEST_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `CLIENT_URL`, `VERIFY_HMAC_SECRET`, `ALLOW_SELF_REGISTER`, `RECONNECT_GRACE_SECONDS`, `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, `OPENROUTER_SITE_URL`, `OPENROUTER_SITE_NAME`, `USE_MOCK_AI`.
