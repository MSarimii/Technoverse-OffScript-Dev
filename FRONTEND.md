# Frontend Architecture & Specification (`FRONTEND.md`)

This document defines the frontend technical architecture, SEMS design tokens, route hierarchy, and REST API contract consumed by the React (Vite) frontend.

---

## 1. Architecture Overview

- **Framework**: React 18+ with **Vite** (`frontend/`), **React Router v6**, **Tailwind CSS**, **Axios**, **Lucide Icons**, and **Sonner** toasts.
- **Mock-First Switch**: `VITE_USE_MOCK=true|false` in `frontend/.env` (defaults to `true` when unset or `'true'`) routes all domain service calls through `src/services/mockApi.js` backed by `localStorage` so frontend development and demos work 100% independently of the backend.
- **Role-Based Access (UX Guard)**: `admin`, `examiner`, `candidate`. Backend remains the sole security authority.

---

## 2. Design System & Tokens (High-Legibility Academic Precision)

- **Default Theme (`paper`)**:
  - `--bg-canvas`: `#F7F6F2` (warm archival paper)
  - `--bg-surface`: `#FFFFFF`
  - `--bg-subtle`: `#EFECE6`
  - `--ink-primary`: `#111827`
  - `--ink-secondary`: `#4B5563`
  - `--accent-primary`: `#1E3A8A` (academic navy)
- **Workspace Theme Overrides**: `data-theme="dark"` and `data-theme="high-contrast"` for **4.7 Customizable Examination Workspace**.
- **Semantic Question Palette States (Color + Shape)**:
  - `answered`: `--status-answered` (`#047857`) + filled circle / check
  - `review`: `--status-review` (`#B45309`) + flag
  - `unanswered`: `--status-unanswered` (`#6B7280`) + hollow square
  - `current`: bold navy ring
- **Typography**: `Plus Jakarta Sans` (UI/body), `Instrument Serif` (editorial display), `JetBrains Mono` (`tabular-nums` timers, scores, verification IDs).
- **Motion Discipline**: Zero decorative motion inside the timed Exam Workspace. `prefers-reduced-motion` is respected globally.

---

## 3. Route Map

| Route | Role | Purpose |
|---|---|---|
| `/` | Public | SEMS overview & quick navigation |
| `/login` | Public | Role-aware sign-in (+ mock demo role switcher) |
| `/verify/:verificationId` | Public | Minimum-data QR report verification |
| `/admin/users` | `admin` | User provisioning, role & active status management |
| `/examiner` | `examiner` | Exam dashboard & sandbox launcher |
| `/examiner/questions` | `examiner` | Question bank & CSV/JSON bulk import |
| `/examiner/exams/new`, `/examiner/exams/:id/edit` | `examiner` | 4-step Exam Wizard + 5.2 Blueprint Randomization |
| `/examiner/exams/:id/monitor` | `examiner` | 4s polling live monitor, connectivity ledger, incidents, announcements |
| `/examiner/exams/:id/grading` | `examiner` | Objective breakdown, manual written grading, AI suggest, publish gate |
| `/examiner/exams/:id/analytics` | `examiner` | Score summary, Question Analytics (4.5), Fairness Spread (5.2), PDF report |
| `/candidate` | `candidate` | Available / Upcoming / Completed exams |
| `/candidate/exam/:examId` | `candidate` / `examiner` (sandbox) | Distraction-free Exam Workspace (5.3 offline queue, server timer, scratchpad, preferences) |
| `/candidate/results`, `/candidate/results/:attemptId` | `candidate` | Published results, PDF report download, QR verification link |

---

## 4. API Consumption Contract

- **Env Vars (`frontend/.env.example`)**:
  - `VITE_API_URL=http://localhost:5000/api`
  - `VITE_USE_MOCK=true`
- **Authorization**: `Authorization: Bearer <jwt>`
- **Standard Error Shape**:
  ```json
  {
    "error": {
      "code": "EXAM_NOT_AVAILABLE",
      "message": "Human readable message",
      "fields": {}
    }
  }
  ```
- **Offline Queue Contract (Innovation 5.3)**:
  - `PUT /api/attempts/:id/answers` sends `{ answers: [{ qid, value, seq, clientElapsedMs }] }`.
  - Server returns `{ attemptId, serverTime, deadlineAt, acceptedSeqs, lateSyncedSeqs }`.
