# Repository & Git Management Guide (`REPO_GUIDE.md`)

This guide specifies repository layout, file tracking hygiene, branch management, and decoupling protocols for our split-team MERN workflow.

---

## 1. Repository Directory Structure

```
TechnoVerse/
├── .agents/
│   └── skills/                  # Installed Antigravity agent skills
├── frontend/                    # Completely independent React (Vite) application
│   ├── public/                  # Static assets (favicons, 3D gltf models, etc.)
│   ├── src/
│   │   ├── assets/              # Component images and static media
│   │   ├── components/          # Reusable UI components & 3D canvases
│   │   ├── context/             # React context providers (AuthContext, etc.)
│   │   ├── hooks/               # Custom reusable React hooks
│   │   ├── pages/               # Page views (Home, Auth, Dashboard, etc.)
│   │   ├── services/            # Axios/Fetch API client layer (matching BACKEND contract)
│   │   ├── styles/              # Global CSS & Tailwind setups
│   │   ├── App.jsx              # Main App routing & shell
│   │   └── main.jsx             # React entrypoint
│   ├── .env.example             # Frontend public env template
│   ├── index.html               # Vite HTML entry
│   ├── package.json             # Frontend dependencies & scripts
│   └── vite.config.js           # Vite build & proxy configuration
├── backend/                     # Completely independent Node.js / Express API
│   ├── src/
│   │   ├── config/              # MongoDB connection & env validation
│   │   ├── controllers/         # Request handlers & business logic
│   │   ├── middleware/          # JWT auth, role validation, error handlers, rate limiters
│   │   ├── models/              # Mongoose data schemas
│   │   ├── routes/              # Express route declarations (/api/auth, /api/...)
│   │   ├── utils/               # Sanitizers, token helpers, logger
│   │   └── server.js            # Express application bootstrapper
│   ├── .env.example             # Backend secret env template
│   └── package.json             # Backend dependencies & scripts
├── .gitignore                   # Universal Git exclusion rules
├── SECURITY.md                  # Security policies & pre-deploy checks
├── TECH_STACK.md                # Stack details & Antigravity skill mandates
├── REPO_GUIDE.md                # Git hygiene & repository guide (this file)
├── FRONTEND.md                  # Frontend specification & API consumption contract
└── BACKEND.md                   # Backend specification, routes, & model schemas
```

---

## 2. Commit vs. Ignore Hygiene

### What MUST Be Committed:
- All source files inside `frontend/src/` and `backend/src/`.
- `package.json` and `package-lock.json` in both folders.
- Tooling configuration files (`vite.config.js`, `tailwind.config.js`, `postcss.config.js`, etc.).
- Root and subfolder `.env.example` templates (containing only placeholder values).
- All project documentation (`SECURITY.md`, `TECH_STACK.md`, `REPO_GUIDE.md`, `FRONTEND.md`, `BACKEND.md`).
- `.agents/skills/` configurations and lockfiles.

### What MUST NEVER Be Committed (Strictly Ignored):
- `node_modules/` (in root, frontend, and backend).
- `.env`, `.env.local`, `.env.*` (any real environment file containing secrets).
- Production build outputs (`dist/`, `build/`, `out/`).
- Log files (`*.log`, `npm-debug.log*`).
- OS-generated files (`.DS_Store`, `Thumbs.db`, `desktop.ini`).
- Temporary test coverage reports (`coverage/`, `.nyc_output/`).

---

## 3. Team Branch & Merge Hygiene

1. **Main Branch Protection**:
   - `main` always represents stable, deployable code. Direct pushes of untested code are discouraged.
2. **Branch Naming Standard**:
   - `frontend/<feature-name>` (e.g., `frontend/hero-3d-scene`, `frontend/auth-pages`)
   - `backend/<feature-name>` (e.g., `backend/jwt-auth-endpoints`, `backend/product-crud`)
3. **Conventional Commits**:
   - Format: `<type>(<scope>): <short message>`
   - Examples:
     - `feat(frontend): implement threejs canvas hero with GSAP entrance`
     - `feat(backend): add JWT authentication and user registration endpoint`
     - `fix(backend): correct password comparison logic in auth controller`
     - `docs(repo): update API contract in FRONTEND.md`

---

## 4. Decoupling & Hand-off Protocol

- **Independent Execution**:
  - `frontend/` runs on its own local server (e.g. `http://localhost:5173`) using `VITE_API_URL` pointing to backend.
  - `backend/` runs on its own local server (e.g. `http://localhost:5000`) with CORS enabled for the frontend origin.
- **Teammate Hand-off**:
  - The `backend/` directory can be zipped and shared directly with the backend developer at any time without requiring frontend code.
  - Both developers rely strictly on `FRONTEND.md` and `BACKEND.md` as the authoritative API and data contract.
