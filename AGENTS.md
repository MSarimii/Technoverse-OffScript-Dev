# Antigravity & AI Agent Standing Directives (`AGENTS.md`)

This repository is built for a fast-paced hackathon sprint with a split-team workflow (one developer on Frontend, one on Backend). All AI agents operating in this workspace must strictly adhere to the following standing instructions.

---

## 1. Mandatory Context Ingestion (Before Writing Any Code)

Every agent session **MUST read and follow** the core specification files located in the project root before proposing architecture changes or writing feature code:

1. [**`TECH_STACK.md`**](file:///f:/TechnoVerse/TECH_STACK.md) — Definitive technology stack, architectural choices, and Antigravity skills mandates.
2. [**`FRONTEND.md`**](file:///f:/TechnoVerse/FRONTEND.md) — Frontend architecture, layout rules, state boundaries, and API consumption contracts.
3. [**`BACKEND.md`**](file:///f:/TechnoVerse/BACKEND.md) — Backend architecture, Express routes, Mongoose models, and security middleware.
4. [**`REPO_GUIDE.md`**](file:///f:/TechnoVerse/REPO_GUIDE.md) — Repository structure, commit conventions, branch isolation, and gitignore hygiene.
5. [**`SECURITY.md`**](file:///f:/TechnoVerse/SECURITY.md) — Zero hardcoded secrets, input sanitization, rate limiting, and 5 pre-deploy verification audits.

---

## 2. Mandatory Skill & Tooling Engagement

Do not write generic, boilerplate code. Always actively leverage our installed skills and plugins located in `.agents/skills/` and global configurations:

- **Superpowers & Planning**: Use structured problem decomposition, brainstorm alternatives, and create step-by-step implementation plans before touching code.
- **Frontend Design & Aesthetics (`frontend-design`, `glassmorphism`)**:
  - Avoid generic AI template clichés (e.g. cookie-cutter grey cards, arbitrary soft shadows).
  - Use deliberate typography scales, distinctive color palettes, and polished UI components.
  - Implement frosted glass styling where appropriate for navigation and overlay panels.
- **Micro-Interactions & Polish (`emil-design-eng`, `micro-interaction`)**:
  - Add tactile feedback (active scale-down, smooth hover states, responsive transitions).
- **Hero & Motion (`GSAP`, `Three.js`, `60fps-animation`)**:
  - Build interactive 3D hero experiences with Three.js (or R3F) synchronized with GSAP timelines.
  - Maintain 60fps frame budgets by animating composite-only CSS properties and cleaning up WebGL buffers on unmount.
  - Respect `prefers-reduced-motion` at all times (`accessible-animation`).
- **Code Review & Quality Gate (`ponytail-review`, `security-and-hardening`, `impeccable`)**:
  - Keep pull requests and diffs minimal, focused, and YAGNI-compliant.
  - Verify every endpoint against IDOR and injection attacks.
  - Audit UI components against accessibility and web guidelines.

---

## 3. Strict Decoupling Protocol

- `frontend/` and `backend/` must remain **completely independent and decoupled**.
- Never introduce cross-directory dependencies between `frontend/` and `backend/`.
- The `backend/` folder must remain self-contained so it can be zipped and handed off to the backend teammate at any moment.
- All integration between frontend and backend must strictly conform to the shared contract specified in `FRONTEND.md` and `BACKEND.md`.
