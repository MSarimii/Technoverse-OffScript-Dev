# SEMS — Secure Examination Management System

Built for **Technoverse 5.0 / Web-e-Thon** (COMSATS University Lahore, 27–28 Nov 2026).  
SEMS is a decoupled MERN platform for secure high-stakes online assessments featuring server-authoritative timers, frozen paper snapshots, stratified difficulty fairness, bounded reconnect grace, automated & manual grading, and cryptographic QR/HMAC score verification.

---

## Architecture & Tech Stack

- **Backend**: Node.js (ESM), Express `^4.21`, MongoDB & Mongoose, Zod `.strict()` validation, JWT + `tokenVersion` revocation, `helmet`, `express-rate-limit`, `csv-parse`, `pdfkit`, `qrcode`
- **Frontend**: Decoupled React application (`frontend/`, owned independently by Member 1)
- **AI Module**: Isolated OpenRouter integration (`backend/src/services/aiService.js` & `aiRoutes.js`, owned by Member 3)
- **Testing**: Vitest + Supertest (`9` backend integration & security audit suites)

---

## Backend Setup & Run

1. Navigate to `backend/` and install dependencies:
   ```bash
   cd backend
   npm install
   ```
2. Create `backend/.env` from [`backend/.env.example`](backend/.env.example):
   ```bash
   cp .env.example .env
   ```
   Configure required environment variables in `backend/.env`:
   - `MONGO_URI` — MongoDB connection string (Atlas or local `mongod`)
   - `JWT_SECRET` — strong random secret (min 16 characters required in production)
   - `VERIFY_HMAC_SECRET` — dedicated HMAC-SHA256 secret for verifiable PDF score certificates
   - `CLIENT_URL` — comma-separated CORS origin allow-list (e.g. `http://localhost:5173`)
   - `RECONNECT_GRACE_SECONDS` — reconnect grace cap per qualifying outage (default `30`, max `120`)
   - `ALLOW_SELF_REGISTER` — `false` (default) to enforce admin-provisioned onboarding, or `true` for candidate self-registration
   - `MONGODB_TEST_URI` — dedicated test database URI used by `npm test`
3. Start the API server:
   ```bash
   npm run dev     # development (auto-restart)
   npm start       # production
   ```
4. Seed demo dataset idempotently (safe to re-run, never wipes existing data):
   ```bash
   npm run seed
   ```
5. Run the backend test suite:
   ```bash
   MONGODB_TEST_URI="mongodb://127.0.0.1:27017/sems_test" npm test
   ```

---

## Demo Test Credentials

All seeded demo accounts use password `Pass1234!` (overridable via `SEED_DEFAULT_PASSWORD` before running `npm run seed`):

| Role | Email | Notes |
| --- | --- | --- |
| **Admin** | `admin@sems.edu` | System overview, user provisioning, role/status management |
| **Examiner 1** | `examiner1@sems.edu` | Owns 36 demo questions & 4 demo exams (Completed, Ongoing, Upcoming, Draft) |
| **Examiner 2** | `examiner2@sems.edu` | Secondary examiner account for multi-examiner & IDOR testing |
| **Candidate 1–10** | `candidate1@sems.edu` … `candidate10@sems.edu` | Roll numbers `SEMS-2026-001` … `SEMS-2026-010` |

### What `npm run seed` Provisions
- **13 Users**: `1` admin, `2` examiners, `10` candidates
- **36 Questions**: `4` topics (`Algorithms`, `Databases`, `Networks`, `Security`) × `3` difficulties (`easy`, `medium`, `hard`), spanning `single`, `multiple` (`all_or_nothing` + negative marking & `partial`), and `written` questions with rubrics
- **4 Lifecycle Exams**:
  - **Completed Exam** (`resultsPublished: true`): finalized & graded attempts (`single`, `multiple`, manual `written`), `Announcement`, dismissed `Incident`, `AuditLog`, and HMAC `ReportVerification` (code printed at seed completion for `/api/verify/:code`)
  - **Ongoing Exam**: live window with `blueprint.poolMode: true` (`easy: 2, medium: 2, hard: 1`) across 10 enrolled candidates
  - **Upcoming Exam**: future scheduled exam (`candidate1`–`candidate6` enrolled)
  - **Draft Exam**: pre-populated draft ready for Readiness, Sandbox, and Publish demos

---

## Key Innovations (5.2 & 5.3)

### 5.2 Difficulty-Stratified Fairness (`paperBuilder.js` + `fairnessService.js`)
When `blueprint.poolMode` is enabled, SEMS draws a balanced per-candidate question set respecting configured `{ easy, medium, hard }` quotas, computes a SHA-256 `paperFingerprint` over question/option ordering, records a deterministic `paperDifficultyIndex`, and exposes spread/uniqueness audits via `GET /api/exams/:id/fairness` so randomized papers remain statistically equivalent in difficulty.

### 5.3 Bounded Reconnect-Grace Resilience (`attemptService.js` + `attemptSweeper.js`)
Candidate heartbeats detect transient disconnect gaps exceeding the heartbeat interval. When a candidate resumes before `endAt`, bounded non-overlapping reconnect grace (capped per gap at `min(gapMs, RECONNECT_GRACE_SECONDS * 1000)` and bounded overall by `exam.endAt` and `50%` of exam duration) is credited once per gap window, preventing brief network drops from unfairly expiring active attempts while preserving strict exam deadlines.

---

## Further Documentation

- Backend contract & routes: [`BACKEND.md`](BACKEND.md)
- Security architecture: [`SECURITY.md`](SECURITY.md)
- Innovation design details: [`INNOVATION_NOTES.md`](INNOVATION_NOTES.md)
