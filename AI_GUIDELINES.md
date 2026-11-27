# OpenRouter AI Integration Guidelines (`AI_GUIDELINES.md`)
# ── Updated by feat/ai branch (Modular AI Architecture) ──

This document outlines the standardized patterns, environment controls, and API contracts for all AI-powered features in the **TechnoVerse** Secure Examination Management System (SEMS) via **OpenRouter** and offline **Mock Heuristic**.

> [!IMPORTANT]
> **AI is strictly an OPTIONAL examiner-assist extra.**
> The application must work fully with `USE_MOCK_AI=true` and no API key. No exam, grading, publishing, or reporting flow may ever require it.

---

## 1. Modular Subsystem Architecture

All AI completions, status checks, and structured extraction are routed through [`backend/src/services/aiService.js`](file:///f:/TechnoVerse/backend/src/services/aiService.js), which acts as a thin facade over single-purpose modules in `backend/src/services/ai/`:

- **`config.js`**: Centralized AI environment variables (`USE_MOCK_AI` default `true`, `OPENROUTER_API_KEY`, `OPENROUTER_MODEL` default `google/gemini-2.5-flash`), validated in one place.
- **`errors.js`**: `AiError` class with code-to-HTTP mapping (`AI_NOT_APPLICABLE` 422, `AI_RATE_LIMITED` 429, `AI_BAD_OUTPUT` 502, `AI_UNAVAILABLE` 503) and standard error shaping `{ error: { code, message, fields } }`.
- **`schemas.js`**: Strict Zod schemas for request validation and provider response verification.
- **`prompts.js`**: Prompt construction and prompt-injection defense (ASCII control character stripping, delimiter escaping, and 4,000 character capping).
- **`cache.js`**: In-memory LRU cache (~200 entries, 30 min TTL) keyed by SHA-256 of question, rubric, answer, and model.
- **`providers/mockProvider.js`**: 100% deterministic keyword-coverage heuristic against the rubric. Zero network, zero randomness.
- **`providers/openrouterProvider.js`**: Production OpenRouter caller with JSON mode, 15 s AbortController timeout, 429 Retry-After budget, and single repair retry on malformed JSON.
- **`context.js`**: The ONLY module that interacts with Attempt/Question/Exam models (`loadAttemptContext`), strictly enforcing examiner ownership and attempt snapshot immutability.

---

## 2. Environment Configuration

Configure the following variables in `backend/.env` (based on `backend/.env.example`):

```env
# Mock Switch: set to true (default) for offline demo with zero API key
USE_MOCK_AI=true

# OpenRouter API Key (sk-or-v1-...); required only when USE_MOCK_AI=false
OPENROUTER_API_KEY=

# Configurable Model Slug
OPENROUTER_MODEL=google/gemini-2.5-flash

# Application Identity for OpenRouter headers
OPENROUTER_SITE_URL=http://localhost:5173
OPENROUTER_SITE_NAME=TechnoVerse-SEMS
```

> [!WARNING]
> If `USE_MOCK_AI=false` and `OPENROUTER_API_KEY` is missing or empty, the AI service returns `AI_UNAVAILABLE` (503). It **never silently falls back to mock** when live was explicitly requested.

---

## 3. REST API Contracts

### A. Examiner Status Check: `POST /api/ai/test`
- **Access**: Private (Authenticated Examiner)
- **Rate Limit**: 20 requests / min per examiner
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "ok": true,
    "source": "mock",
    "model": "google/gemini-2.5-flash (mock)",
    "latencyMs": 1
  }
  ```
- **Error (503 Unavailable)**:
  ```json
  {
    "success": false,
    "error": {
      "code": "AI_UNAVAILABLE",
      "message": "AI is not available: USE_MOCK_AI is false but OPENROUTER_API_KEY is not set",
      "fields": null
    },
    "code": "AI_UNAVAILABLE",
    "message": "AI is not available: USE_MOCK_AI is false but OPENROUTER_API_KEY is not set"
  }
  ```

---

### B. Suggest Grade: `POST /api/ai/suggest-grade`
- **Access**: Private (Authenticated Examiner owning the exam or sandbox attempt)
- **Rate Limit**: 20 requests / min per examiner
- **Request Body (Strict - IDs only)**:
  ```json
  {
    "attemptId": "65a000000000000000aaaaaa",
    "questionId": "65b000000000000000bbbbbb"
  }
  ```
  *(Any extra fields such as `answer`, `rubric`, or `maxMarks` are rejected with `400 VALIDATION_ERROR`)*

- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "suggestion": {
      "suggestedMarks": 3.5,
      "maxMarks": 5,
      "matchedPoints": [
        "Mentioned: 'light'",
        "Mentioned: 'chlorophyll'"
      ],
      "missingPoints": [
        "Missing: 'oxygen'",
        "Missing: 'carbon dioxide'"
      ],
      "rationale": "The candidate explains light and chlorophyll absorption accurately but omits carbon fixation and oxygen release.",
      "confidence": "medium"
    },
    "meta": {
      "source": "mock",
      "model": "google/gemini-2.5-flash (mock)",
      "cached": false,
      "disclaimer": "Suggestion only. The examiner decides."
    }
  }
  ```

