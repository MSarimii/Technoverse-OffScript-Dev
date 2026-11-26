# Frontend Architecture & Specification (`FRONTEND.md`)

This document defines the frontend technical architecture, design system rules, component hierarchies, and API contract expectations. The Frontend engineer can develop and test independently using this specification.

---

## 1. Architecture Overview

- **Framework**: React 18+ bootstrapped with **Vite** for fast HMR and optimized production bundles.
- **Routing**: `react-router-dom` for declarative client-side SPA routing and protected route wrappers.
- **Styling**: **Tailwind CSS** augmented with custom design tokens, frosted glassmorphism utilities, and typography plugins.
- **Motion & 3D**:
  - **GSAP (GreenSock)** + `useGSAP` for choreographed timelines and ScrollTrigger entrances.
  - **Three.js** / **React Three Fiber (@react-three/fiber & @react-three/drei)** for interactive 3D hero canvases.
  - **Framer Motion** for state-driven micro-interactions, layout transitions, and dialogs.
  - **Sonner** for toast notifications.
- **State Management**: React Context (`AuthContext`) for authentication state, combined with custom hooks for local state.
- **HTTP Client**: Centralized Axios instance with request/response interceptors for automatic JWT header injection and standardized error toast handling.

---

## 2. Directory Structure & Boundaries

```
frontend/src/
├── assets/                  # Local media, icons, and SVG graphics
├── components/
│   ├── common/              # Universal primitives (Button, Input, Card, Modal, Loader)
│   ├── layout/              # Navbar (glassmorphism), Footer, Container, PageWrapper
│   ├── canvas/              # Three.js 3D scenes (HeroScene.jsx, ParticleField.jsx)
│   └── feedback/            # Toast containers, alerts, and error boundary fallbacks
├── context/
│   └── AuthContext.jsx      # Global user login state, token persistence, and logout handlers
├── hooks/
│   ├── useAuth.js           # Access auth context hook
│   ├── useReducedMotion.js  # Detects prefers-reduced-motion for WCAG compliance
│   └── useGSAPTimeline.js   # GSAP lifecycle helper
├── pages/
│   ├── HomePage.jsx         # Landing page featuring 3D Hero + GSAP animations
│   ├── LoginPage.jsx        # Login form with validation
│   ├── RegisterPage.jsx     # Registration form with validation
│   ├── DashboardPage.jsx    # Protected user dashboard view
│   └── NotFoundPage.jsx     # 404 error page
├── services/
│   ├── api.js               # Axios instance (baseURL: VITE_API_URL + interceptors)
│   ├── authService.js       # Auth API calls (login, register, getMe, logout)
│   └── mockData.js          # Offline mock fixtures for independent development
├── styles/
│   └── index.css            # Tailwind directives, CSS custom properties, and base styling
├── App.jsx                  # Route provider and route guard configuration
└── main.jsx                 # Application entry point
```

---

## 3. Design System & UI Directives (`frontend-design` Mandate)

1. **Aesthetic Identity**:
   - Strictly follow the [`frontend-design`](file:///f:/TechnoVerse/.agents/skills/frontend-design/SKILL.md) skill: Avoid generic AI template clichés (e.g., standard bland rounded grey boxes, indiscriminate soft shadows, and meaningless badges).
   - Establish a deliberate color scheme with high contrast, distinctive typography pairings, and purposeful whitespace.
2. **Hero Animation**:
   - The landing hero MUST feature an interactive Three.js 3D element (e.g., interactive particle cloud, geometric knot, or canvas mesh) synchronized with a GSAP entrance timeline.
   - Enforce 60fps performance: Keep particle counts within frame budget, clean up WebGL renderers upon component unmount, and composite only GPU-accelerated CSS properties (`transform`, `opacity`).
3. **Micro-Interactions & Glassmorphism**:
   - Navigation bars should utilize frosted glassmorphism (`backdrop-blur-md bg-white/10 dark:bg-black/30 border border-white/15`).
   - Buttons and interactive items must deliver tactile feedback (active scale down `active:scale-[0.98]`, subtle hover glow, accessible focus rings).
4. **Accessibility (WCAG 2.1 AA)**:
   - Respect `prefers-reduced-motion`: When reduced motion is requested, smoothly disable high-frequency camera oscillations or large translate animations in favor of simple fades.

---

## 4. API Consumption Contract (Expectations from Backend)

### Environment Variable:
`VITE_API_URL=http://localhost:5000/api`

### Request / Response Standards:
- **Authorization Header**: All protected requests supply `Authorization: Bearer <token>`.
- **Standard Success Response Shape**:
  ```json
  {
    "success": true,
    "message": "Optional status message",
    "data": { ... }
  }
  ```
- **Standard Error Response Shape**:
  ```json
  {
    "success": false,
    "message": "Human readable error message",
    "correlationId": "optional-id"
  }
  ```

### Authentication Endpoints Contract:
1. `POST /api/auth/register`
   - Request: `{ "name": "Alice", "email": "alice@example.com", "password": "securepassword123" }`
   - Response (201): `{ "success": true, "token": "jwt...", "data": { "user": { "id": "...", "name": "Alice", "email": "alice@example.com", "role": "user" } } }`
2. `POST /api/auth/login`
   - Request: `{ "email": "alice@example.com", "password": "securepassword123" }`
   - Response (200): `{ "success": true, "token": "jwt...", "data": { "user": { "id": "...", "name": "Alice", "email": "alice@example.com", "role": "user" } } }`
3. `GET /api/auth/me`
   - Header: `Authorization: Bearer <token>`
   - Response (200): `{ "success": true, "data": { "user": { "id": "...", "name": "Alice", "email": "alice@example.com", "role": "user" } } }`

### OpenRouter AI Endpoint Contract:
1. `POST /api/ai/test`
   - Request: `{ "prompt": "Explain why decoupled MERN architectures are ideal for hackathons." }`
   - Response (200):
     ```json
     {
       "success": true,
       "data": {
         "content": "Decoupled MERN architectures are ideal for hackathons because...",
         "model": "google/gemini-2.5-flash",
         "mock": false,
         "usage": { "prompt_tokens": 18, "completion_tokens": 85, "total_tokens": 103 }
       }
     }
     ```
   - Rate limit error (429): `{ "success": false, "message": "OpenRouter rate limit exceeded. Please retry shortly." }`
   - See [`AI_GUIDELINES.md`](file:///f:/TechnoVerse/AI_GUIDELINES.md) for full streaming and structured output schemas.

### Offline / Mock Capability:
If the Backend is not running or `USE_MOCK_AI=true` is set, the API returns deterministic mock data with `mock: true`, allowing 100% independent frontend development without network access or API credentials.
