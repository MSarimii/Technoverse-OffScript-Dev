# PHASE EXECUTION REPORT

## 1. Phase Information
- **Phase Number**: Phase 10b (Fast)
- **Phase Name**: Standout Features (5.4 Disputes, 5.1 Single-Session Guard, 4.5 Ambiguous Question Flag & Formula-Safe CSV Export)
- **Date**: 2026-11-27
- **Final Status**: COMPLETED (`55/55` Vitest + Supertest tests passing across all 10 suites against isolated local `mongod`; `graphify-out/` updated to `84 files, 442 nodes, 1454 edges`; `backend/.env` remains absent on disk)

---

## 2. Objective
Implement four high-impact backend features without breaking any existing contract:
1. **5.4 Trust & Dispute Resolution** (`Dispute` model, candidate submission post-publication, examiner resolution with optional score adjustment, `ReportVerification` HMAC refresh, and `AuditLog`).
2. **5.1 Privacy-Respecting Single-Session Guard** (`Attempt.activeSessionId` tracked via optional `x-session-id` header across start/autosave/heartbeat, automatic neutral `multiple_sessions` indicator without locking out legitimate reconnects, plus `connectionGapCount` in monitor).
3. **4.5 Ambiguous Question Auto-Flag** (`flaggedAmbiguous` + `ambiguityReason` on `GET /api/exams/:id/questions/analytics`).
4. **3.8 / 4.2 Formula-Safe CSV Results Export** (`GET /api/exams/:id/results.csv`).

---

## 3. Implementation Summary
1. **5.4 Trust & Dispute Resolution**:
   - Created [`Dispute.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/models/Dispute.js) with unique `{ attemptId: 1, questionId: 1 }` and `{ examId: 1, status: 1 }` indexes plus `serializeDispute`.
   - Created [`disputeValidator.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/validators/disputeValidator.js) with `.strict()` Zod schemas (`createDisputeSchema`, `listExamDisputesQuerySchema`, `resolveDisputeSchema`).
   - Created [`disputeService.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/services/disputeService.js):
     - `createDispute` checks ownership (`C`), non-sandbox & finalized attempt (`409`), published exam (`403 RESULTS_NOT_PUBLISHED`), paper question membership (`404`), and duplicate guard (`409 CONFLICT`).
     - `listAttemptDisputes` and `listExamDisputes` enforce attempt/exam ownership and hydrate candidate + question summaries.
     - `resolveDispute` checks exam ownership (`assertExamAccess`), validates optional `adjustedScore` against `0..paperItem.marks` (`400 SCORE_OUT_OF_RANGE`), updates `attempt.grades`, recomputes `totalScore`/`percentage`/`gradingStatus`, updates any existing `ReportVerification` HMAC/snapshot via `getOrCreateVerification`, and logs `AuditLog('resolve_dispute')`.
   - Created [`disputeController.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/controllers/disputeController.js) and [`disputeRoutes.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/routes/disputeRoutes.js), mounted in [`routes/index.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/routes/index.js), [`attemptRoutes.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/routes/attemptRoutes.js), and [`examRoutes.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/routes/examRoutes.js).
