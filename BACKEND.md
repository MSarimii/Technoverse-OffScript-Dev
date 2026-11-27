# Backend Architecture & Contract v0.1 (`BACKEND.md`)

This document defines the backend technical architecture, API contract v0.1, security pipeline, and environment configuration for the **TechnoVerse Secure Examination Management System (SEMS)**.

---

## 1. Architecture Overview

- **Runtime & Framework**: **Node.js** (v20+) with **Express 4.x** in ES Module (`"type": "module"`) format.
- **Database**: **MongoDB** accessed via **Mongoose 8.x** with schema validation, pre-save hashing hooks, and indexes.
- **Validation & Security**: **Zod** schema validation (`validate`, `validateEnv`), `helmet`, origin-allow-list `cors`, `express-rate-limit` (`apiLimiter`, `authLimiter`), NoSQL operator/dot-key sanitization (`sanitizeMiddleware`), and `1mb` JSON payload cap.
- **Authentication**: Stateless JSON Web Tokens (**JWT**) with salted **bcrypt** password hashing (12 rounds).
- **Architecture Pattern**: Modular `app.js` / `server.js` split with central `routes/index.js` registry (`routes -> middleware -> controllers -> services -> models -> utils`).

---

## 2. Directory Structure & Boundaries

```
backend/
├── src/
│   ├── config/
│   │   └── db.js                   # connectDB(uri) & disconnectDB()
│   ├── controllers/
│   │   ├── adminUserController.js  # Admin user CRUD, password reset, overview handlers
│   │   ├── attemptController.js    # Candidate exam list, start/resume, sandbox, autosave, heartbeat, events, submit
│   │   ├── authController.js       # Login, self-register, me, change password handlers
│   │   ├── enrollmentController.js # Exam enrollment and candidate search handlers
│   │   ├── disputeController.js    # Candidate/examiner dispute submission, listing & resolution handlers
│   │   ├── examController.js       # Exam CRUD, lifecycle, question assignment, blueprint handlers
│   │   ├── gradingController.js    # Submissions, manual grading, regrade, publish, analytics, question analytics
│   │   ├── importController.js     # Bulk CSV/JSON import handlers (questions & candidate enrollments)
│   │   ├── meController.js         # Workspace preference handlers
│   │   ├── monitoringController.js # Live exam monitoring, incident review, and announcements
│   │   ├── questionController.js   # Question Bank CRUD, topics, and soft-archive handlers
│   │   └── reportController.js     # Exam/attempt PDF streaming, CSV export, HMAC verification & fairness report
│   ├── middleware/
│   │   ├── authMiddleware.js       # requireAuth (JWT + isActive + tokenVersion DB check)
│   │   ├── errorMiddleware.js      # Centralized error envelope handler
│   │   ├── notFoundMiddleware.js   # 404 NOT_FOUND forwarder
│   │   ├── rateLimitMiddleware.js  # apiLimiter (120/min) + authLimiter (5/min)
│   │   ├── rbacMiddleware.js       # requireRole(...allowedRoles)
│   │   └── validate.js             # Zod { params, query, body } validator
│   ├── models/
│   │   ├── Announcement.js         # SEMS exam-wide announcements & serializeAnnouncement DTO
│   │   ├── Attempt.js              # SEMS Attempt schema, frozen paper snapshot & serializeAttemptForCandidate
│   │   ├── AuditLog.js             # SEMS grading & monitoring audit log model
│   │   ├── Dispute.js              # SEMS post-publication grading dispute schema & serializeDispute DTO
│   │   ├── Enrollment.js           # SEMS candidate enrollment schema & serializeEnrollment DTO
│   │   ├── Exam.js                 # SEMS Exam schema, settings, blueprint & serializeExam DTO
│   │   ├── Incident.js             # SEMS Attempt event indicator schema & serializeIncident DTO
│   │   ├── Question.js             # SEMS Question Bank schema & serializeQuestion DTO
│   │   ├── ReportVerification.js   # SEMS HMAC-signed verification record for candidate PDF reports
│   │   └── User.js                 # SEMS User schema (roles, tokenVersion, preferences, serializeUser)
│   ├── routes/
│   │   ├── index.js                # Central /api router registry
│   │   ├── adminRoutes.js          # /api/admin routes (admin only)
│   │   ├── attemptRoutes.js        # /api/attempts session, grading & attempt report PDF routes
│   │   ├── authRoutes.js           # /api/auth routes
│   │   ├── candidateDirectoryRoutes.js # /api/candidates search route (examiner, admin)
│   │   ├── candidateExamRoutes.js  # /api/candidate/exams routes (candidate)
│   │   ├── candidateResultRoutes.js # /api/candidate/results routes (candidate)
│   │   ├── disputeRoutes.js        # /api/disputes resolve route (examiner, admin)
│   │   ├── examRoutes.js           # /api/exams routes (lifecycle, sandbox, grading, analytics, disputes, fairness, PDF, CSV)
│   │   ├── healthRoutes.js         # /api/health and /api/time
│   │   ├── incidentRoutes.js       # /api/incidents review route (examiner, admin)
│   │   ├── meRoutes.js             # /api/me workspace preference routes (all authenticated roles)
│   │   ├── questionRoutes.js       # /api/questions CRUD + import routes (examiner, admin)
│   │   ├── verifyRoutes.js         # /api/verify public HMAC report verification route
│   │   └── aiRoutes.js             # /api/ai routes (Member 3 owned)
│   ├── scripts/
│   │   └── seed.js                 # Idempotent full demo seed (13 users, 36 questions, 4 lifecycle exams, graded attempts)
│   ├── services/
│   │   ├── adminUserService.js     # Admin user management business logic
│   │   ├── attemptService.js       # Attempt start/resume, sandbox, reconnect grace, autosave, events, submit
│   │   ├── attemptSweeper.js       # Periodic & exam-scoped overdue attempt expiry sweeper
│   │   ├── authService.js          # Auth + tokenVersion business logic
│   │   ├── autoGrader.js           # Idempotent objective auto-grader engine
│   │   ├── disputeService.js       # Candidate dispute creation, exam/attempt dispute queries & score resolution
│   │   ├── enrollmentService.js    # Exam candidate enrollment & candidate directory logic
│   │   ├── examService.js          # Exam lifecycle, readiness checks, question assignment & blueprint logic
│   │   ├── fairnessService.js      # Difficulty-stratified fairness inspection service
│   │   ├── gradingService.js       # Manual grading, regrade, publish gate, exam & question analytics
│   │   ├── importService.js        # CSV (csv-parse) & JSON bulk import engine (max 500 rows)
│   │   ├── monitoringService.js    # Live exam monitor, indicator review & announcements service
│   │   ├── questionService.js      # Question Bank business logic & ownership checks
│   │   ├── reportService.js        # PDFKit + QRCode generation and HMAC verification logic
│   │   └── aiService.js            # OpenRouter AI service (Member 3 owned, optional)
│   ├── utils/
│   │   ├── ApiError.js             # Typed HTTP + code error class
│   │   ├── asyncHandler.js         # Async route wrapper
│   │   ├── examStatus.js           # Pure time-derived resolveExamStatus(exam, currentTime) helper
│   │   ├── generateToken.js        # JWT signing & verification (id, role, tokenVersion)
│   │   ├── paperBuilder.js         # Pure stratified frozen-paper snapshot builder (shuffle, fingerprint, index)
│   │   ├── response.js             # sendSuccess() envelope helper
│   │   ├── sanitize.js             # NoSQL $ / . key sanitizer + escapeRegex
│   │   ├── scoring.js              # Pure question scoring & attempt total helpers
│   │   ├── time.js                 # Injectable server clock (now, nowMs)
│   │   └── validateEnv.js          # Zod startup env validator
│   ├── validators/
│   │   ├── adminUserValidator.js   # Strict Zod schemas for admin user routes
│   │   ├── attemptValidator.js     # Strict Zod schemas for attempt autosave (with grace metadata), heartbeat, events
│   │   ├── authValidator.js        # Strict Zod schemas for auth routes
│   │   ├── enrollmentValidator.js  # Strict Zod schemas for enrollment and candidate search routes
│   │   ├── examValidator.js        # Strict Zod schemas for exam CRUD, questions, and blueprint routes
│   │   ├── gradingValidator.js     # Strict Zod schemas for manual grading, publish, and results
│   │   ├── importValidator.js      # Strict Zod schemas for CSV/JSON bulk import payloads
│   │   ├── meValidator.js          # Strict Zod schemas for /api/me/preferences
│   │   ├── monitoringValidator.js  # Strict Zod schemas for incidents and announcements
│   │   ├── questionValidator.js    # Strict per-type Zod schemas for question bank
│   │   └── reportValidator.js      # Strict Zod schemas for report verification code param
│   ├── app.js                      # Express createApp() factory (no port listen)
│   └── server.js                   # Boot entrypoint (dotenv/config -> validateEnv -> connectDB -> listen + sweeper)
├── tests/
│   ├── attempts.test.js            # Vitest + Supertest Phase 5 attempt engine & timer suite
│   ├── auth.test.js                # Vitest + Supertest Phase 2 auth/RBAC/admin suite
│   ├── exams.test.js               # Vitest + Supertest Phase 4 exam lifecycle & enrollment suite
│   ├── foundation.test.js          # Vitest + Supertest foundation suite
│   ├── grading_monitoring.test.js  # Vitest + Supertest Phase 6 + 7 grading, analytics & monitoring suite
│   ├── questions.test.js           # Vitest + Supertest Phase 3 Question Bank suite
│   ├── reports_innovation.test.js  # Vitest + Supertest Phase 8b + 9 PDF reports, QR verify & innovations suite
│   └── secondary_part1.test.js     # Vitest + Supertest Phase 8a preferences, sandbox, analytics & import suite
├── vitest.config.js
├── .env.example                    # Backend template environment file
└── package.json                    # Backend scripts (start, dev, seed, test -> vitest run)
```

