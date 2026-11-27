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

## 2. Design System & Tokens ("Calm Examination Hall")

- **Self-Hosted Fonts (`@fontsource`)**: `Instrument Serif` (display), `IBM Plex Sans` (UI/body), `JetBrains Mono` (`tabular-nums` timers, IDs, scores).
- **Light Theme (Default)**: `--bg: #F6F3EC`, `--surface: #FFFFFF`, `--surface-2: #FBF9F4`, `--ink: #0B1020`, `--muted: #5B6275`, `--line: #E3DFD4`, `--focus: #2F5BFF`
- **Dark Theme (`data-theme="dark"` / `system`)**: `--bg: #0B1020`, `--surface: #141A2E`, `--surface-2: #1A2240`, `--ink: #E8EAF2`, `--muted: #9AA3BD`, `--line: #262D47`, `--focus: #6C8BFF`
- **WCAG AA Contrast Verification**:
  - Light `#0B1020` on `#F6F3EC` (~16.8:1), `#5B6275` on `#FFFFFF` (~6.1:1), `#FFFFFF` on `#2F5BFF` (~4.8:1).
  - Dark `#E8EAF2` on `#0B1020` (~15.4:1), `#9AA3BD` on `#141A2E` (~6.4:1).
- **Semantic Status (Color + Shape)**: Cobalt `#2F5BFF`, Amber `#F5A524` (Flag), Green `#1F9D66` (Check), Red `#D64545` (Alert / Dashed Ring), Violet `#7A5CFF` (Current Question Ring).

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
