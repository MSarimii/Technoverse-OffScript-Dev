/**
 * openrouterProvider.js — Live OpenRouter API Provider
 * Enforces JSON mode, schema validation with repair, 429 Retry-After, and timeout.
 */

import { getAiConfig, assertLiveKeyAvailable } from '../config.js';
import { AiError } from '../errors.js';
import { buildGradePrompts, buildQuestionDraftPrompts } from '../prompts.js';
import { gradeSuggestionSchema, draftQuestionSchema } from '../schemas.js';
import { clampAndRound } from './mockProvider.js';

const DISCLAIMER_TEXT = 'Suggestion only. The examiner decides.';

export function cleanJsonFences(text) {
  return String(text || '').replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
}

export async function callOpenRouter(messages, fetchFn = globalThis.fetch) {
  assertLiveKeyAvailable();
  const config = getAiConfig();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);

  let response;
  try {
    response = await fetchFn(config.endpoint, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
        'HTTP-Referer': config.siteUrl,
        'X-Title': config.siteName,
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        temperature: 0,
        max_tokens: config.maxTokens,
        response_format: { type: 'json_object' },
      }),
    });
  } catch (err) {
    clearTimeout(timer);
    if (err.name === 'AbortError') throw new AiError('AI_UNAVAILABLE', 'AI request timed out after 15 s');
    throw new AiError('AI_UNAVAILABLE', `Network error contacting AI provider: ${err.message}`);
  }
  clearTimeout(timer);

  if (response.status === 429) {
    const retrySec = parseInt(response.headers?.get?.('Retry-After') || '60', 10);
    if (retrySec <= 3) {
      await new Promise((r) => setTimeout(r, retrySec * 1_000));
      return callOpenRouter(messages, fetchFn);
    }
    throw new AiError('AI_RATE_LIMITED', 'AI rate limit exceeded.', { retryAfterSec: retrySec });
  }

  if (!response.ok) throw new AiError('AI_UNAVAILABLE', `AI provider returned HTTP ${response.status}`);
  return response.json();
}

async function parseAndValidateWithRepair(rawContent, schema, retryMessages, fetchFn) {
  const tryParse = (str) => {
    try { return JSON.parse(cleanJsonFences(str)); } catch { return null; }
  };

  const parsed = tryParse(rawContent);
  if (parsed && schema.safeParse(parsed).success) return schema.parse(parsed);

  try {
    const repairMessages = [
      ...retryMessages,
      { role: 'assistant', content: rawContent },
      { role: 'user', content: 'Your output did not match the JSON schema. Return ONLY valid JSON adhering to the required schema.' },
    ];
    const repairBody = await callOpenRouter(repairMessages, fetchFn);
    const repaired = tryParse(repairBody?.choices?.[0]?.message?.content ?? '');
    if (repaired && schema.safeParse(repaired).success) return schema.parse(repaired);
  } catch {
    // Repair failed
  }

  throw new AiError('AI_BAD_OUTPUT', 'AI returned an output that failed schema validation after repair attempt.');
}

export async function suggestGrade(params, fetchFn = globalThis.fetch) {
  const { messages, wasTruncated } = buildGradePrompts(params);
  const body = await callOpenRouter(messages, fetchFn);
  const validated = await parseAndValidateWithRepair(body?.choices?.[0]?.message?.content ?? '', gradeSuggestionSchema, messages, fetchFn);

  let rationale = validated.rationale.slice(0, 400);
  if (wasTruncated) rationale = `[Truncated] ${rationale}`.slice(0, 400);

  return {
    suggestion: {
      suggestedMarks: clampAndRound(validated.suggestedMarks, params.maxMarks),
      maxMarks: params.maxMarks,
      matchedPoints: validated.matchedPoints,
      missingPoints: validated.missingPoints,
      rationale,
      confidence: validated.confidence,
    },
    meta: {
      source: 'openrouter',
      model: getAiConfig().model,
      cached: false,
      disclaimer: DISCLAIMER_TEXT,
    },
  };
}

export async function testConnection(fetchFn = globalThis.fetch) {
  const start = Date.now();
  await callOpenRouter([{ role: 'system', content: 'ping' }, { role: 'user', content: 'pong' }], fetchFn);
  return {
    ok: true,
    source: 'openrouter',
    model: getAiConfig().model,
    latencyMs: Date.now() - start,
  };
}

export async function suggestQuestions(params, fetchFn = globalThis.fetch) {
  const messages = buildQuestionDraftPrompts(params);
  const body = await callOpenRouter(messages, fetchFn);
  const validated = await parseAndValidateWithRepair(body?.choices?.[0]?.message?.content ?? '', draftQuestionSchema, messages, fetchFn);
  return { questions: validated.questions, meta: { source: 'openrouter', model: getAiConfig().model } };
}

export async function generateStructured({ system, user, schema }, fetchFn = globalThis.fetch) {
  const messages = [{ role: 'system', content: system }, { role: 'user', content: user }];
  const body = await callOpenRouter(messages, fetchFn);
  const data = await parseAndValidateWithRepair(body?.choices?.[0]?.message?.content ?? '', schema, messages, fetchFn);
  return { data, source: 'openrouter', model: getAiConfig().model };
}
