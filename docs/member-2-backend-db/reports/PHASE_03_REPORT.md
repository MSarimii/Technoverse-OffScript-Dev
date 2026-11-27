# PHASE EXECUTION REPORT

## 1. Phase Information
- **Phase Number**: Phase 3 (03)
- **Phase Name**: Question Bank
- **Date**: 2026-11-27
- **Final Status**: COMPLETED (21/21 Vitest + Supertest tests passing against isolated local `mongod` `v8.3.7` via `MONGODB_TEST_URI`; `backend/.env` Atlas URI remains absent on disk)

---

## 2. Objective
Implement a modular Question Bank supporting `single`, `multiple`, and `written` question types with marking schemes, strict per-type Zod validation, ownership-enforced CRUD (`examiner` own vs `admin` all, `candidate` denied `403`), soft archiving, distinct topic listing, filtering/pagination, Vitest + Supertest verification via TDD (`RED -> GREEN`), updated `BACKEND.md`, and refreshed `graphify-out/`.

---

## 3. Implementation Summary
1. **TDD Workflow (`RED -> GREEN`)**:
   - Queried `graphify-out/` (`Map routes/index.js, authMiddleware.js, rbacMiddleware.js, and validate.js`) and read `routes/index.js` + `tests/auth.test.js`.
   - Wrote [`backend/tests/questions.test.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/tests/questions.test.js) first and verified **RED** (failed on missing `../src/models/Question.js`).
2. **`Question` Model ([`backend/src/models/Question.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/models/Question.js))**:
   - Fields: `createdBy` (ref `User`, required), `type` (`single|multiple|written`), `text` (trim, min 3), `options` (`[{ _id, text }]`), `correctOptionIds` (`[ObjectId]`, `select: false`), `topic`, `difficulty` (`easy|medium|hard`), `marks` (min `0.25`), `scheme` (`{ mode: 'all_or_nothing'|'partial', negativeMarks: >= 0 }`), `rubric`, `explanation`, `isArchived` (default `false`), `timestamps`.
   - Indexes: `{ createdBy: 1, topic: 1, difficulty: 1 }`, text index on `text`, `{ isArchived: 1 }`.
   - Exported `serializeQuestion(q)` DTO for examiner/admin endpoints (mapping option `_id`s to `id` alongside `correctOptionIds`, `rubric`, `explanation`, `scheme`, `isArchived`).
