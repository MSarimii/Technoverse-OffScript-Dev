# Frontend Architecture & Specification (`FRONTEND.md`)

This document defines the frontend technical architecture, SEMS design tokens, UI component inventory, security/accessibility guarantees, and REST API contract consumed by the React (Vite) frontend.

---

## 1. Architecture Overview

- **Framework**: React 18+ with **Vite**, **React Router v6** (route-level `React.lazy` code-splitting), **TanStack React Query**, **React Hook Form + Zod**, **Tailwind CSS**, **Axios**, **Framer Motion**, **GSAP**, **Lucide Icons**, and **Sonner**.
- **Mock-First Switch**: `VITE_USE_MOCK=true|false` in `frontend/.env` (defaults to `true` when unset or `'true'`) routes all domain service calls through `src/mocks/mockApi.js` (re-exported via `src/services/mockApi.js`).
- **Role-Based Access (UX Guard)**: `admin`, `examiner`, `candidate`. Wrong-role routes render a `403` Forbidden view (`ForbiddenPage.jsx`). Backend remains the sole security authority.

---

## 2. Design System & Tokens ("Calm Examination Hall")

- **Self-Hosted Fonts (`@fontsource`)**:
  - Display: `Instrument Serif`
  - UI / Body: `IBM Plex Sans` (`400, 500, 600, 700`)
  - Numerals / Timer / Code: `JetBrains Mono` (`tabular-nums`)
- **Light Theme (Default)**:
  - `--bg`: `#F6F3EC`, `--surface`: `#FFFFFF`, `--surface-2`: `#FBF9F4`, `--ink`: `#0B1020`, `--muted`: `#5B6275`, `--line`: `#E3DFD4`, `--focus`: `#2F5BFF`
- **Dark Theme (`data-theme="dark"` / `system`)**:
  - `--bg`: `#0B1020`, `--surface`: `#141A2E`, `--surface-2`: `#1A2240`, `--ink`: `#E8EAF2`, `--muted`: `#9AA3BD`, `--line`: `#262D47`, `--focus`: `#6C8BFF`
- **WCAG AA Contrast Verification**:
  - Light `#0B1020` on `#F6F3EC` = ~16.8:1 (AAA); `#5B6275` on `#FFFFFF` = ~6.1:1 (AA); `#FFFFFF` on `#2F5BFF` = ~4.8:1 (AA).
  - Dark `#E8EAF2` on `#0B1020` = ~15.4:1 (AAA); `#9AA3BD` on `#141A2E` = ~6.4:1 (AA).
- **Accents & Semantic Status (Color + Shape)**:
  - Cobalt `#2F5BFF`, Amber `#F5A524` (Flag), Green `#1F9D66` (Check), Red `#D64545` (Alert / Dashed Ring), Violet `#7A5CFF` (Current Question Ring).

---

## 3. UI Component Inventory (`frontend/src/components/ui/`)

- **Actions**: `Button`, `IconButton`
- **Forms**: `Input`, `Textarea`, `Select`, `Checkbox`, `Radio`, `Switch`
- **Feedback**: `Badge`, `StatusChip`, `ProgressRing`, `Skeleton`, `EmptyState`, `ErrorState`, `Toaster`
- **Overlays & Data**: `Tabs`, `Dialog`, `Drawer`, `Popover`, `Tooltip`, `Table`

---

## 4. Security, Auth & CSP Notes

- **Token Storage Tradeoff**: JWT bearer tokens are held in memory + `sessionStorage` (`sems_token`) for tab-refresh survival without persisting across browser restarts. This mitigates cross-session exposure compared to `localStorage`, though XSS remains a risk if untrusted HTML were ever rendered—therefore `dangerouslySetInnerHTML` is strictly forbidden and all user/CSV content is escaped (`lib/csv.js` neutralizes `= + - @` formula prefixes and caps imports at 5 MB / 5,000 rows).
- **Recommended Deployment CSP**: `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self' https://your-api-domain;`
- **HTTP Client (`services/api.js`)**: Exponential backoff retry (up to 2 retries) **for idempotent `GET` requests only**; `401` clears session and redirects to login.

---

## 5. Contract Requests

*(No pending contract changes; frontend aligns with `BACKEND.md` and `Master Prompt Pack Part B`.)*