---

## 3. Environment Variables Specification (`.env.example`)

Before running the server, copy `.env.example` to `.env` and supply valid values:

```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/technoverse
MONGODB_TEST_URI=
JWT_SECRET=replace_with_a_secure_random_64_character_string_here
JWT_EXPIRES_IN=8h
CLIENT_URL=http://localhost:5173
VERIFY_HMAC_SECRET=replace_with_a_secure_random_hmac_secret_here
ALLOW_SELF_REGISTER=false
RECONNECT_GRACE_SECONDS=30

# OpenRouter AI Configuration (Optional)
OPENROUTER_API_KEY=
OPENROUTER_MODEL=google/gemini-2.5-flash
OPENROUTER_SITE_URL=http://localhost:5173
OPENROUTER_SITE_NAME=HackathonApp
USE_MOCK_AI=true
```

> [!CAUTION]
> The server validates environment variables with Zod at startup (`validateEnv`). `MONGO_URI` (or `MONGODB_URI`) and `JWT_SECRET` are always required; `VERIFY_HMAC_SECRET` is required in `production`, and `OPENROUTER_API_KEY` is required only when `USE_MOCK_AI=false`.

---

## 3A. Contract v0.1 — Standard Envelopes & Error Codes

### Response Envelopes
- **Success Envelope**:
  ```json
  {
    "success": true,
    "data": {}
  }
  ```
