# TechnoVerse — Secure Examination Management System (SEMS)
**Technoverse 5.0 Web-e-Thon Entry** | Decoupled MERN Architecture

---

## 1. Project Overview

TechnoVerse SEMS is an institution-grade Secure Examination Management System designed for reliable exam administration, real-time proctoring indicators, verifiable reports, and fair, transparent evaluation workflows.

- **Backend**: Node.js 20+ (ESM), Express 4.x, MongoDB via Mongoose 8.x
- **Frontend**: React 18 (Vite SPA), Tailwind CSS, Three.js, GSAP
- **Authentication**: JWT stateless authentication with bcrypt password hashing
- **AI Module**: Decoupled, optional OpenRouter AI assistant with offline mock heuristic

---

## 2. AI Module (`feat/ai` branch)

> [!NOTE]
> Everything in the AI module is an **OPTIONAL examiner-assist extra**. The platform operates completely and independently with `USE_MOCK_AI=true` and zero external API keys.

### Core Capabilities
- **Examiner Grading Suggestions (`POST /api/ai/suggest-grade`)**: Generates advisory score suggestions (`suggestedMarks`, matched points, missing points, rationale, confidence) for written answers against the exam rubric. Clamped to `[0, maxMarks]` and rounded to the nearest 0.5.
- **Examiner AI Status Chip (`POST /api/ai/test`)**: Validates provider connectivity without exposing API keys.
- **Draft Question Ideation (`POST /api/ai/suggest-questions`)**: Generates draft questions for examiner review (never auto-saved).

### Modular Architecture
The AI subsystem is organized under `backend/src/services/ai/`:
- `config.js`: Centralized configuration and mode validation (`USE_MOCK_AI=true` default).
- `errors.js`: `AiError` class with standard error formatting `{ error: { code, message, fields } }`.
- `schemas.js`: Zod schemas for input validation and output verification.
- `prompts.js`: Prompt injection protection (delimiter escaping, control char stripping, length capping).
- `cache.js`: LRU cache (~200 entries, 30 min TTL) with SHA-256 keys to avoid burning quota.
- `providers/mockProvider.js`: Deterministic keyword rubric evaluation for offline demo.
- `providers/openrouterProvider.js`: OpenRouter live API provider with 429 retry budget and JSON repair.
- `context.js`: Only module accessing Attempt/Question/Exam models and checking examiner ownership.
- `aiService.js`: Thin facade called by `aiController.js`.

### Running AI Tests
```bash
cd backend
npm test
# Runs 46 tests across 10 modular suites via Node test runner
```

### 30-Second Hackathon Demo Flow
1. Start backend with `USE_MOCK_AI=true` (in `.env`).
2. Log in as an examiner account and view a submitted written attempt.
3. Click **"Suggest with AI"**: note the yellow **"Mock AI"** badge.
4. Review matched/missing points and rationale based on rubric keywords.
5. Click **"Apply"** to transfer the suggested score to the input field, then submit manually.
6. (Optional live demo): Set `USE_MOCK_AI=false` and provide `OPENROUTER_API_KEY` in `.env` to demonstrate live Gemini 2.5 Flash evaluation with the green **"Live AI"** badge.
