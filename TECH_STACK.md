# Technology Stack & Tooling Guidelines (`TECH_STACK.md`)

This document defines the core technology stack, architecture patterns, and the mandatory usage of Antigravity plugins and skills for the **TechnoVerse** project.

---

## 1. Core Technology Stack

| Layer | Technology | Details |
|---|---|---|
| **Database** | **MongoDB** | Hosted on MongoDB Atlas or local instance; accessed via **Mongoose** ORM with strict schemas, timestamps, and indexes. |
| **Backend** | **Node.js + Express** | Clean REST API modular architecture (routes, controllers, models, middleware, validation). |
| **Frontend** | **React (Vite)** | Modern single-page application built with React (Vite SPA template), functional components, custom hooks, and Tailwind CSS. |
| **Authentication** | **JWT & Bcrypt** | Secure stateless token authentication via JSON Web Tokens with HTTP-only cookies or Authorization Bearer headers, and salted bcrypt password hashing. |
| **AI Integration** | **OpenRouter API** | Powered by `@openrouter/sdk` with configurable model slug (`google/gemini-2.5-flash`), rate-limit fallback, and offline mock mode. (See [`AI_GUIDELINES.md`](file:///f:/TechnoVerse/AI_GUIDELINES.md)). |
| **Deployment** | **Vercel** | Frontend deployed as a static Vite build on Vercel; Backend configured for serverless/Express on Vercel or cloud container (Render/Railway). |

---

## 2. Antigravity Plugins & Skills Mandate

> [!IMPORTANT]
> **MANDATORY POLICY**: All installed Antigravity plugins and skills (from `Antigravity_2.0_Setup_Guide.pdf` and `.agents/skills/`) **MUST be actively engaged and utilized** during every phase of this project: planning, UI building, animation, and code review.

### A. Planning & Architecture Phase
- **`Superpowers` (`/brainstorming`, `/writing-plans`, `/executing-plans`)**: Enforce rigorous requirement decomposition, step-by-step implementation planning, and clean task milestones before writing code.
- **`Graphify`**: Map and inspect project structure and dependency relationships across modules.

### B. UI Building & Styling Phase
- **`frontend-design`**: **Mandatory for all layout styling and aesthetic decisions.** Every page must have deliberate typography, purposeful color schemes, and custom component identities instead of generic AI templates.
- **`emil-design-eng` & `micro-interaction`**: Apply micro-interactions, responsive states, polished button presses, smooth sheet/modal interactions, and spring physics.
- **`glassmorphism`**: Use for sleek frosted navigation bars, backdrop blur filters, and subtle depth layers where appropriate.
- **`vercel-react-best-practices`**: Enforce React rendering optimizations, avoid unnecessary re-renders, and ensure optimal state management.

### C. 3D & Hero Animations Phase
- **`GSAP Ecosystem`** (`gsap-core`, `gsap-scrolltrigger`, `gsap-timeline`, `gsap-react`):
  - **Mandatory for complex orchestrations, page entrances, and scroll-linked motions.**
  - Safe lifecycle cleanup via `useGSAP`.
- **`Three.js Ecosystem`** (`threejs-fundamentals`, `threejs-geometry`, `threejs-materials`, `threejs-react-three-fiber`):
  - **Mandatory for 3D hero scenes, interactive canvases, and particle fields.**
  - Enforce `threejs-performance` guidelines to guarantee 60fps across low-end and high-end hardware.

### D. Code Review, Hardening & Quality Gate
- **`ponytail` / `ponytail-review`**: Enforce clean diffs, YAGNI (You Aren't Gonna Need It), avoid over-engineering, and audit PRs for bloat.
- **`security-and-hardening`**: Validate auth flows, sanitization, and input parsing against OWASP Top Ten vulnerabilities.
- **`60fps-animation` & `accessible-animation`**: Ensure animations respect `prefers-reduced-motion` and composite on GPU without layout thrashing.
- **`webapp-testing` / `playwright-cli`**: Verify end-to-end functionality in a real browser before sign-off.