- **Error Envelope**:
  ```json
  {
    "success": false,
    "error": {
      "code": "VALIDATION_ERROR",
      "message": "Human readable error message",
      "details": [{ "path": "field", "message": "Reason" }]
    }
  }
  ```
  *(In `NODE_ENV=production`, stack traces are omitted completely.)*

### Standard Error Codes
- **Foundation & Auth Codes (Active)**: `VALIDATION_ERROR`, `UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `RATE_LIMITED`, `INTERNAL_ERROR`.
- **SEMS Domain Codes (Reserved for Phases 2–9)**: `EXAM_NOT_AVAILABLE`, `EXAM_NOT_PUBLISHED`, `NOT_ENROLLED`, `ATTEMPT_EXPIRED`, `ATTEMPT_ALREADY_SUBMITTED`, `STALE_SAVE`, `RESULTS_NOT_PUBLISHED`, `GRADING_INCOMPLETE`, `SCORE_OUT_OF_RANGE`, `IMPORT_INVALID`.

---

## 4. MongoDB Models & Schemas

### `User` Model (`src/models/User.js`)
- **Fields**:
  - `name`: `String` (required, trimmed, 2–80 chars)
  - `email`: `String` (required, unique, lowercase, trimmed)
  - `passwordHash`: `String` (required, `select: false`, bcryptjs hashed with 10 salt rounds on save)
  - `role`: `String` (`enum: ['admin', 'examiner', 'candidate']`, default `'candidate'`)
  - `isActive`: `Boolean` (default `true`)
  - `tokenVersion`: `Number` (default `0`, incremented on password change/reset, role change, or deactivation)
  - `rollNo`: `String` (optional, trimmed)
  - `preferences`: `{ theme: 'dark'|'light'|'system', fontScale: 'sm'|'md'|'lg', layout: 'standard'|'compact'|'split', showTimer: Boolean, highContrast: Boolean }`
  - `timestamps`: `createdAt`, `updatedAt`
- **Indexes**: `email` (`unique`), `{ role: 1, isActive: 1 }`, `rollNo` (`sparse`).
- **DTO (`serializeUser`)**: Returns `{ id, name, email, role, isActive, rollNo?, preferences, createdAt }` (`passwordHash` and `tokenVersion` are never exposed).

### `Question` Model (`src/models/Question.js`)
- **Fields**:
  - `createdBy`: `ObjectId` ref `User` (required)
  - `type`: `String` (`enum: ['single', 'multiple', 'written']`, required)
  - `text`: `String` (required, trimmed, min 3 chars)
  - `options`: `[{ _id, text }]` (2–8 options for `single`/`multiple`; empty for `written`)
  - `correctOptionIds`: `[ObjectId]` (`select: false`, default `[]`)
  - `topic`: `String` (required, trimmed)
  - `difficulty`: `String` (`enum: ['easy', 'medium', 'hard']`, required)
  - `marks`: `Number` (required, min `0.25`)
  - `scheme`: `{ mode: 'all_or_nothing'|'partial', negativeMarks: Number >= 0 }`
  - `rubric`: `String` (trimmed, default `''`)
  - `explanation`: `String` (trimmed, default `''`)
  - `isArchived`: `Boolean` (default `false`)
  - `timestamps`: `createdAt`, `updatedAt`
- **Indexes**: `{ createdBy: 1, topic: 1, difficulty: 1 }`, text index on `text`, `{ isArchived: 1 }`.
- **DTO (`serializeQuestion`)**: Examiner/admin view returning `{ id, createdBy, type, text, options: [{ id, text }], correctOptionIds, topic, difficulty, marks, scheme, rubric, explanation, isArchived, createdAt, updatedAt }`.

### `Exam` Model (`src/models/Exam.js`) & `resolveExamStatus` (`src/utils/examStatus.js`)
- **Fields**:
  - `createdBy`: `ObjectId` ref `User` (required)
  - `title`: `String` (required, trimmed, 3–150 chars), `instructions`: `String` (trimmed, default `''`)
  - `startAt`: `Date` (required), `endAt`: `Date` (required), `durationMinutes`: `Number` (required, min `1`)
  - `totalMarks`: `Number` (default `0`, recomputed from assigned questions), `status`: `enum ['draft', 'published', 'completed', 'cancelled']` (default `'draft'`)
  - `settings`: `{ shuffleQuestions: Boolean, shuffleOptions: Boolean, showScoreImmediately: Boolean, allowLateStart: Boolean, strictEnd: Boolean, negativeMarkingEnabled: Boolean }`
  - `questions`: `[{ questionId: ObjectId, marks: Number >= 0.25, order: Number >= 0 }]`
  - `blueprint`: `{ easy: Number >= 0, medium: Number >= 0, hard: Number >= 0, poolMode: Boolean }`
  - `resultsPublished`: `Boolean` (default `false`), `resultsPublishedAt`: `Date | null`, `publishedAt`: `Date | null`
- **Indexes**: `{ createdBy: 1, status: 1 }`, `{ startAt: 1, endAt: 1 }`, `{ status: 1 }`.
- **`resolveExamStatus(exam, currentTime = now())`**: Persisted `'draft' | 'cancelled' | 'completed'` return as-is; persisted `'published'` returns `'published'` when `currentTime < startAt`, `'ongoing'` when `startAt <= currentTime < endAt`, and `'completed'` when `currentTime >= endAt`.
- **DTO (`serializeExam`)**: Returns `{ id, createdBy, title, instructions, startAt, endAt, durationMinutes, totalMarks, status, effectiveStatus, settings, questions, questionCount, enrolledCount?, blueprint, resultsPublished, resultsPublishedAt, publishedAt, createdAt, updatedAt }`.

### `Enrollment` Model (`src/models/Enrollment.js`)
- **Fields**: `examId` (`ObjectId` ref `Exam`), `userId` (`ObjectId` ref `User`), `enrolledBy` (`ObjectId` ref `User`), `status` (`enum ['active', 'removed']`, default `'active'`), `timestamps`.
- **Indexes**: unique `{ examId: 1, userId: 1 }`, `{ userId: 1 }`.
- **DTO (`serializeEnrollment`)**: Returns `{ id, examId, userId, enrolledBy, status, candidate?, createdAt, updatedAt }`.

### `Attempt` Model (`src/models/Attempt.js`) & `Incident` Model (`src/models/Incident.js`)
- **`Attempt` Fields**: `examId`, `userId`, `isSandbox` (default `false`), `status` (`'in_progress' | 'submitted' | 'expired' | 'graded'`), `startedAt`, `deadlineAt`, `submittedAt`, `finalizedBy` (`'candidate' | 'expiry' | 'examiner' | null`), `paper` (frozen snapshot containing `questionId`, `type`, `text`, `marks`, `scheme`, `optionOrder`, `correctOptionIds` [`select: false`], `difficulty`, `topic`), `paperFingerprint`, `paperDifficultyIndex`, `answers` (`[{ questionId, selectedOptionIds, text, markedForReview, seq, savedAt }]`), `scratchpad`, `activeSessionId` (`select: false`, single-session `x-session-id` tracker), `lastHeartbeatAt`, `connectionGaps` (`[{ from, to }]`), `grades`, `totalScore`, `maxScore`, `percentage`, `gradingStatus`.
- **`Attempt` Indexes**: unique partial `{ examId: 1, userId: 1 }` (`partialFilterExpression: { isSandbox: false }`), `{ examId: 1, status: 1 }`, `{ status: 1, deadlineAt: 1 }`, `{ userId: 1 }`.
- **DTO (`serializeAttemptForCandidate`)**: Whitelists only candidate-safe fields (`id`, `examId`, `isSandbox`, `status`, `startedAt`, `deadlineAt`, `submittedAt`, `serverNow`, `remainingMs`, `paper` without `correctOptionIds`, `answers`, `scratchpad`, `lastHeartbeatAt`).
- **`Incident` Fields**: `attemptId`, `examId`, `userId`, `type` (`'tab_hidden' | 'window_blur' | 'fullscreen_exit' | 'copy_paste' | 'reconnect' | 'multiple_sessions' | 'other'`), `details`, `occurredAt`, `reviewStatus`, `reviewerNote`, `timestamps`. Indexes: `{ examId: 1, occurredAt: -1 }`, `{ attemptId: 1 }`.

### `Announcement` Model (`src/models/Announcement.js`) & `AuditLog` Model (`src/models/AuditLog.js`)
- **`Announcement` Fields**: `examId` (`ObjectId` ref `Exam`), `createdBy` (`ObjectId` ref `User`), `message` (`String`, trimmed, 1–500 chars), `timestamps`. Index: `{ examId: 1, createdAt: -1 }`.
- **`AuditLog` Fields**: `actorId` (`ObjectId` ref `User`), `action` (`String`), `entityType` (`String`), `entityId` (`ObjectId`), `meta` (`Object`), `at` (`Date`). Index: `{ entityType: 1, entityId: 1 }`.

### `ReportVerification` Model (`src/models/ReportVerification.js`)
- **Fields**: `code` (`String`, unique), `attemptId` (`ObjectId` ref `Attempt`, unique), `examId` (`ObjectId` ref `Exam`), `scoreSnapshot` (`{ totalScore, maxScore, percentage }`), `issuedAt` (`Date`), `hmac` (`String`, HMAC-SHA256 over `code|attemptId|examId|totalScore|maxScore`), `timestamps`.

### `Dispute` Model (`src/models/Dispute.js`)
- **Fields**: `attemptId` (`ObjectId` ref `Attempt`), `examId` (`ObjectId` ref `Exam`), `userId` (`ObjectId` ref `User`), `questionId` (`ObjectId`), `reason` (`String`, 5–1000 chars), `status` (`'open' | 'under_review' | 'accepted' | 'rejected'`, default `'open'`), `resolutionNote`, `adjustedScore`, `resolvedBy`, `resolvedAt`, `timestamps`.
- **Indexes**: unique `{ attemptId: 1, questionId: 1 }`, `{ examId: 1, status: 1 }`.

---

## 5. Security & Middleware Pipeline

1. **Security Headers**: `app.use(helmet())`
2. **CORS Allow-List**: Comma-separated `CLIENT_URL` origins parsed by `parseCorsOrigins()` (`credentials: true`, permits non-origin clients such as `curl`, returns `403 FORBIDDEN` for disallowed browser origins).
3. **Payload Limit & Sanitization**: `express.json({ limit: '1mb' })`, `express.urlencoded({ extended: true, limit: '1mb' })`, plus `sanitizeMiddleware` stripping `$`-prefixed, `.`-containing, and prototype keys from `req.body`, `req.query`, and `req.params`.
4. **Rate Limiting**: `apiLimiter` (120 req/min/IP across `/api`) and `authLimiter` (5 req/min/IP on `/api/auth/login` and `/api/auth/register`, skipped when `NODE_ENV === 'test'`), returning `429 RATE_LIMITED`.
5. **Validation (`validate`)**: Validates `{ params, query, body }` with strict Zod schemas (`.strict()` rejects mass-assignment fields like `role` on public routes) and forwards `400 VALIDATION_ERROR` with field `details`.
6. **Auth & RBAC (`requireAuth`, `requireRole`)**: Verifies Bearer JWT (`{ id, role, tokenVersion }`), reloads user from MongoDB, rejects missing/deactivated users or mismatched `tokenVersion` with `401 UNAUTHENTICATED`, and enforces role allow-lists with `403 FORBIDDEN`.
7. **404 & Error Handling**: `notFoundMiddleware` forwards `404 NOT_FOUND`; `errorMiddleware` normalizes `ApiError`, malformed JSON (`400 VALIDATION_ERROR`), Mongoose `CastError`/`ValidationError`/`11000` (`409 CONFLICT`), and unexpected `500 INTERNAL_ERROR` into `{ success: false, error: { code, message, details } }`, omitting `stack` when `NODE_ENV === 'production'`.

---

## 6. REST API Routes & Contract

### A. System Monitoring & Server Clock
- **`GET /api/health`**
  - **Access**: Public
  - **Response (200 OK)**:
    ```json
    {
      "success": true,
      "data": {
        "status": "healthy",
        "db": "connected",
        "uptime": 124.5,
        "serverNow": "2026-11-27T00:00:00.000Z"
      }
    }
    ```
- **`GET /api/time`**
  - **Access**: Public
  - **Response (200 OK)**:
    ```json
    {
      "success": true,
      "data": {
        "serverNow": "2026-11-27T00:00:00.000Z"
      }
    }
    ```

### B. Authentication Routes (`/api/auth`)
- **`POST /api/auth/login`**
  - **Access**: Public (`authLimiter`: 5 req/min/IP)
  - **Body**: `{ "email": "alice@sems.edu", "password": "password123" }`
  - **Response (200 OK)**:
    ```json
    {
      "success": true,
      "data": {
        "token": "eyJhbGciOiJIUzI1Ni...",
        "user": {
          "id": "6745f412...",
          "name": "Alice",
          "email": "alice@sems.edu",
          "role": "candidate",
          "isActive": true,
          "preferences": { "theme": "dark", "fontScale": "md", "layout": "standard", "showTimer": true, "highContrast": false }
        }
      }
    }
    ```
  - **Errors**: Uniform `401 UNAUTHENTICATED` (`Invalid email or password`) for unknown email or wrong password; `403 FORBIDDEN` (`Account is deactivated`) after valid password if `isActive: false`.
- **`POST /api/auth/register`**
  - **Access**: Public (`authLimiter`), gated by `ALLOW_SELF_REGISTER=true` (returns `403 FORBIDDEN` when disabled). Always creates `role: 'candidate'`; unknown fields (e.g. `role`) rejected with `400 VALIDATION_ERROR`.
  - **Body**: `{ "name": "Alice", "email": "alice@sems.edu", "password": "password123", "rollNo": "SEMS-101" }`
  - **Response (201 Created)**: `{ "success": true, "data": { "token": "...", "user": { ... } } }`
- **`GET /api/auth/me`**
  - **Access**: Protected (`Authorization: Bearer <token>`, `requireAuth`)
  - **Response (200 OK)**: `{ "success": true, "data": { "user": { ... } } }`
- **`PATCH /api/auth/password`**
  - **Access**: Protected (`requireAuth`)
  - **Body**: `{ "currentPassword": "...", "newPassword": "..." }`
  - **Response (200 OK)**: `{ "success": true, "data": { "message": "Password updated successfully", "token": "<new-jwt>", "user": { ... } } }` (bumps `tokenVersion`, invalidating prior JWTs).

### B2. Admin User Management Routes (`/api/admin`, `requireAuth` + `requireRole('admin')`)
- **`GET /api/admin/users`** — Query params: `role` (`admin|examiner|candidate`), `isActive` (`true|false`), `q` (search `name`/`email`/`rollNo`), `page` (default `1`), `limit` (default `20`, max `100`). Returns `{ users, pagination: { page, limit, total, totalPages } }`.
- **`POST /api/admin/users`** — Body: `{ name, email, password, role, rollNo? }`. Returns `201 { user }` (`409 CONFLICT` on duplicate email).
- **`PATCH /api/admin/users/:id`** — Body: `{ name?, role?, isActive?, rollNo? }`. Bumps `tokenVersion` on role change or deactivation (`isActive: false`), immediately revoking active JWTs. Blocks admin self-demotion/self-deactivation (`409 CONFLICT`).
- **`POST /api/admin/users/:id/reset-password`** — Body: `{ newPassword }`. Resets password and bumps `tokenVersion`.
- **`GET /api/admin/overview`** — Returns `{ users: { total, active, inactive, byRole: { admin, examiner, candidate } }, exams: <number>, attempts: <number> }`.
- **Seed Script (`npm run seed`)**: Idempotently seeds 13 accounts (`admin@sems.edu`, `examiner1@sems.edu`, `examiner2@sems.edu`, `candidate1@sems.edu`..`candidate10@sems.edu` with roll numbers `SEMS-2026-001`..`SEMS-2026-010`, default password `Pass1234!`), 36 questions across 4 topics (`Algorithms`, `Databases`, `Networks`, `Security`) and 3 difficulties (`easy`, `medium`, `hard`), and 4 exams covering all lifecycle states (`completed` with graded attempts + published results + `ReportVerification` HMAC code, `ongoing` with stratified `blueprint.poolMode: true`, `upcoming`, and `draft`), without ever wiping existing data.

### B3. Question Bank Routes (`/api/questions`, `requireAuth` + `requireRole('examiner', 'admin')`)
- **`GET /api/questions`** — Scoped to `createdBy` for examiners (all for admin). Query params: `topic`, `difficulty` (`easy|medium|hard`), `type` (`single|multiple|written`), `includeArchived` (`true|false`, default `false`), `q` (search `text`/`topic`), `page`, `limit`. Returns `{ questions, pagination }`.
- **`POST /api/questions`** — Body: `{ type, text, options?: [{ text }], correctOptionIndexes?: number[], topic, difficulty, marks, scheme?: { mode, negativeMarks }, rubric?, explanation? }`. Enforces per-type consistency (`single`: 2–8 options & 1 index; `multiple`: 2–8 options & >=1 unique indexes; `written`: no options/indexes). Returns `201 { question }`.
- **`GET /api/questions/topics`** — Returns `{ topics: string[] }` (sorted distinct active topics scoped to caller, or all for admin).
- **`GET /api/questions/:id`** — Returns `{ question }` including `correctOptionIds` (`403 FORBIDDEN` if non-owner examiner).
- **`PATCH /api/questions/:id`** — Updates fields, re-maps/re-validates `(type, options, correctOptionIndexes)` consistency, enforces ownership.
- **`DELETE /api/questions/:id`** — Soft-archives (`isArchived: true`) without deleting DB document; enforces ownership.

### B4. Exam Management & Lifecycle Routes (`/api/exams`, `requireAuth` + `requireRole('examiner', 'admin')`)
- **`GET /api/exams`** — Scoped to `createdBy` for examiners (all for admin). Query params: `status` (`draft|published|ongoing|completed|cancelled`), `page`, `limit`. Returns `{ exams, pagination }`.
- **`POST /api/exams`** — Creates a `draft` exam (`totalMarks: 0`). Body: `{ title, instructions?, startAt, endAt, durationMinutes, settings? }`. Returns `201 { exam }`.
- **`GET /api/exams/:id`** — Returns `{ exam }` with `effectiveStatus` and active `enrolledCount` (`403 FORBIDDEN` if non-owner examiner).
- **`PATCH /api/exams/:id`** — Updates draft fields freely; on `published` exams permits only `title`, `instructions`, extended `endAt`, and `settings.showScoreImmediately` (locked edits return `409 CONFLICT`); blocks edits on `completed`/`cancelled` exams (`409 CONFLICT`).
- **`DELETE /api/exams/:id`** — Deletes `draft` exam and its enrollments (`{ deleted: true, examId }`), or sets `published` exam to `status: 'cancelled'` (`{ exam }`); rejects `completed`/`cancelled` (`409 CONFLICT`).
- **`PUT /api/exams/:id/questions`** — Replaces draft exam ordered question list `{ questions: [{ questionId, marks? }] }`, checks ownership & active status (`403`/`400`/`409`), assigns `order: 0..n-1`, recomputes `totalMarks`. Returns `{ exam }`.
- **`GET /api/exams/:id/readiness`** — Evaluates `{ ready, checks: { hasQuestions, validWindow, positiveTotalMarks, hasEnrollments, hasWrittenQuestions }, blockers, warnings }`.
- **`POST /api/exams/:id/publish`** — Transitions `draft` -> `published` with `publishedAt` if `ready === true`, or returns `409 CONFLICT` with blocker details. Returns `{ exam, readiness }`.
- **`POST /api/exams/:id/complete`** — Transitions `published` -> `completed` (`409 CONFLICT` otherwise) and finalizes any active `in_progress` attempts (`finalizedBy: 'examiner'`). Returns `{ exam }`.
- **`PUT /api/exams/:id/blueprint`** — Updates `{ easy, medium, hard, poolMode }` while in `draft` (`409 CONFLICT` otherwise). Returns `{ exam }`.

### B5. Enrollment & Candidate Directory Routes (`requireAuth` + `requireRole('examiner', 'admin')`)
- **`GET /api/exams/:id/enrollments`** — Lists exam enrollments with populated `candidate` DTO; optional `?status=active|removed`. Returns `{ enrollments }`.
- **`POST /api/exams/:id/enrollments`** — Body `{ userIds?: string[], emails?: string[] }`. Validates all targets are active `candidate` accounts (`400 BAD_REQUEST` otherwise) and upserts/reactivates enrollments idempotently. Returns `{ enrolledCount, alreadyEnrolledCount, enrollments }`.
- **`DELETE /api/exams/:id/enrollments/:userId`** — Soft-removes enrollment (`status: 'removed'`); blocks with `409 CONFLICT` if the candidate has already started a real attempt. Returns `{ enrollment }`.
- **`GET /api/candidates`** — Searches active `role: 'candidate'` users by `?q=` (`name`, `email`, `rollNo`) with pagination (`page`, `limit`). Returns `{ candidates, pagination }`.

### B6. Candidate Exam & Attempt Engine Routes (`requireAuth` + `requireRole('candidate')`)
- **`GET /api/candidate/exams`** — Lists candidate's active enrollments (excluding drafts) grouped into `{ available, upcoming, completed, serverNow }` with `accessStatus` (`ready|in_progress|submitted|expired|upcoming|closed|cancelled`) and `accessReason`.
- **`GET /api/candidate/exams/:id`** — Returns enrolled candidate exam instructions, window, settings, `accessStatus`, and `serverNow` without questions (`403 NOT_ENROLLED` / `409 EXAM_NOT_PUBLISHED`).
- **`POST /api/candidate/exams/:id/start`** — Enforces active enrollment (`403 NOT_ENROLLED`), published + `ongoing` status (`409 EXAM_NOT_PUBLISHED`/`409 EXAM_NOT_AVAILABLE`), freezes `paper` snapshot without `correctOptionIds`, computes `deadlineAt` (`strictEnd` caps at `endAt`), and resumes active attempts idempotently. Returns `201` on start or `200` on resume (`{ attempt, resumed }`).
- **`GET /api/attempts/:id`** — Ownership check (`403 FORBIDDEN`) + lazy expiry check; returns `{ attempt }` with live `serverNow` and `remainingMs`.
- **`PUT /api/attempts/:id/answers`** — Body `{ answers: [{ questionId, selectedOptionIds?, text?, markedForReview?, seq }], offlineBuffered?, clientSavedAt? }`. Runs bounded reconnect-grace validation (`offlineBuffered === true`, within `RECONNECT_GRACE_SECONDS`, `startedAt <= clientSavedAt <= deadlineAt`, `lastHeartbeatAt <= deadlineAt`) without extending `deadlineAt`, otherwise enforces `409 ATTEMPT_EXPIRED`. Validates question/option membership (`400 BAD_REQUEST`) and `seq > existing.seq` (`STALE_SAVE`), returning `{ saved, rejected, finalizedByGrace?, remainingMs, serverNow }`.
- **`PUT /api/attempts/:id/scratchpad`** — Body `{ text }`. Saves candidate scratchpad notes on an active attempt (lazy expiry enforced). Returns `{ scratchpad, serverNow }`.
- **`POST /api/attempts/:id/heartbeat`** — Updates `lastHeartbeatAt`, appends `connectionGaps` when elapsed heartbeat interval exceeds 60s, runs lazy expiry, and returns `{ remainingMs, serverNow, announcements }` (optionally filtered by body `since`).
- **`POST /api/attempts/:id/events`** — Body `{ type, details? }`. Records neutral session event indicators (`Incident`) on active attempts (`201 { incident }`; capped at 50 events per attempt -> `429 RATE_LIMITED`).
- **`POST /api/attempts/:id/submit`** — Atomically finalizes an `in_progress` attempt once (`submitted` or `expired` if overdue), triggers auto-grading, and handles concurrent/repeated calls idempotently (`200 { attempt, alreadySubmitted }`).

### B7. Grading, Result Publishing & Analytics Routes
- **`GET /api/exams/:id/submissions`** (`examiner|admin` owner) — Sweeps overdue attempts and lists all real candidate attempts with status, `gradingStatus`, `totalScore`, `maxScore`, and `percentage`.
- **`GET /api/attempts/:id/grading`** (`examiner|admin` owner) — Returns full attempt grading review including `paper` (with `correctOptionIds`), `answers`, and `grades`.
- **`PUT /api/attempts/:id/grades/:questionId`** (`examiner|admin` owner) — Body `{ score, feedback? }`. Validates `0 <= score <= maxMarks` (`400 SCORE_OUT_OF_RANGE`), recomputes totals & `gradingStatus` (`complete` -> `status: 'graded'`), logs `AuditLog('manual_grade')`.
- **`POST /api/exams/:id/regrade`** (`examiner|admin` owner) — Re-runs objective auto-grading across all finalized real attempts while preserving manual scores (`AuditLog('regrade')`).
- **`GET /api/exams/:id/results/preview`** (`examiner|admin` owner) — Returns `{ totalAttempts, gradedCount, pendingManualCount, inProgressCount, blockers, readyToPublish }`.
- **`POST /api/exams/:id/results/publish`** (`examiner|admin` owner) — Body `{ force?: boolean }`. Blocks with `409 GRADING_INCOMPLETE` if `pendingManualCount > 0 && !force`; otherwise sets `resultsPublished = true` and `resultsPublishedAt`.
- **`POST /api/exams/:id/results/unpublish`** (`examiner|admin` owner) — Sets `resultsPublished = false` and logs audit entry.
- **`GET /api/exams/:id/analytics`** (`examiner|admin` owner) — Computes `{ attemptCount, gradedCount, mean, median, min, max, passRate, scoreHistogram, completionRate, avgTimeMinutes }` across real finalized attempts.
- **`GET /api/candidate/results`** (`candidate`) — Lists candidate's finalized attempts whose exam has `resultsPublished: true`.
- **`GET /api/candidate/results/:attemptId`** (`candidate` owner) — Enforces ownership (`403 FORBIDDEN`) and published results (`403 RESULTS_NOT_PUBLISHED`); returns score breakdown, `grades`, and `answers` without `correctOptionIds`.

### B8. Live Monitoring, Incidents & Announcements Routes
- **`GET /api/exams/:id/monitor`** (`examiner|admin` owner) — Sweeps overdue attempts and returns live session telemetry (`answeredCount`, `totalQuestions`, `remainingMs`, `lastHeartbeatAt`, `connectionGapCount`, `incidentCount`, `status`).
- **`GET /api/exams/:id/incidents`** (`examiner|admin` owner) — Query params: `type`, `reviewStatus`, `userId`. Returns recorded neutral event indicators (`{ incidents }`, excluding sandbox attempts).
- **`PATCH /api/incidents/:id`** (`examiner|admin` owner) — Body `{ reviewStatus: 'new'|'reviewed'|'dismissed', reviewerNote? }`. Updates incident triage state and logs `AuditLog('review_incident')`.
- **`POST /api/exams/:id/announcements`** (`examiner|admin` owner) — Body `{ message }`. Creates exam-wide announcement (`201 { announcement }`) delivered on candidate heartbeats.
- **`GET /api/exams/:id/announcements`** (`examiner|admin` owner OR actively enrolled `candidate`) — Lists announcements sorted newest first (`403 NOT_ENROLLED` if unenrolled candidate).

### B9. Preferences, Sandbox, Question Analytics & Bulk Import Routes
- **`GET /api/me/preferences`** (`candidate|examiner|admin`) — Returns authenticated user's `{ preferences }`.
- **`PUT /api/me/preferences`** (`candidate|examiner|admin`) — Strictly validates and updates `{ theme?: 'light'|'dark'|'system', fontScale?: 'sm'|'md'|'lg', layout?: 'standard'|'compact'|'split', showTimer?: boolean, highContrast?: boolean }`.
- **`POST /api/exams/:id/sandbox/start`** (`examiner|admin` owner) — Launches an isolated `isSandbox: true` attempt on a `draft` or `published` exam containing >= 1 question (`201 { attempt }`, excluded from analytics/submissions/monitor/overview); `/api/attempts/*` session routes accept sandbox owners (or admins).
- **`DELETE /api/exams/:id/sandbox`** (`examiner|admin` owner) — Removes caller's sandbox attempts and sandbox incidents for that exam (`{ deletedCount }`).
- **`GET /api/exams/:id/questions/analytics`** (`examiner|admin` owner) — Sweeps overdue real attempts and returns per-question `totalAttempts`, `answeredCount`, `skippedCount`, `skippedRate`, `correctCount`, `correctRate`, `avgScore`, `observedDifficulty` (`uncalibrated|easy|medium|hard`), `flaggedAmbiguous`, `ambiguityReason`, and `optionDistribution`.
- **`POST /api/questions/import`** (`examiner|admin`) — Bulk imports up to 500 questions from `{ format: 'csv'|'json', content, dryRun? }` (or `?dryRun=true`); reports row-level errors without aborting valid rows (`{ total, imported, failed, dryRun, errors, questionIds }`).
- **`POST /api/exams/:id/enrollments/import`** (`examiner|admin` owner) — Bulk enrolls up to 500 candidates from CSV/JSON with optional `createMissingCandidates: true`; rejects non-candidate roles in `errors` (`{ total, imported, alreadyEnrolled, createdUsers, failed, dryRun, errors }`).

### B10. PDF Reports, CSV Export, QR Verification & Fairness Routes
- **`GET /api/exams/:id/report.pdf`** (`examiner|admin` owner) — Streams valid `%PDF-` (`Content-Type: application/pdf`) exam summary report via `pdfkit` with performance metrics and question calibration.
- **`GET /api/exams/:id/results.csv`** (`examiner|admin` owner) — Exports formula-safe (`=`, `+`, `-`, `@`, `\t`, `\r` prefixed with `'`) CSV results (`Content-Type: text/csv; charset=utf-8`) across real (`isSandbox: false`) attempts.
- **`GET /api/attempts/:id/report.pdf`** (`candidate` owner once `resultsPublished: true`, or `examiner|admin` owner) — Blocks sandbox/`in_progress` (`409`) and unpublished candidate views (`403 RESULTS_NOT_PUBLISHED`); streams verifiable `%PDF-` score report embedding a QR code PNG and HMAC verification code.
- **`GET /api/verify/:code`** (Public, `apiLimiter`) — Verifies signature via `crypto.timingSafeEqual`; returns `{ valid: false }` if missing/tampered, or non-PII `{ valid: true, code, examTitle, issuedAt, score, candidateMasked, rollNoMasked? }`.
- **`GET /api/exams/:id/fairness`** (`examiner|admin` owner) — Reports `{ attemptCount, uniqueFingerprints, strataConfigured, difficultyIndexStats: { min, max, mean, spread }, fairnessStatus }` across real attempts.

### B11. Standout Security & Dispute Resolution Routes (`5.1`, `5.4`)
- **Single-Session Guard (`x-session-id` header)**: Candidate `start`, `autosave`, and `heartbeat` accept optional `x-session-id` header; switching session IDs updates `activeSessionId` and records a neutral `multiple_sessions` indicator without interrupting legitimate reconnects.
- **`POST /api/attempts/:id/disputes`** (`candidate` owner) — Submits `{ questionId, reason }` once results are published (`201 { dispute }`, `409 CONFLICT` on duplicate, `403 RESULTS_NOT_PUBLISHED` prior to publication).
- **`GET /api/attempts/:id/disputes`** (`candidate` owner, or `examiner|admin` owner) — Lists disputes filed on an attempt.
- **`GET /api/exams/:id/disputes`** (`examiner|admin` owner) — Lists exam disputes with optional `?status=` filter, candidate details, and question summary.
- **`PATCH /api/disputes/:id/resolve`** (`examiner|admin` owner) — Body `{ status: 'accepted'|'rejected', resolutionNote?, adjustedScore? }`; updates attempt score/totals when accepted with `adjustedScore`, refreshes any existing `ReportVerification` HMAC/snapshot, and logs `AuditLog('resolve_dispute')`.

### C. OpenRouter AI Routes (`/api/ai`)
- **`POST /api/ai/test`**
  - **Access**: Public
  - **Body**:
    ```json
    {
      "prompt": "Explain why decoupled MERN architectures are ideal for hackathons."
    }
    ```
  - **Response (200 OK)**:
    ```json
    {
      "success": true,
      "data": {
        "content": "Decoupled MERN architectures are ideal for hackathons because...",
        "model": "google/gemini-2.5-flash",
        "mock": false,
        "usage": {
          "prompt_tokens": 18,
          "completion_tokens": 85,
          "total_tokens": 103
        }
      }
    }
    ```
  - **Error (429 Rate Limit)**:
    ```json
    {
      "success": false,
      "message": "OpenRouter rate limit exceeded. Please retry shortly."
    }
    ```
  - **Error (400 Bad Request)**:
    ```json
    {
      "success": false,
      "message": "Prompt is required and cannot be empty"
    }
    ```

---

## 7. Decoupled Handoff & Testing

- The `backend/` folder is 100% self-contained. It contains its own `package.json` and `.env.example`.
- To hand off to a backend teammate:
  1. Zip the `backend/` folder along with `BACKEND.md` and `SECURITY.md`.
  2. The teammate runs `npm install`, creates `.env` from `.env.example`, and runs `npm run dev`.
  3. All routes can be tested immediately using Postman, Thunder Client, or cURL without requiring the frontend to be running.
