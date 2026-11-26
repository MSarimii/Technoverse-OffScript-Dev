# OpenRouter AI Integration Guidelines (`AI_GUIDELINES.md`)

This document outlines the standardized patterns, environment controls, and API contracts for all AI-powered features in the **TechnoVerse** platform via **OpenRouter**.

---

## 1. Overview & Architectural Principles

All AI completions, streaming dialogues, and structured data extractions are routed through the OpenRouter API via [`backend/src/services/aiService.js`](file:///f:/TechnoVerse/backend/src/services/aiService.js).

- **Unified Client**: Uses `@openrouter/sdk` with ESM module architecture.
- **Model Agnostic**: Controlled dynamically via `process.env.OPENROUTER_MODEL` without code changes.
- **Rate-Limit Resilience**: Explicit 429 error detection with human-friendly messaging.
- **Offline / Mock Mode**: Full local simulation via `USE_MOCK_AI=true` so frontend and backend work can proceed without depleting API credits or requiring network connectivity.

---

## 2. Environment Configuration

Configure the following variables in `backend/.env`:

```env
# OpenRouter API Key (sk-or-v1-...)
OPENROUTER_API_KEY=

# Default Model Slug (e.g., google/gemini-2.5-flash, anthropic/claude-3.5-sonnet, openai/gpt-4o-mini)
OPENROUTER_MODEL=google/gemini-2.5-flash

# Application Identity (Required by OpenRouter rankings & dashboard)
OPENROUTER_SITE_URL=http://localhost:5173
OPENROUTER_SITE_NAME=HackathonApp

# Hackathon Mock Switch (Set to true to return simulated responses without calling the API)
USE_MOCK_AI=false
```

> [!WARNING]
> When `USE_MOCK_AI=false`, the server enforces the presence of `OPENROUTER_API_KEY` at boot time and will refuse to start if missing.

---

## 3. Service API & Helper Functions

The service is located at [`backend/src/services/aiService.js`](file:///f:/TechnoVerse/backend/src/services/aiService.js) (and re-exported from [`backend/services/aiService.js`](file:///f:/TechnoVerse/backend/services/aiService.js)).

### A. Standard Completion (`generateCompletion`)
```javascript
import { generateCompletion } from '../services/aiService.js';

// Simple prompt
const result = await generateCompletion('Analyze this hackathon project architecture');
console.log(result.content); // "The architecture..."

// With options (override model, temperature, system prompt)
const customResult = await generateCompletion('Draft a welcome message', {
  model: 'anthropic/claude-3.5-sonnet',
  temperature: 0.7,
  systemPrompt: 'You are an inspiring hackathon mentor.',
});
```

### B. Streaming Completion (`generateStream`)
Returns an `AsyncGenerator<string>` yielding tokens in real-time.
```javascript
import { generateStream } from '../services/aiService.js';

const stream = generateStream('Explain quantum computing in 3 sentences');
for await (const chunk of stream) {
  process.stdout.write(chunk);
}
```

### C. Structured JSON Output (`generateStructuredOutput`)
Forces JSON mode and validates the output against a `zod` schema:
```javascript
import { generateStructuredOutput } from '../services/aiService.js';
import { z } from 'zod';

const projectPlanSchema = z.object({
  title: z.string(),
  milestones: z.array(z.string()),
  estimatedHours: z.number(),
});

const response = await generateStructuredOutput(
  'Create a 3-step hackathon sprint plan for a 3D portfolio app',
  projectPlanSchema
);

console.log(response.data.title);
console.log(response.data.milestones);
```

---

## 4. REST API Contract: `POST /api/ai/test`

A starter endpoint is mounted at `/api/ai/test` in [`backend/src/routes/aiRoutes.js`](file:///f:/TechnoVerse/backend/src/routes/aiRoutes.js).

### Request:
- **Method**: `POST`
- **URL**: `http://localhost:5000/api/ai/test`
- **Headers**:
  ```http
  Content-Type: application/json
  ```
- **Body**:
  ```json
  {
    "prompt": "Explain why decoupled MERN architectures are ideal for hackathons."
  }
  ```

### Response (200 OK):
```json
{
  "success": true,
  "data": {
    "content": "Decoupled MERN architectures are ideal for hackathons because...",
    "model": "google/gemini-2.5-flash",
    "mock": false,
    "usage": {
      "prompt_tokens": 18,
      "completion_tokens": 85,
      "total_tokens": 103
    }
  }
}
```

### Error Responses:
- **400 Bad Request** (Empty or invalid prompt):
  ```json
  {
    "success": false,
    "message": "Prompt is required and cannot be empty"
  }
  ```
- **429 Too Many Requests** (Rate Limit Exceeded):
  ```json
  {
    "success": false,
    "message": "OpenRouter rate limit exceeded. Please retry shortly."
  }
  ```
- **500 Internal Server Error**:
  ```json
  {
    "success": false,
    "message": "Error details (stack omitted in production)"
  }
  ```

---

## 5. Frontend Client Integration

Frontend components can invoke the AI endpoint via the configured Axios client:

```javascript
import api from '../services/api';

export const testAiCompletion = async (prompt) => {
  const response = await api.post('/ai/test', { prompt });
  return response.data; // { content, model, mock, usage }
};
```