2. **5.1 Single-Session Guard & Monitor Network Context**:
   - Added `activeSessionId` (`select: false`) to [`Attempt.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/models/Attempt.js#L112) (never returned in `serializeAttemptForCandidate`).
   - Added `extractSessionId(req)` reading `x-session-id` header in [`attemptController.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/controllers/attemptController.js#L17-L22), passing `sessionId` into `startOrResumeAttempt`, `autosaveAnswers`, and `recordHeartbeat` without affecting empty-body strict validation on `/start` and `/submit`.
   - Added `syncAttemptSession` in [`attemptService.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/services/attemptService.js#L40-L60) to initialize/update `activeSessionId` and record a neutral `multiple_sessions` indicator (`'Session switched to another tab or device'`, respecting the 50-incident cap) on session change without blocking reconnects.
   - Added `connectionGapCount: a.connectionGaps?.length || 0` per row in [`monitoringService.getExamMonitor`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/services/monitoringService.js#L68).
3. **4.5 Ambiguous Question Auto-Flag**:
   - Enhanced [`gradingService.getExamQuestionAnalytics`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/services/gradingService.js#L543-L695) to compute `flaggedAmbiguous` and `ambiguityReason`: for questions with `totalAttempts >= 2` and non-null `correctRate`, flags `true` when `correctRate < 0.25` (`'Low overall accuracy (<25%)'`) or when top-half total exam scorers average lower on that question than bottom-half scorers (`'Negative item discrimination'`).
4. **3.8 / 4.2 Formula-Safe CSV Results Export**:
   - Added `sanitizeCsvCell` (prefixing leading `=`, `+`, `-`, `@`, `\t`, `\r` characters with `'`) and `exportExamResultsCsv` in [`reportService.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/services/reportService.js#L305-L359), [`getExamResultsCsvController`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/controllers/reportController.js#L41-L45), and `GET /api/exams/:id/results.csv` in [`examRoutes.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/routes/examRoutes.js#L145).
5. **Tests, Docs & Graphify**:
   - Created [`backend/tests/standout_features.test.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/tests/standout_features.test.js) (4 integration tests), updated [`BACKEND.md`](file:///Users/abdulrehman/Desktop/Techno%20verse/BACKEND.md), and rebuilt `graphify-out/` (`84 files, 442 nodes, 1454 edges, 11 communities`).

---

## 4. Files Created
- [`backend/src/models/Dispute.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/models/Dispute.js) — `Dispute` schema, indexes, and `serializeDispute`.
- [`backend/src/validators/disputeValidator.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/validators/disputeValidator.js) — `.strict()` dispute submission, query, and resolution validators.
- [`backend/src/services/disputeService.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/services/disputeService.js) — Dispute creation, listing, score recalculation, existing HMAC refresh, and audit logging.
- [`backend/src/controllers/disputeController.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/controllers/disputeController.js) — Dispute HTTP controllers.
- [`backend/src/routes/disputeRoutes.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/routes/disputeRoutes.js) — `/api/disputes/:id/resolve` router.
- [`backend/tests/standout_features.test.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/tests/standout_features.test.js) — 4 Vitest + Supertest specs testing Features 5.4, 5.1, 4.5, and CSV formula export.
- [`docs/member-2-backend-db/reports/PHASE_10B_REPORT.md`](file:///Users/abdulrehman/Desktop/Techno%20verse/docs/member-2-backend-db/reports/PHASE_10B_REPORT.md) — This execution report.

---

## 5. Files Modified
- [`backend/src/models/Attempt.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/models/Attempt.js#L112) — Added `activeSessionId` (`select: false`).
- [`backend/src/controllers/attemptController.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/controllers/attemptController.js#L17-L71) — Forwarded optional `x-session-id` header into `startOrResumeAttempt`, `autosaveAnswers`, and `recordHeartbeat`.
- [`backend/src/services/attemptService.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/services/attemptService.js) — Implemented `syncAttemptSession` cleanly across attempt lifecycle without blocking reconnects.
- [`backend/src/services/monitoringService.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/services/monitoringService.js#L68) — Added `connectionGapCount` per attempt row in `getExamMonitor`.
- [`backend/src/services/gradingService.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/services/gradingService.js#L543-L695) — Added `flaggedAmbiguous` and `ambiguityReason` auto-flagging in `getExamQuestionAnalytics`.
- [`backend/src/services/reportService.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/services/reportService.js#L305-L359) & [`backend/src/controllers/reportController.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/controllers/reportController.js#L41-L45) — Implemented `sanitizeCsvCell` and `exportExamResultsCsv`.
- [`backend/src/routes/attemptRoutes.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/routes/attemptRoutes.js), [`backend/src/routes/examRoutes.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/routes/examRoutes.js), & [`backend/src/routes/index.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/routes/index.js) — Mounted `/api/attempts/:id/disputes`, `/api/exams/:id/disputes`, `/api/disputes/:id/resolve`, and `/api/exams/:id/results.csv`.
- [`BACKEND.md`](file:///Users/abdulrehman/Desktop/Techno%20verse/BACKEND.md) — Documented `Dispute`, `Attempt.activeSessionId`, `connectionGapCount`, ambiguity flags, CSV export, and dispute routes.
- [`graphify-out/GRAPH_REPORT.md`](file:///Users/abdulrehman/Desktop/Techno%20verse/graphify-out/GRAPH_REPORT.md) (gitignored) — Updated graph across 84 files (`442 nodes, 1454 edges`).

*(Verified untouched via `git status --short`: `frontend/`, `backend/src/services/aiService.js`, `backend/src/routes/aiRoutes.js`.)*

---

## 6. Database Changes
- **`Dispute` Collection (`disputes`)**: Added schema with unique `{ attemptId: 1, questionId: 1 }` and `{ examId: 1, status: 1 }` indexes (`Dispute.syncIndexes()` verified).
- **`Attempt` Collection (`attempts`)**: Added optional `activeSessionId` (`String`, `default: null`, `select: false`).

---

## 7. APIs Implemented

| Method | Path | Access | Behavior | Verified? |
|---|---|---|---|---|
| `POST` | `/api/attempts/:id/disputes` | Candidate (owner) | Requires finalized non-sandbox attempt & published exam; creates `Dispute` (`201`), blocks duplicates (`409`) | Yes (Supertest) |
| `GET` | `/api/attempts/:id/disputes` | Candidate (owner) / Examiner (owner) / Admin | Lists disputes submitted for the attempt | Yes (Supertest) |
| `GET` | `/api/exams/:id/disputes` | Examiner (owner) / Admin | Lists exam disputes with optional `?status=` filter, candidate details & question summary | Yes (Supertest) |
| `PATCH` | `/api/disputes/:id/resolve` | Examiner (owner) / Admin | Accepts/rejects dispute; optionally adjusts item score (`400 SCORE_OUT_OF_RANGE` check), recomputes totals, refreshes existing HMAC verification, and logs audit entry | Yes (Supertest) |
| `GET` | `/api/exams/:id/results.csv` | Examiner (owner) / Admin | Exports formula-safe (`text/csv`) results across non-sandbox attempts, prefixing formula triggers with `'` | Yes (Supertest) |

---

## 8. Dependencies and Tools Used
- No new npm dependencies added.
- **Ephemeral Test Runtime**: Isolated local `/opt/homebrew/bin/mongod` on `127.0.0.1:27119` (`sems_test`), cleaned up via `trap`.
- **Graphify (`0.9.92`)**: Queried before coding and updated across `backend/src` (`84 files`, `442 nodes`, `1454 edges`, `11 communities`; verified `resolveDispute()` with `11` connections).
- **Skills Engaged**: `ponytail`, `graphify`, `verification-before-completion`.

---

## 9. Testing Results

| Test | Command | Expected | Actual | Status |
|---|---|---|---|---|
| Full Vitest Suite (all 10 test files) | `(cd backend && MONGODB_TEST_URI="mongodb://127.0.0.1:27119/sems_test" npm test)` | All 55 tests pass across 10 files, exit 0 | `Test Files 10 passed (10)`, `Tests 55 passed (55)` in `23.64s` | PASS |
| Graphify Explain | `graphify explain "resolveDispute"` | Maps Phase 10b dispute resolver cleanly | `resolveDispute()` mapped with `11` connections | PASS |

### Full `npm test` Output Summary
```text
 ✓ tests/standout_features.test.js (4 tests) 2898ms
 ✓ tests/security_audit.test.js (4 tests) 2183ms
 ✓ tests/reports_innovation.test.js (3 tests) 2385ms
 ✓ tests/auth.test.js (7 tests) 1859ms
 ✓ tests/grading_monitoring.test.js (5 tests) 1078ms
 ✓ tests/secondary_part1.test.js (5 tests) 1012ms
 ✓ tests/attempts.test.js (7 tests) 979ms
 ✓ tests/exams.test.js (6 tests) 981ms
 ✓ tests/questions.test.js (7 tests) 770ms
 ✓ tests/foundation.test.js (7 tests) 40ms

 Test Files  10 passed (10)
      Tests  55 passed (55)
   Start at  14:38:55
   Duration  23.64s (tests 63%, import 37%, transform 1%)
```

---

## 10. Bugs Discovered and How Each Was Resolved
- None — all 10 Vitest suites (`55/55` tests) passed cleanly on the first run.

---

## 11. Verification Checklist

| Acceptance Criterion | Status | Evidence |
|---|---|---|
| 5.4 Disputes submit, enforce publish/duplicate guards, resolve with score adjustment, refresh existing HMAC verification, and log audit entry | PASS | Verified in `standout_features.test.js` test 1. |
| 5.1 Single-session `x-session-id` tracks switches via `multiple_sessions` without blocking reconnects; monitor exposes `connectionGapCount` | PASS | Verified in `standout_features.test.js` test 2. |
| 4.5 Question analytics auto-flags `<25%` accuracy and negative item discrimination | PASS | Verified in `standout_features.test.js` test 3. |
| 3.8 / 4.2 Formula-safe CSV export returns `text/csv`, excludes sandbox attempts, and neutralizes `=SUM(A1)` and `-1+1@evil` with `'` | PASS | Verified in `standout_features.test.js` test 4. |
| `npm test` passes all 10 suites, `BACKEND.md` & `graphify-out/` updated | PASS | `10 passed (10)`, `55 passed (55)`, `BACKEND.md` updated, `graphify-out/` rebuilt (`442 nodes, 1454 edges`). |

---

## 12. Remaining Work, Blockers, Known Limitations
- **Missing `backend/.env`**: `backend/.env` remains absent on disk, so tests ran against an isolated local `mongod` instance rather than Atlas.
- **Session Guard Opt-In Header**: `activeSessionId` tracking activates when clients send the `x-session-id` header (`frontend/` will need to send a per-tab UUID if enabling 5.1 UI alerts).
- **Git Branch**: Workspace remains on `main`.

---

## 13. Impact on Other Members
- **Member 1 (`frontend/`)**: Can integrate dispute submission/resolution endpoints, CSV download button (`GET /api/exams/:id/results.csv`), `flaggedAmbiguous`/`ambiguityReason` badges in question analytics, `connectionGapCount` in monitor tables, and per-tab `x-session-id` headers per updated [`BACKEND.md`](file:///Users/abdulrehman/Desktop/Techno%20verse/BACKEND.md).
- **Member 3 (`feat/ai`)**: `aiService.js` and `aiRoutes.js` remain untouched.

---

## 14. Final Status
**COMPLETED** *(`55/55` Vitest + Supertest tests passing across all 10 suites against isolated local `mongod`.)*

---

## 15. Next Phase Recommendation
Wait for user review and instruction before any next phase, branch operation, or commit (do not start Phase 11 automatically).

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
│   ├── controllers/ (adminUserController.js, attemptController.js, authController.js, disputeController.js, enrollmentController.js, examController.js, gradingController.js, importController.js, meController.js, monitoringController.js, questionController.js, reportController.js)
│   ├── middleware/ (authMiddleware.js, errorMiddleware.js, notFoundMiddleware.js, rateLimitMiddleware.js, rbacMiddleware.js, validate.js)
│   ├── models/ (Announcement.js, Attempt.js, AuditLog.js, Dispute.js, Enrollment.js, Exam.js, Incident.js, Question.js, ReportVerification.js, User.js)
│   ├── routes/ (adminRoutes.js, aiRoutes.js, attemptRoutes.js, authRoutes.js, candidateDirectoryRoutes.js, candidateExamRoutes.js, candidateResultRoutes.js, disputeRoutes.js, examRoutes.js, healthRoutes.js, incidentRoutes.js, index.js, meRoutes.js, questionRoutes.js, verifyRoutes.js)
│   ├── scripts/ (seed.js)
│   ├── services/ (adminUserService.js, aiService.js, attemptService.js, attemptSweeper.js, authService.js, autoGrader.js, disputeService.js, enrollmentService.js, examService.js, fairnessService.js, gradingService.js, importService.js, monitoringService.js, questionService.js, reportService.js)
│   ├── utils/ (ApiError.js, asyncHandler.js, examStatus.js, generateToken.js, paperBuilder.js, response.js, sanitize.js, scoring.js, time.js, validateEnv.js)
│   └── validators/ (adminUserValidator.js, attemptValidator.js, authValidator.js, disputeValidator.js, enrollmentValidator.js, examValidator.js, gradingValidator.js, importValidator.js, meValidator.js, monitoringValidator.js, questionValidator.js, reportValidator.js)
└── tests
    ├── attempts.test.js
    ├── auth.test.js
    ├── exams.test.js
    ├── foundation.test.js
    ├── grading_monitoring.test.js
    ├── questions.test.js
    ├── reports_innovation.test.js
    ├── secondary_part1.test.js
    ├── security_audit.test.js
    └── standout_features.test.js
```

### B. Key Technical Decisions
- Re-used `computeAttemptTotals`, `round2`, `autoGradeAttempt`, `assertExamAccess`, and `getOrCreateVerification` inside [`disputeService.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/services/disputeService.js) to keep dispute resolution score adjustments and HMAC refreshes strictly consistent with manual grading.
- Read `x-session-id` from HTTP headers rather than request bodies in [`attemptController.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/controllers/attemptController.js) so `startAttemptSchema`'s empty-body `.strict()` security validation remained completely intact.

### C. Test Summary
- `(cd backend && MONGODB_TEST_URI="mongodb://127.0.0.1:27119/sems_test" npm test)` → **55 passed / 55 total** across 10 suites (`standout_features` 4/4, `security_audit` 4/4, `reports_innovation` 3/3, `auth` 7/7, `grading_monitoring` 5/5, `secondary_part1` 5/5, `attempts` 7/7, `exams` 6/6, `questions` 7/7, `foundation` 7/7; `23.64s`).

### D. Git Status Summary
- **Branch**: `main`.
- **Modified**: `.gitignore`, `BACKEND.md`, `README.md`, `backend/.env.example`, `backend/package-lock.json`, `backend/package.json`, `backend/src/config/db.js`, `backend/src/controllers/authController.js`, `backend/src/middleware/{authMiddleware,errorMiddleware,rateLimitMiddleware}.js`, `backend/src/models/User.js`, `backend/src/routes/{authRoutes,healthRoutes}.js`, `backend/src/server.js`, `backend/src/utils/{generateToken,validateEnv}.js`.
- **Untracked**: `backend/src/app.js`, `backend/src/controllers/{adminUserController,attemptController,disputeController,enrollmentController,examController,gradingController,importController,meController,monitoringController,questionController,reportController}.js`, `backend/src/middleware/{notFoundMiddleware,rbacMiddleware,validate}.js`, `backend/src/models/{Announcement,Attempt,AuditLog,Dispute,Enrollment,Exam,Incident,Question,ReportVerification}.js`, `backend/src/routes/{adminRoutes,attemptRoutes,candidateDirectoryRoutes,candidateExamRoutes,candidateResultRoutes,disputeRoutes,examRoutes,incidentRoutes,index,meRoutes,questionRoutes,verifyRoutes}.js`, `backend/src/scripts/`, `backend/src/services/{adminUserService,attemptService,attemptSweeper,authService,autoGrader,disputeService,enrollmentService,examService,fairnessService,gradingService,importService,monitoringService,questionService,reportService}.js`, `backend/src/utils/{ApiError,asyncHandler,examStatus,paperBuilder,response,sanitize,scoring,time}.js`, `backend/src/validators/`, `backend/tests/`, `backend/vitest.config.js`, `docs/`, plus pre-existing `files/`, `TechnoVerse_WebeThon_Master_Prompt.md`, `Web-e-Thon Problem Statement.pdf`. (`graphify-out/` gitignored.)

### E. Environment Variable NAMES Present
- `backend/.env`: **DOES NOT EXIST**.
- `backend/.env.example`: `PORT`, `NODE_ENV`, `MONGO_URI`, `MONGODB_TEST_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `CLIENT_URL`, `VERIFY_HMAC_SECRET`, `ALLOW_SELF_REGISTER`, `RECONNECT_GRACE_SECONDS`, `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, `OPENROUTER_SITE_URL`, `OPENROUTER_SITE_NAME`, `USE_MOCK_AI`.
