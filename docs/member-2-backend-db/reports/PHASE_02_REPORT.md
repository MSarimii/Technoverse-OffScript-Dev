# PHASE EXECUTION REPORT

## 1. Phase Information
- **Phase Number**: Phase 2 (02)
- **Phase Name**: Auth, RBAC, User Admin & Seed
- **Date**: 2026-11-27
- **Final Status**: COMPLETED (verified via isolated local `mongod` for `MONGODB_TEST_URI` and ephemeral seed DB; `backend/.env` Atlas URI remains absent on disk so Atlas seed/ping is deferred)

---

## 2. Objective
Implement SEMS authentication, three-role authorization (`admin`, `examiner`, `candidate`), `tokenVersion`-based JWT revocation, strict Zod validation against mass-assignment, admin user management APIs, and an idempotent seed script—built via TDD (`RED -> GREEN`), backed by `Vitest + Supertest`, documented in `BACKEND.md`, and mapped in `graphify-out/`.

---

## 3. Implementation Summary
1. **TDD Workflow (`RED -> GREEN`)**:
   - Queried `graphify-out/` first (`Map User.js, authRoutes.js, authController.js, authMiddleware.js, and generateToken.js`) and read all 5 auth starter files.
   - Created [`backend/tests/auth.test.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/tests/auth.test.js) first and verified **RED** (7/7 tests failed against starter schema/controllers on missing `passwordHash`, missing `examiner`/`candidate` roles, ungated registration, and legacy error format).
2. **`User` Model ([`backend/src/models/User.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/models/User.js))**:
   - Updated schema with `name` (2–80), `email` (unique, lowercase, trim), `passwordHash` (`select: false`), `role` (`admin | examiner | candidate`, default `candidate`), `isActive` (default `true`), `tokenVersion` (default `0`), optional `rollNo`, and `preferences` (`theme`, `fontScale`, `layout`, `showTimer`, `highContrast`).
   - Added indexes (`email` unique, `{ role: 1, isActive: 1 }`, `rollNo` sparse), `bcryptjs` pre-save hook (10 rounds), `matchPassword(plain)`, `toJSON` transform, and `serializeUser(user)` DTO helper (never exposing `passwordHash` or `tokenVersion`).
3. **JWT & Auth/RBAC Middleware**:
   - [`generateToken.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/utils/generateToken.js): Signs `{ id, role, tokenVersion }` with `JWT_SECRET` and `JWT_EXPIRES_IN` (default `'8h'`); exports `verifyToken(token)`.
   - [`authMiddleware.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/middleware/authMiddleware.js): `requireAuth` (+ `protect` alias) loads user from DB and rejects missing, inactive (`!isActive`), or revoked (`decoded.tokenVersion !== user.tokenVersion`) tokens with `401 UNAUTHENTICATED`.
   - [`rbacMiddleware.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/middleware/rbacMiddleware.js): `requireRole(...allowedRoles)` enforces `403 FORBIDDEN`.
   - [`rateLimitMiddleware.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/middleware/rateLimitMiddleware.js): Tightened `authLimiter` to `5 req/min/IP` (`skip` when `NODE_ENV === 'test'`).