- **Guarantees**:
  - `suggestedMarks` is clamped to `[0, maxMarks]` and rounded to the nearest `0.5`.
  - The endpoint NEVER writes to any database document. The examiner applies marks via the core grading route `PUT /api/attempts/:id/grade`.
  - Zero PII (names, emails, IDs) is ever transmitted to the upstream provider.

---

### C. Suggest Questions: `POST /api/ai/suggest-questions` (Stretch)
- **Access**: Private (Authenticated Examiner)
- **Rate Limit**: 20 requests / min per examiner
- **Request Body**:
  ```json
  {
    "topic": "Operating Systems",
    "difficulty": "medium",
    "count": 3
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "questions": [
      {
        "type": "written",
        "text": "Explain deadlock conditions with examples.",
        "marks": 5,
        "rubric": "Mutual exclusion, hold and wait, no preemption, circular wait.",
        "options": []
      }
    ],
    "meta": { "source": "mock", "model": "google/gemini-2.5-flash (mock)" },
    "disclaimer": "Draft questions only. Examiner reviews and imports manually."
  }
  ```

---

## 4. Frontend UI Contract (Member 1 Integration)

In the Examiner grading workspace:
1. **"Suggest with AI" Button States**:
   - `idle`: Enabled, clickable in written question grading cards.
   - `loading`: Disabled with spinner ("Analyzing answer against rubric..."). Manual score inputs remain 100% interactive.
   - `suggestion`: Displays `suggestedMarks`, matched/missing point lists, rationale, and an **"Apply" button**. Clicking "Apply" populates the manual score input (`marksInput.value = suggestedMarks`), but does NOT submit the grade.
   - `error`: Shows a non-blocking toast/banner with friendly message based on `error.code`. Manual grading remains fully functional.
2. **Mock vs. Live Badge**:
   - When `meta.source === 'mock'`: Display grey/yellow **"Mock AI"** chip with model name.
   - When `meta.source === 'openrouter'`: Display emerald **"Live AI"** chip with model name.
3. **Mandatory Disclaimer**: Always display `meta.disclaimer` ("Suggestion only. The examiner decides.") next to AI suggestions.

---

## 5. Security & Prompt Injection Defenses

1. **Delimited Input & Token Escaping**: Candidate answers are bounded by `<candidate_answer>` tags, with internal closing tags escaped to `&lt;/candidate_answer&gt;`.
2. **ASCII Sanitization**: Strips non-printable ASCII control characters.
3. **Input Capping**: Answers are capped at 4,000 characters before processing, with truncation clearly flagged in the rationale.
4. **Structural Defense**: Model output is strictly parsed with Zod schemas. Scores are unconditionally clamped to `[0, maxMarks]` and rounded to the nearest `0.5` on the server.
5. **NoSQL Injection Defense**: Strict object schemas reject unexpected request properties.
6. **Data Minimization**: Outbound payloads never contain candidate names, emails, user IDs, or exam titles.
