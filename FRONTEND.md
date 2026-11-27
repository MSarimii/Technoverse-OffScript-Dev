# Frontend Architecture & Specification (`FRONTEND.md`)

This document defines the frontend technical architecture, SEMS design tokens, UI component inventory, route hierarchy, and REST API contract consumed by the React (Vite) frontend.

---

## 1. Architecture Overview

- **Framework**: React 18+ with **Vite**, **React Router v6**, **TanStack React Query**, **React Hook Form + Zod**, **Tailwind CSS**, **Axios**, **Framer Motion**, **GSAP**, **Lucide Icons**, and **Sonner**.
- **Mock-First Switch**: `VITE_USE_MOCK=true|false` in `frontend/.env` (defaults to `true` when unset or `'true'`) routes all domain service calls through `src/mocks/mockApi.js` (re-exported via `src/services/mockApi.js`) backed by `localStorage`.
- **Role-Based Access (UX Guard)**: `admin`, `examiner`, `candidate`. Backend remains the sole security authority.

---

## 2. Design System & Tokens ("Calm Examination Hall")

- **Self-Hosted Fonts (`@fontsource`)**:
  - Display: `Instrument Serif`
  - UI / Body: `IBM Plex Sans`
  - Numerals / Timer / Code: `JetBrains Mono` (`tabular-nums`)
- **Light Theme (Default)**:
  - `--bg-canvas`: `#F6F3EC` (paper)
  - `--bg-surface`: `#FFFFFF`
  - `--bg-subtle`: `#EDE9DF`
  - `--ink-primary`: `#0B1020`
  - `--ink-secondary`: `#5B6275`
  - `--border-line`: `#E3DFD4`
- **Dark Theme (`data-theme="dark"` / `system`)**:
  - `--bg-canvas`: `#0B1020`, `--bg-surface`: `#141A2E`, `--ink-primary`: `#E8EAF2`, `--border-line`: `#262D47`
- **Accents & Semantic Status (Color + Shape)**:
  - Cobalt `#2F5BFF` (primary actions, 2px focus ring)
  - Amber `#F5A524` (marked for review + flag)
  - Green `#1F9D66` (saved / answered + check)
  - Red `#D64545` (danger / expired)
  - Violet `#7A5CFF` (current question ring)
- **Spacing & Radii**: 4px spacing base; type scale `12/14/16/20/28/40/64`; radii `8px` (`rounded-lg`), `12px` (`rounded-xl`), `20px`.

---

## 3. UI Component Inventory (`frontend/src/components/ui/`)

- **Actions**: `Button`, `IconButton` (hover, focus-visible 2px ring, `active:scale-[0.97]`, disabled, loading)
- **Forms**: `Input`, `Textarea`, `Select`, `Checkbox`, `Radio`, `Switch`
- **Feedback**: `Badge`, `StatusChip`, `ProgressRing`, `Skeleton`, `EmptyState`, `ErrorState`, `Toaster`
- **Overlays & Data**: `Tabs`, `Dialog`, `Drawer`, `Popover`, `Tooltip`, `Table`

---

## 4. API Consumption Contract & Contract Requests

- **Env Vars (`frontend/.env.example`)**:
  - `VITE_API_URL=http://localhost:5000/api`
  - `VITE_USE_MOCK=true`
- **HTTP Client (`services/api.js`)**:
  - Attaches `Authorization: Bearer <jwt>`.
  - Exponential backoff retry (up to 2 retries) **for idempotent `GET` requests only**.
  - Normalizes errors from `{ error: { code, message, fields } }`.

### Contract requests
*(No pending contract changes; frontend aligns with `BACKEND.md` and `Master Prompt Pack Part B`.)*
