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

## 2. Design System & Tokens ("Quiet Luxury / Editorial Institution")

- **Self-Hosted Fonts (`@fontsource`)**: `Instrument Serif` (display, `-0.01em` tracking, `1.06` line-height), `Inter Tight` (UI/body, `400/500/600`), `JetBrains Mono` (`tabular-nums` timers, IDs, scores).
- **Dark Theme (Default Brand Layer)**: `--bg: #070A14`, `--surface: #0C1122`, `--surface-2: #121933`, `--ink: #F4EFE6`, `--muted: #B9B3A6`, `--champagne: #CBA96B`, `--line: rgba(244,239,230,0.12)`, `--focus: #CBA96B`
- **Light Theme (`data-theme="light"`)**: `--bg: #F6F2EA`, `--surface: #FFFFFF`, `--surface-2: #FBF9F4`, `--ink: #0B1020`, `--muted: #52586A`, `--champagne: #8E7440`, `--line: rgba(11,16,32,0.12)`, `--focus: #8E7440`
- **WCAG AA Contrast Verification**:
  - Dark `#F4EFE6` on `#070A14` (~17.1:1), `#B9B3A6` on `#0C1122` (~8.4:1), `#CBA96B` on `#070A14` (~8.9:1), `#070A14` on `#CBA96B` (~8.9:1).
  - Light `#0B1020` on `#F6F2EA` (~16.8:1), `#52586A` on `#FFFFFF` (~6.4:1), `#8E7440` on `#FFFFFF` (~4.6:1).
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