4. **Strict Zod Validators, Services, Controllers & Routes**:
   - Validators: [`authValidator.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/validators/authValidator.js) & [`adminUserValidator.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/validators/adminUserValidator.js) (`.strict()` blocks mass-assignment of `role`/`isActive`/`tokenVersion`).
   - Services: [`authService.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/services/authService.js) (uniform `401` on bad email/password; `403` after password check if deactivated; `ALLOW_SELF_REGISTER` gating; `tokenVersion` bump on password change) & [`adminUserService.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/services/adminUserService.js) (regex-escaped search + pagination, create user, update with `tokenVersion` bump on role change/deactivation and self-lockout guard, reset password with `tokenVersion` bump, overview counts).
   - Controllers & Routes: [`authController.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/controllers/authController.js), [`adminUserController.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/controllers/adminUserController.js), [`authRoutes.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/routes/authRoutes.js), [`adminRoutes.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/routes/adminRoutes.js), and mounted `/admin` in [`routes/index.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/routes/index.js).
5. **Seed Script & Docs/Graphify**:
   - [`backend/src/scripts/seed.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/scripts/seed.js) (`"seed": "node src/scripts/seed.js"` in `package.json`): non-destructive find-or-create for 1 admin, 2 examiners, and 5 candidates.
   - Updated [`BACKEND.md`](file:///Users/abdulrehman/Desktop/Techno%20verse/BACKEND.md) and rebuilt `graphify-out/` (`124 nodes, 293 edges, 7 communities, 0 import cycles`).

---

## 4. Files Created
- [`backend/src/middleware/rbacMiddleware.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/middleware/rbacMiddleware.js) — `requireRole(...allowedRoles)` RBAC middleware.
- [`backend/src/validators/authValidator.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/validators/authValidator.js) — Strict Zod schemas (`loginSchema`, `registerSchema`, `changePasswordSchema`).
- [`backend/src/validators/adminUserValidator.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/validators/adminUserValidator.js) — Strict Zod schemas (`listUsersQuerySchema`, `createUserSchema`, `updateUserSchema`, `resetPasswordSchema`).
- [`backend/src/services/authService.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/services/authService.js) — Auth business logic (`loginUser`, `registerCandidate`, `changeOwnPassword`).
- [`backend/src/services/adminUserService.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/services/adminUserService.js) — Admin user CRUD, password reset, overview aggregation, self-demotion/deactivation guard.
- [`backend/src/controllers/adminUserController.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/controllers/adminUserController.js) — Thin `asyncHandler` controllers for `/api/admin/*`.
- [`backend/src/routes/adminRoutes.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/routes/adminRoutes.js) — Admin routes protected by `requireAuth` + `requireRole('admin')`.
- [`backend/src/scripts/seed.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/scripts/seed.js) — Idempotent CLI + exportable `seedUsers()` script (8 accounts).
- [`backend/tests/auth.test.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/tests/auth.test.js) — 7 Vitest + Supertest integration tests for auth, RBAC, token revocation, and admin routes.
- [`docs/member-2-backend-db/reports/PHASE_02_REPORT.md`](file:///Users/abdulrehman/Desktop/Techno%20verse/docs/member-2-backend-db/reports/PHASE_02_REPORT.md) — This execution report.

---

## 5. Files Modified
- [`backend/src/models/User.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/models/User.js) — SEMS fields (`passwordHash`, 3 roles, `isActive`, `tokenVersion`, `rollNo`, `preferences`), indexes, `toJSON`, `serializeUser`.
- [`backend/src/utils/generateToken.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/utils/generateToken.js) — Embeds `{ id, role, tokenVersion }` (`8h` default) and adds `verifyToken`.
- [`backend/src/middleware/authMiddleware.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/middleware/authMiddleware.js) — `requireAuth` checks DB existence, `isActive`, and `tokenVersion`; exports `protect` & `authorize` aliases.
- [`backend/src/middleware/rateLimitMiddleware.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/middleware/rateLimitMiddleware.js) — `authLimiter` set to `5 req/min/IP` (`skip` in `test`).
- [`backend/src/controllers/authController.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/controllers/authController.js) — Thin `asyncHandler` handlers (`login`, `register`, `getMe`, `updatePassword`) using `sendSuccess`.
- [`backend/src/routes/authRoutes.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/routes/authRoutes.js) — Added `PATCH /password`, `requireSelfRegisterEnabled`, strict Zod validation, `requireAuth`.
- [`backend/src/routes/index.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/routes/index.js) — Mounted `/admin` (`adminRoutes`).
- [`backend/package.json`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/package.json) — Added `"seed": "node src/scripts/seed.js"`.
- [`BACKEND.md`](file:///Users/abdulrehman/Desktop/Techno%20verse/BACKEND.md) — Updated directory tree, `User` model spec, RBAC/rate-limit pipeline, `/api/auth/*`, `/api/admin/*`, and seed docs.
- `graphify-out/` (gitignored) — Rebuilt graph over all 30 files in `backend/src`.

*(Verified untouched: `frontend/`, `backend/src/services/aiService.js`, `backend/src/routes/aiRoutes.js`.)*

---

## 6. Database Changes
- **`User` Schema (`users` collection)**:
  - Replaced `password` with `passwordHash` (`select: false`), expanded `role` enum to `['admin', 'examiner', 'candidate']` (default `'candidate'`), added `isActive` (`true`), `tokenVersion` (`0`), `rollNo`, and `preferences` defaults.
  - Declared indexes: `email` (`unique`), `{ role: 1, isActive: 1 }`, `rollNo` (`sparse`).
- **Seed Data (tested on isolated ephemeral MongoDB only)**:
  - `seedUsers()` created 8 accounts on run 1 (`admin@sems.edu`, `examiner1@sems.edu`, `examiner2@sems.edu`, `candidate1@sems.edu`..`candidate5@sems.edu`) and skipped all 8 on run 2 (`0 created, 8 existing`).

---

## 7. APIs Implemented

| Method | Path | Behavior | Verified? |
|---|---|---|---|
| `POST` | `/api/auth/login` | Uniform `401` on invalid email/password; `403` after password check if deactivated; returns `{ token, user }` | Yes (Supertest) |
| `POST` | `/api/auth/register` | Gated by `ALLOW_SELF_REGISTER=true` (`403` when disabled); `.strict()` rejects `role` (`400`); creates `candidate` (`201`) | Yes (Supertest) |
| `GET` | `/api/auth/me` | Protected (`requireAuth`); verifies active user & `tokenVersion`; returns `{ user }` | Yes (Supertest) |
| `PATCH` | `/api/auth/password` | Protected (`requireAuth`); validates `currentPassword`, updates hash, bumps `tokenVersion`, returns fresh `{ message, token, user }` | Yes (Supertest) |
| `GET` | `/api/admin/users` | Admin only; filters `role`, `isActive`, escaped `q`, `page`/`limit` pagination | Yes (Supertest) |
| `POST` | `/api/admin/users` | Admin only; creates `admin\|examiner\|candidate`, rejects duplicate email (`409`) | Yes (Supertest) |
| `PATCH` | `/api/admin/users/:id` | Admin only; updates fields, bumps `tokenVersion` on role change/deactivation, blocks self-demotion/deactivation (`409`) | Yes (Supertest) |
| `POST` | `/api/admin/users/:id/reset-password` | Admin only; updates `passwordHash` and bumps `tokenVersion` | Yes (Supertest) |
| `GET` | `/api/admin/overview` | Admin only; returns user role/active counts plus `{ exams: 0, attempts: 0 }` | Yes (Supertest) |

---

## 8. Dependencies and Tools Used
- **Packages Installed**: None in Phase 2 (reused existing `bcryptjs`, `jsonwebtoken`, `mongoose`, `zod`, `express-rate-limit`, `vitest`, `supertest`).
- **Ephemeral Test Runtime**: Local `/opt/homebrew/bin/mongod` (`v8.3.7`) started in conversation scratch dir on `127.0.0.1:27117` for `MONGODB_TEST_URI` and seed idempotency verification, then shut down and deleted cleanly.
- **Graphify (`0.9.92`)**: Queried existing graph before reading files; refreshed `graphify-out/` across 30 files (`124 nodes, 293 edges, 7 communities, 0 import cycles`). Top God Nodes: `ApiError` (23), `sendSuccess()` (15), `serializeUser()` (12), `createApp()` (8).
- **Skills Engaged**: `graphify`, `test-driven-development`, `verification-before-completion`, `ponytail`.

---

## 9. Testing Results

| Test | Command | Expected | Actual | Status |
|---|---|---|---|---|
| TDD RED Phase (`auth.test.js`) | `MONGODB_TEST_URI="mongodb://127.0.0.1:27117/sems_test" npx vitest run tests/auth.test.js` | All 7 new tests fail against starter code | `Tests 7 failed (7)` on missing `passwordHash`, roles, `ALLOW_SELF_REGISTER`, envelope | PASS (Expected RED) |
| Full Suite (`foundation` + `auth`) | `cd backend && MONGODB_TEST_URI="mongodb://127.0.0.1:27117/sems_test" npm test` | All 14 tests pass, exit 0 | `Test Files 2 passed (2)`, `Tests 14 passed (14)` in `3.08s` | PASS |
| Seed Idempotency (Isolated Ephemeral DB) | `cd backend && MONGO_URI="mongodb://127.0.0.1:27117/sems_seed_test" npm run seed && ...` | Run 1 creates 8; Run 2 creates 0 (`8 existing`) | Run 1: `8 created, 0 existing`; Run 2: `0 created, 8 existing` | PASS |
| Seed Against `backend/.env` `MONGO_URI` | `cd backend && npm run seed` | Seed real Atlas dev DB if `backend/.env` exists | `backend/.env` does not exist on disk | **SKIPPED (No backend/.env)** |

### Full `npm test` Output Summary
```text
> technoverse-backend@1.0.0 test
> vitest run

 RUN  v5.1.2 /Users/abdulrehman/Desktop/Techno verse/backend

stdout | tests/auth.test.js
[OpenRouter AI Service] Running in USE_MOCK_AI=true mode. Synthetic responses will be returned.

stdout | tests/foundation.test.js
[OpenRouter AI Service] Running in USE_MOCK_AI=true mode. Synthetic responses will be returned.

 ✓ tests/foundation.test.js (7 tests) 45ms
 ✓ tests/auth.test.js (7 tests) 1886ms
   ✓ Phase 2 Auth, RBAC, Token Revocation & Admin Users (7)
     ✓ logs in with valid credentials and returns token + sanitized user without passwordHash
     ✓ fails login with uniform 401 UNAUTHENTICATED for unknown email or wrong password
     ✓ gates self-registration via ALLOW_SELF_REGISTER and blocks role injection via .strict()
     ✓ requires valid Bearer token on GET /api/auth/me and supports PATCH /api/auth/password
     ✓ denies candidate and examiner access to all /api/admin/* endpoints with 403 FORBIDDEN
     ✓ allows admin to create, list/filter, update role/active, reset password, and get overview
     ✓ immediately invalidates existing JWT when role changes, password resets, or user is deactivated

 Test Files  2 passed (2)
      Tests  14 passed (14)
   Start at  12:20:52
   Duration  3.08s (import 51%, tests 47%, transform 2%)
```

---

## 10. Bugs Discovered and How Each Was Resolved
1. **macOS `mongod --fork` incompatibility**: Local `mongod` on macOS rejects `--fork`; launched isolated test `mongod` in background with PID tracking and `trap` cleanup.
2. **Non-production stack trace microtask variance on uniform 401 test**: In `NODE_ENV=test`, synchronous `null` user lookup vs async `bcrypt.compare` differed by one V8 `processTicksAndRejections` frame inside `stack`, while `success` and `error` envelopes were identical. Updated assertion in `auth.test.js` to verify identical `{ success, error }` envelopes.
3. **Mongoose `afterAll` hang guard**: Guarded `User.deleteMany` in `auth.test.js` `afterAll` with `if (mongoose.connection.readyState === 1)` so failed DB connections don't stall teardown for 10s.

---

## 11. Verification Checklist

| Acceptance Criterion | Status | Evidence |
|---|---|---|
| `npm test` passes `foundation.test.js` and `auth.test.js` (exit 0) | PASS | `2 passed (2)`, `14 passed (14)` in `3.08s`. |
| No response ever leaks `passwordHash` | PASS | `User.passwordHash` uses `select: false`; `toJSON` + `serializeUser` strip it; asserted across login/register/me/admin list & create in `auth.test.js`. |
| Every `/api/admin/*` route enforces `requireRole('admin')` | PASS | `router.use(requireAuth, requireRole('admin'))` in `adminRoutes.js`; `403 FORBIDDEN` verified for `candidate` and `examiner`. |
| Seed script runs cleanly and is idempotent | PASS | Verified 2 consecutive runs on isolated MongoDB (`8 created, 0 existing` -> `0 created, 8 existing`); real `backend/.env` Atlas seed deferred until `.env` exists. |
| `BACKEND.md` and `graphify-out/` updated | PASS | [`BACKEND.md`](file:///Users/abdulrehman/Desktop/Techno%20verse/BACKEND.md) updated with Phase 2 contract; `graphify-out/` rebuilt (`124 nodes, 293 edges`). |

---

## 12. Remaining Work, Blockers, Known Limitations
- **Blocker 1 — Missing `backend/.env`**: `backend/.env` still does not exist in `/Users/abdulrehman/Desktop/Techno verse/backend/`. Once created with `MONGO_URI` and `MONGODB_TEST_URI`, run `npm run seed` (twice if desired) against `MONGO_URI` and `npm test` against `MONGODB_TEST_URI`.
- **Blocker 2 — Git Branch**: Repository remains on `main`; create/switch to `feat/backend` and commit manually.
- **Note**: `POST /api/auth/login` intentionally returns uniform `401 UNAUTHENTICATED` for unknown email or wrong password, and `403 FORBIDDEN` after password verification if `isActive === false`.

---

## 13. Impact on Other Members
- **Member 1 (`frontend/`)**:
  - Updated `User` DTO shape (`id, name, email, role: 'admin'|'examiner'|'candidate', isActive, rollNo?, preferences, createdAt`) and auth response (`{ success: true, data: { token, user } }`) are locked in [`BACKEND.md`](file:///Users/abdulrehman/Desktop/Techno%20verse/BACKEND.md).
  - `/api/auth/register` is disabled (`403`) unless `ALLOW_SELF_REGISTER=true`; seed accounts use `admin@sems.edu`, `examiner1@sems.edu`, `examiner2@sems.edu`, `candidate1..5@sems.edu` (default `Pass1234!`).
- **Member 3 (`feat/ai`)**:
  - `requireAuth` (`protect` alias) and `requireRole` (`authorize` alias) are exported from [`authMiddleware.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/middleware/authMiddleware.js) and [`rbacMiddleware.js`](file:///Users/abdulrehman/Desktop/Techno%20verse/backend/src/middleware/rbacMiddleware.js) for securing `/api/ai/*` when needed; `aiService.js` and `aiRoutes.js` remain untouched.

---

## 14. Final Status
**COMPLETED** *(Verified against isolated local `mongod` `v8.3.7`; `backend/.env` Atlas seed deferred until `.env` is added.)*

---

## 15. Next Phase Recommendation
Wait for user to add `backend/.env`, run `npm run seed` against Atlas `MONGO_URI`, and confirm readiness before starting **Phase 3: Question Bank**.

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
│   ├── controllers/ (adminUserController.js, authController.js)
│   ├── middleware/ (authMiddleware.js, errorMiddleware.js, notFoundMiddleware.js, rateLimitMiddleware.js, rbacMiddleware.js, validate.js)
│   ├── models/ (User.js)
│   ├── routes/ (adminRoutes.js, aiRoutes.js, authRoutes.js, healthRoutes.js, index.js)
│   ├── scripts/ (seed.js)
│   ├── services/ (adminUserService.js, aiService.js, authService.js)
│   ├── utils/ (ApiError.js, asyncHandler.js, generateToken.js, response.js, sanitize.js, time.js, validateEnv.js)
│   └── validators/ (adminUserValidator.js, authValidator.js)
└── tests
    ├── auth.test.js
    └── foundation.test.js
```

### B. Key Technical Decisions
- `loginUser` verifies password before returning `403 FORBIDDEN` on deactivated users so unauthenticated callers cannot probe account deactivation status.
- `tokenVersion` is embedded in JWT claims and checked against MongoDB on every `requireAuth` request; it increments on `PATCH /api/auth/password`, `PATCH /api/admin/users/:id` (role change or `isActive: false`), and `POST /api/admin/users/:id/reset-password`.
- `authValidator` and `adminUserValidator` use `.strict()` to reject unexpected fields like `role` on public registration with `400 VALIDATION_ERROR`.

### C. Test Summary
- `npm test` (with isolated `MONGODB_TEST_URI`): **14 passed / 14 total** (`foundation.test.js` 7/7, `auth.test.js` 7/7, `3.08s`).
- `npm run seed` x2 (with isolated `MONGO_URI`): **Run 1 `8 created, 0 existing`**, **Run 2 `0 created, 8 existing`**.

### D. Git Status Summary
- **Branch**: `main`.
- **Modified**: `.gitignore`, `BACKEND.md`, `backend/.env.example`, `backend/package-lock.json`, `backend/package.json`, `backend/src/config/db.js`, `backend/src/controllers/authController.js`, `backend/src/middleware/{authMiddleware,errorMiddleware,rateLimitMiddleware}.js`, `backend/src/models/User.js`, `backend/src/routes/{authRoutes,healthRoutes}.js`, `backend/src/server.js`, `backend/src/utils/{generateToken,validateEnv}.js`.
- **Untracked**: `backend/src/{app.js,controllers/adminUserController.js,middleware/notFoundMiddleware.js,middleware/rbacMiddleware.js,middleware/validate.js,routes/adminRoutes.js,routes/index.js,scripts/,services/adminUserService.js,services/authService.js,utils/ApiError.js,utils/asyncHandler.js,utils/response.js,utils/sanitize.js,utils/time.js,validators/}`, `backend/tests/`, `backend/vitest.config.js`, `docs/`, plus pre-existing `files/`, `TechnoVerse_WebeThon_Master_Prompt.md`, `Web-e-Thon Problem Statement.pdf`. (`graphify-out/` ignored.)

### E. Environment Variable NAMES Present
- `backend/.env`: **DOES NOT EXIST**.
- `backend/.env.example`: `PORT`, `NODE_ENV`, `MONGO_URI`, `MONGODB_TEST_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `CLIENT_URL`, `VERIFY_HMAC_SECRET`, `ALLOW_SELF_REGISTER`, `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, `OPENROUTER_SITE_URL`, `OPENROUTER_SITE_NAME`, `USE_MOCK_AI`.
