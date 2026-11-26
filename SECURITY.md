# Security Policy & Guidelines (`SECURITY.md`)

This document establishes the mandatory security rules, architectural controls, and pre-deploy verification steps that must be strictly enforced throughout this project. Both Frontend and Backend engineers, as well as AI agents, must comply with these protocols.

---

## 1. Zero Hardcoded Secrets & Environment Hygiene
*Based on Gitleaks & Secret Leak Prevention Standards*

- **No Secrets in Codebase**: API keys, passwords, JWT secrets, database connection strings (MongoDB URIs), and third-party credentials must NEVER be hardcoded as string literals in source code, utility files, test mocks, or comments.
- **Environment Isolation**:
  - All sensitive credentials must live strictly inside `.env` files (which are gitignored).
  - Both `frontend/` and `backend/` must maintain accurate `.env.example` files containing only safe placeholder values.
  - If a secret is ever accidentally committed to git, it is permanently compromised. It must be rotated immediately and invalidated.
- **Frontend Exposure Guardrails**:
  - In React/Vite, only variables prefixed with `VITE_` (or `REACT_APP_`) are embedded into the client bundle.
  - **NEVER** expose database credentials, payment secret keys, or JWT private signing keys to the frontend. Only genuinely public-safe variables (such as public API base URLs or publishable client keys) may have frontend prefixes.
- **Log Hygiene**:
  - `console.log`, loggers (e.g., Winston/Morgan), and error handlers must NEVER output credentials, tokens, or database connection strings.

---

## 2. Personal Data Flow & Privacy Protection
*Based on Bearer & Privacy Standards*

- **Password Storage**: Passwords must be hashed using `bcrypt` (minimum 10-12 salt rounds) or `argon2`. Plaintext passwords must never be stored, logged, or returned in any API response.
- **Token & Session Storage**:
  - Sensitive authentication tokens (refresh tokens, session cookies) should preferably be transmitted using HTTP-only, Secure, `SameSite=Strict` (or `Lax`) cookies to protect against Cross-Site Scripting (XSS).
  - Avoid storing sensitive user PII or access tokens in unencrypted `localStorage` where arbitrary malicious scripts can access them.
- **Field-Level Response Filtering**:
  - Endpoints must never dump raw database documents (`user.toObject()` without filtering).
  - Explicitly sanitize responses (e.g. `password`, `resetToken`, internal IDs, and other users' private information must be stripped before sending the response).
- **Data Minimization & Deletion**:
  - Only collect data required for features. Provide a clean account deletion or anonymization flow.

---

## 3. Input Validation, Sanitization & Injection Defense
*Based on Trail of Bits & OWASP Standards*

- **NoSQL Injection Defense**:
  - Never pass raw, unsanitized `req.body` directly into MongoDB query operators (e.g., `{ $gt: '' }`).
  - Use schema-level validation (e.g., `zod`, `joi`, or strict Mongoose schemas) on every incoming API request payload.
- **Cross-Site Scripting (XSS)**:
  - Sanitize all user-generated content rendered into the DOM. Never use `dangerouslySetInnerHTML` unless strictly sanitized via DOMPurify.
- **IDOR (Insecure Direct Object Reference) Prevention**:
  - Every endpoint that updates, retrieves, or deletes an object (e.g. `/api/items/:id`) MUST verify that the authenticated user (`req.user.id`) owns the resource or has authorized administrative privileges before executing the query. Never trust an incoming `userId` parameter from the client.

---

## 4. Auth & CORS Best Practices

- **CORS Configuration**:
  - Never allow wildcard `cors({ origin: '*' })` in production with credentials.
  - Configure CORS with an explicit whitelist allowing only the verified frontend origin (e.g., `http://localhost:5173` in local development and the production Vercel domain).
- **Security Headers (Helmet)**:
  - Express backend must utilize `helmet()` middleware to enforce security headers:
    - `X-Content-Type-Options: nosniff`
    - `X-Frame-Options: DENY`
    - `Strict-Transport-Security` (HSTS)
    - `Content-Security-Policy` (CSP)
- **Rate Limiting**:
  - Protect sensitive routes (login, registration, password resets) using `express-rate-limit` (e.g. max 5 login attempts per minute per IP).

---

## 5. Pre-Deployment Security Checklist (The 5 Verification Passes)
*From `vibe-coding-security-prompts.pdf`*

Before any staging or production deployment to Vercel/Cloud, execute these 5 verification audits:

1. **Check 1: Secret Leak Prevention (Gitleaks)**
   - Run a secret search across the repository.
   - Verify `.env` is absent from git tracking.
2. **Check 2: Personal Data Flow Audit (Bearer)**
   - Audit endpoints to ensure no PII leaks in responses or console logs.
   - Verify passwords use bcrypt hashing.
3. **Check 3: Pre-Deploy Production Audit (ECC Production Audit)**
   - Ensure server validates all required environment variables at boot time and crashes early if missing.
   - Verify debug logs, test routes (`/test`, `/debug`, `/seed-data`), and test credentials are removed.
   - Confirm standard HTTP error responses return generic messages with correlation IDs rather than internal stack traces.
4. **Check 4: Deep Security Audit for Complex Logic (Trail of Bits)**
   - Audit IDOR checks on all CRUD operations.
   - Verify JWT expiration times and signing algorithms.
   - Verify that any payment or transactional logic recalculates prices on the server.
5. **Check 5: Attacker's Perspective Review (ECC Security Review)**
   - Attempt parameter tampering, privilege escalation (verifying role checks happen server-side, not just UI hiding), and malformed payloads.
