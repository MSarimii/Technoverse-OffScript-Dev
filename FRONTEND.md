# Frontend Architecture & Specification (`FRONTEND.md`)

This document defines the frontend technical architecture, SEMS design tokens, UI component inventory, accessibility/security guarantees, runbook, and REST API contract consumed by the React (Vite) frontend.

---

## 1. Runbook & Environment Variables

```bash
cd frontend
npm install
npm test        # Runs unit tests (ServerClock, error mapping, CSV sanitizer, palette state)
npm run dev     # Starts Vite dev server at http://localhost:5173
npm run build   # Builds production bundle to frontend/dist/
```

- **Environment Variables (`frontend/.env.example`)**:
  - `VITE_API_URL=http://localhost:5000/api`
  - `VITE_USE_MOCK=true` *(Safety-net mock mode for offline demos; set `VITE_USE_MOCK=false` to connect to the live backend.)*

---

## 2. Design System & Tokens ("Oxford Parchment & Emerald" Light Luxury Default)

- **Self-Hosted Fonts (`@fontsource`)**: `Instrument Serif` (display, `-0.01em` tracking, `1.06` line-height), `Inter Tight` (UI/body, `400/500/600`), `JetBrains Mono` (`tabular-nums` timers, IDs, scores).
- **Light Theme (Default)**: `--bg: #F8F7F3` (warm alabaster), `--surface: #FFFFFF`, `--surface-2: #EFECE4`, `--ink: #121714`, `--muted: #5B635E`, `--accent: #143D2F` (emerald, hover `#1D5441`, text `#FFFFFF`), `--champagne: #A6834B` (burnished brass), `--line: rgba(18,23,20,0.08)`, `--focus: #143D2F`.
- **Dark Theme (`data-theme="dark"`)**: `--bg: #070A14`, `--surface: #0C1122`, `--surface-2: #121933`, `--ink: #F4EFE6`, `--muted: #B9B3A6`, `--champagne: #CBA96B`, `--line: rgba(244,239,230,0.12)`, `--focus: #CBA96B`.
- **WCAG AA Contrast Verification**:
  - Light `#121714` on `#F8F7F3` (~16.6:1), `#5B635E` on `#FFFFFF` (~6.1:1), `#FFFFFF` on `#143D2F` (~12.4:1).
  - Dark `#F4EFE6` on `#070A14` (~17.1:1), `#B9B3A6` on `#0C1122` (~8.4:1), `#070A14` on `#F4EFE6` (~17.1:1).
- **Intentionally Calm Zone**: Exam Workspace (`/candidate/exam/*`) disables film-grain overlay, glassmorphism, and decorative motion; only opacity/transform micro-feedback and `aria-live` updates remain.
- **Landing Structure**: Glass navbar (`DEV MOCK` badge hidden in production), asymmetric 2-column hero with Live Product Stage (HTML/CSS/SVG), credibility strip, 3-chapter lazy-loaded `ScrollTrigger` + `Lenis` story, editorial role rows, and closing CTA band.

---

## 3. UI Component Inventory (`frontend/src/components/ui/`)

- **Actions**: `Button`, `IconButton`
- **Forms**: `Input`, `Textarea`, `Select`, `Checkbox`, `Radio`, `Switch`
- **Feedback**: `Badge`, `StatusChip`, `ProgressRing`, `Skeleton`, `EmptyState`, `ErrorState`, `Toaster`
- **Overlays & Data**: `Tabs`, `Dialog`, `Drawer`, `Popover`, `Tooltip`, `Table`

---

## 4. Route Map

- **Public**: `/`, `/login`, `/verify/:verificationId`, `*` (404), `/_design` (dev-only QA route, excluded from production builds)
- **Admin**: `/admin/users`
- **Examiner**: `/examiner`, `/examiner/questions`, `/examiner/exams/new`, `/examiner/exams/:id`, `/examiner/exams/:id/edit`, `/examiner/exams/:id/monitor`, `/examiner/exams/:id/grading`, `/examiner/exams/:id/analytics`, `/examiner/exams/:id/fairness`
- **Candidate**: `/candidate`, `/candidate/exams`, `/candidate/exams/:examId`, `/candidate/exam/:examId`, `/candidate/results`, `/candidate/results/:attemptId`

---

## 5. Accessibility, Security & Known Limitations

- **Accessibility**: Full keyboard navigation, visible 2px focus rings, skip-to-content link, `aria-live` regions for timer/save-status/announcements, state conveyed by shape + color, `44px+` touch targets, `360px–1440px+` responsive layouts, `prefers-reduced-motion` and `prefers-reduced-transparency` respected.
- **Security**: Zero `dangerouslySetInnerHTML`; CSV/JSON imports capped at 5 MB / 5,000 rows with `= + - @` formula-injection neutralization (`lib/csv.js`). JWT bearer is held in memory + `sessionStorage` for refresh survival (mitigating cross-session persistence; XSS prevented by strict escaping and recommended CSP).
- **Known Limitations**: Live backend integration (`VITE_USE_MOCK=false`) awaits deployment of the backend SEMS routes (`backend/src/routes/`).

---

## 6. Contract Requests

### 5.4 Trust & Dispute Resolution (Proposed for Backend)
1. `POST /api/attempts/:attemptId/disputes` (Candidate, own published attempt only)
   - Body: `{ "questionId": "q-8", "category": "grading_error|ambiguous_question|technical_incident", "explanation": "..." }`
   - Response (201): `{ "success": true, "data": { "dispute": { "id": "...", "status": "submitted", ... } } }`
2. `GET /api/exams/:examId/disputes` (Examiner, own exam only)
   - Response (200): `{ "success": true, "data": { "disputes": [...] } }`
3. `PATCH /api/disputes/:disputeId/resolve` (Examiner, own exam only)
   - Body: `{ "status": "resolved|rejected", "reason": "Required resolution note", "newMarks": 5 }`
   - Behavior: If `newMarks` is supplied, appends a new entry to `attempt.gradeVersions[]` (`{ version, score, reason, at, by }`) without overwriting the original grade.