3. **Strict Per-Type Zod Validator ([`backend/src/validators/questionValidator.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/validators/questionValidator.js))**:
   - Exported shared pure `validateQuestionConsistency` used by both `createQuestionSchema` `.superRefine()` and `questionService.updateQuestion()`.
   - Enforces: `single` (2–8 options, 1 unique valid index), `multiple` (2–8 options, >=1 unique valid indexes), `written` (0 options, 0 indexes), `marks >= 0.25`, `negativeMarks >= 0`, `.strict()` payloads and query params.
4. **Shared Sanitizer Helper, Service, Controller & Routes**:
   - Extracted shared `escapeRegex` into [`backend/src/utils/sanitize.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/utils/sanitize.js) and reused it in both [`adminUserService.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/services/adminUserService.js) and [`questionService.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/services/questionService.js) (zero duplicated regex-escaping logic).
   - [`questionService.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/services/questionService.js): Implements ownership-enforced `listQuestions`, `createQuestion`, `getQuestionById`, `updateQuestion` (re-maps `correctOptionIndexes` when options change or stay intact, validates merged consistency), `archiveQuestion` (`isArchived: true`), and `listTopics` (distinct sorted active topics scoped to owner or all for admin).
   - [`questionController.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/controllers/questionController.js) & [`questionRoutes.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/routes/questionRoutes.js): Mounted `/questions` in [`routes/index.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/routes/index.js) behind `requireAuth, requireRole('examiner', 'admin')`, registering `GET /topics` before `GET /:id`.
5. **Docs & Graphify**:
   - Updated [`BACKEND.md`](file:///Users/abdulrehman/Desktop/Techno%20verse/BACKEND.md) with `Question` schema and `/api/questions/*` contract.
   - Rebuilt `graphify-out/` across all 35 files under `backend/src` (`157 nodes, 391 edges, 8 communities`).

---

## 4. Files Created
- [`backend/src/models/Question.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/models/Question.js) — Question Bank Mongoose schema, indexes, and `serializeQuestion` DTO.
- [`backend/src/validators/questionValidator.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/validators/questionValidator.js) — Strict Zod schemas + `validateQuestionConsistency` rule engine.
- [`backend/src/services/questionService.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/services/questionService.js) — Ownership-enforced Question CRUD, topic listing, filtering, pagination, and soft archiving.
- [`backend/src/controllers/questionController.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/controllers/questionController.js) — Thin `asyncHandler` Question Bank controllers.
- [`backend/src/routes/questionRoutes.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/routes/questionRoutes.js) — `/api/questions` routes (`GET /topics` ordered before `GET /:id`).
- [`backend/tests/questions.test.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/tests/questions.test.js) — 7 Vitest + Supertest tests covering all 3 types, validation errors, RBAC, ownership, filtering, topics, and soft archiving.
- [`docs/member-2-backend-db/reports/PHASE_03_REPORT.md`](file:///Users/abdulrehman/Desktop/Techno%20verse/docs/member-2-backend-db/reports/PHASE_03_REPORT.md) — This execution report.

---

## 5. Files Modified
- [`backend/src/utils/sanitize.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/utils/sanitize.js) — Exported shared `escapeRegex` helper.
- [`backend/src/services/adminUserService.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/services/adminUserService.js) — Replaced local `escapeRegex` with shared import from `utils/sanitize.js`.
- [`backend/src/routes/index.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/routes/index.js) — Mounted `/questions` (`questionRoutes`).
- [`BACKEND.md`](file:///Users/abdulrehman/Desktop/Techno%20verse/BACKEND.md) — Documented `Question` schema, `/api/questions/*` endpoints, and updated `backend/src/` tree.
- [`graphify-out/GRAPH_REPORT.md`](file:///Users/abdulrehman/Desktop/Techno%20verse/graphify-out/GRAPH_REPORT.md) (gitignored) — Rebuilt graph across 35 files in `backend/src`.

*(Verified untouched: `frontend/`, `backend/src/services/aiService.js`, `backend/src/routes/aiRoutes.js`.)*

---

## 6. Database Changes
- **`Question` Collection (`questions`)**:
  - Added schema with `createdBy`, `type`, `text`, `options`, `correctOptionIds` (`select: false`), `topic`, `difficulty`, `marks`, `scheme`, `rubric`, `explanation`, `isArchived`, timestamps.
  - Added indexes: `{ createdBy: 1, topic: 1, difficulty: 1 }`, `{ text: 'text' }`, `{ isArchived: 1 }`.
  - No dev/prod data modified; verified solely against isolated local test DB.

---

## 7. APIs Implemented

| Method | Path | Access | Behavior | Verified? |
|---|---|---|---|---|
| `GET` | `/api/questions` | Examiner (own) / Admin (all) | Filter by `topic`, `difficulty`, `type`, `includeArchived` (default `false`), escaped `q`, paginate (`page`, `limit`) | Yes (Supertest) |
| `POST` | `/api/questions` | Examiner / Admin | Validates per-type consistency, builds option `_id`s, maps `correctOptionIndexes` -> `correctOptionIds`, returns `201 { question }` | Yes (Supertest) |
| `GET` | `/api/questions/topics` | Examiner (own) / Admin (all) | Returns sorted distinct active `topics` array | Yes (Supertest) |
| `GET` | `/api/questions/:id` | Examiner (owner) / Admin | Returns `{ question }` with `correctOptionIds`; `403` for non-owner examiner | Yes (Supertest) |
| `PATCH` | `/api/questions/:id` | Examiner (owner) / Admin | Enforces ownership, re-validates combined `(type, options, correctOptionIndexes)`, saves updates | Yes (Supertest) |
| `DELETE` | `/api/questions/:id` | Examiner (owner) / Admin | Enforces ownership, sets `isArchived = true` (soft delete) | Yes (Supertest) |

---

## 8. Dependencies and Tools Used
- **Packages Installed**: None in Phase 3 (reused existing Mongoose, Zod, Express, Vitest, Supertest).
- **Ephemeral Test Runtime**: Local `/opt/homebrew/bin/mongod` (`v8.3.7`) started in conversation scratch dir on `127.0.0.1:27117` for `MONGODB_TEST_URI`, then stopped and cleaned up via `trap`.
- **Graphify (`0.9.92`)**: Queried existing graph before reading; rebuilt across 35 files (`157 nodes, 391 edges, 8 communities`); ran `graphify explain "serializeQuestion()"` confirming 7 connections.
- **Skills Engaged**: `graphify`, `test-driven-development`, `verification-before-completion`, `ponytail`.

---

## 9. Testing Results

| Test | Command | Expected | Actual | Status |
|---|---|---|---|---|
| TDD RED Phase (`questions.test.js`) | `MONGODB_TEST_URI="mongodb://127.0.0.1:27117/sems_test" npx vitest run tests/questions.test.js` | Suite fails before implementation | Failed importing missing `../src/models/Question.js` | PASS (Expected RED) |
| Full Vitest Suite (`foundation` + `auth` + `questions`) | `cd backend && MONGODB_TEST_URI="mongodb://127.0.0.1:27117/sems_test" npm test` | All 21 tests pass, exit 0 | `Test Files 3 passed (3)`, `Tests 21 passed (21)` in `3.37s` | PASS |
| Graphify Query & Explain | `graphify explain "serializeQuestion()"` | Maps `Question.js` connections | 157 nodes, 391 edges, 8 communities; 7 connections verified for `serializeQuestion()` | PASS |

### Full `npm test` Output Summary
```text
> technoverse-backend@1.0.0 test
> vitest run

 RUN  v5.1.2 /Users/abdulrehman/Desktop/Techno verse/backend

 ✓ tests/foundation.test.js (7 tests) 44ms
 ✓ tests/questions.test.js (7 tests) 885ms
 ✓ tests/auth.test.js (7 tests) 1948ms

 Test Files  3 passed (3)
      Tests  21 passed (21)
   Start at  12:41:11
   Duration  3.37s (import 54%, tests 42%, transform 4%)
```

---

## 10. Bugs Discovered and How Each Was Resolved
- None in Phase 3 implementation (`questions.test.js` passed all 7 tests immediately once implemented; also removed redundant `escapeRegex` duplication between `adminUserService.js` and `questionService.js` via `utils/sanitize.js`, and cleaned up stray `backend/src/graphify-out` cache directory).

---

## 11. Verification Checklist

| Acceptance Criterion | Status | Evidence |
|---|---|---|
| `npm test` passes `foundation.test.js`, `auth.test.js`, and `questions.test.js` | PASS | `3 passed (3)`, `21 passed (21)` in `3.37s`, exit 0. |
| All 3 question types creatable, validated, editable, filterable, soft-archivable | PASS | Verified in `questions.test.js` tests 1, 2, 4, 5, 6, 7. |
| Ownership and candidate `403` isolation verified | PASS | Candidate denied `403` on list/create/topics; Examiner B denied `403` on Examiner A's read/update/archive; Admin allowed. |
| `BACKEND.md` and `graphify-out/` updated | PASS | [`BACKEND.md`](file:///Users/abdulrehman/Desktop/Techno%20verse/BACKEND.md) documents `Question` model + `/api/questions/*`; `graphify-out/` updated (`157 nodes, 391 edges`). |

---

## 12. Remaining Work, Blockers, Known Limitations
- **Blocker — Missing `backend/.env`**: `backend/.env` still does not exist on disk (`MONGO_URI` / `MONGODB_TEST_URI`), so tests ran against an isolated local `mongod` rather than Atlas `MONGODB_TEST_URI`.
- **Git Branch**: Still on `main`; create/checkout `feat/backend` and commit manually.
- **Note**: In Phase 4/5, `PATCH /api/questions/:id` or question edits must preserve active exam attempts (handled via attempt snapshotting in Phase 5).

---

## 13. Impact on Other Members
- **Member 1 (`frontend/`)**: Question Bank contract is locked in [`BACKEND.md`](file:///Users/abdulrehman/Desktop/Techno%20verse/BACKEND.md) — create/update accept `options: [{ text }]` and `correctOptionIndexes: number[]` (0-based), and responses return `options: [{ id, text }]` and `correctOptionIds: string[]`.
- **Member 3 (`feat/ai`)**: `aiService.js` and `aiRoutes.js` remain untouched.

---

## 14. Final Status
**COMPLETED** *(21/21 Vitest + Supertest tests passing via isolated local `mongod`.)*

---

## 15. Next Phase Recommendation
Wait for user review and signal to begin **Phase 4: Exams, Lifecycle & Enrollment**.

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
│   ├── controllers/ (adminUserController.js, authController.js, questionController.js)
│   ├── middleware/ (authMiddleware.js, errorMiddleware.js, notFoundMiddleware.js, rateLimitMiddleware.js, rbacMiddleware.js, validate.js)
│   ├── models/ (Question.js, User.js)
│   ├── routes/ (adminRoutes.js, aiRoutes.js, authRoutes.js, healthRoutes.js, index.js, questionRoutes.js)
│   ├── scripts/ (seed.js)
│   ├── services/ (adminUserService.js, aiService.js, authService.js, questionService.js)
│   ├── utils/ (ApiError.js, asyncHandler.js, generateToken.js, response.js, sanitize.js, time.js, validateEnv.js)
│   └── validators/ (adminUserValidator.js, authValidator.js, questionValidator.js)
└── tests
    ├── auth.test.js
    ├── foundation.test.js
    └── questions.test.js
```

### B. Key Technical Decisions
- Create/update accept `correctOptionIndexes` (0-based) so frontend callers don't pre-generate MongoDB `ObjectId`s; server generates option `_id`s and persists `correctOptionIds` (`select: false`).
- `validateQuestionConsistency` is shared by Zod `.superRefine` on `POST` and merged state validation on `PATCH`.
- `GET /api/questions/topics` is registered before `GET /api/questions/:id` to prevent route shadowing.

### C. Test Summary
- `cd backend && MONGODB_TEST_URI="mongodb://127.0.0.1:27117/sems_test" npm test` → **21 passed / 21 total** (`foundation` 7/7, `auth` 7/7, `questions` 7/7, `3.37s`).

### D. Git Status Summary
- **Branch**: `main`.
- **Modified**: `.gitignore`, `BACKEND.md`, `backend/.env.example`, `backend/package-lock.json`, `backend/package.json`, `backend/src/config/db.js`, `backend/src/controllers/authController.js`, `backend/src/middleware/{authMiddleware,errorMiddleware,rateLimitMiddleware}.js`, `backend/src/models/User.js`, `backend/src/routes/{authRoutes,healthRoutes,index}.js`, `backend/src/server.js`, `backend/src/services/adminUserService.js`, `backend/src/utils/{generateToken,sanitize,validateEnv}.js`.
- **Untracked**: `backend/src/{app.js,controllers/{adminUserController,questionController}.js,middleware/{notFoundMiddleware,rbacMiddleware,validate}.js,models/Question.js,routes/{adminRoutes,questionRoutes}.js,scripts/,services/{adminUserService,authService,questionService}.js,utils/{ApiError,asyncHandler,response,time}.js,validators/}`, `backend/tests/`, `backend/vitest.config.js`, `docs/`, plus pre-existing `files/`, `TechnoVerse_WebeThon_Master_Prompt.md`, `Web-e-Thon Problem Statement.pdf`. (`graphify-out/` ignored.)

### E. Environment Variable NAMES Present
- `backend/.env`: **DOES NOT EXIST**.
- `backend/.env.example`: `PORT`, `NODE_ENV`, `MONGO_URI`, `MONGODB_TEST_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `CLIENT_URL`, `VERIFY_HMAC_SECRET`, `ALLOW_SELF_REGISTER`, `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, `OPENROUTER_SITE_URL`, `OPENROUTER_SITE_NAME`, `USE_MOCK_AI`.
