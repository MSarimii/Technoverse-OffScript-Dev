/**
 * aiService.js — Thin Facade for the SEMS AI Module
 * The single entry point to AI services for controllers.
 * Coordinates context loading, caching, and provider delegation (mock vs live).
 */

import { getAiConfig } from './ai/config.js';
import { aiCache, createCacheKey } from './ai/cache.js';
import { loadAttemptContext } from './ai/context.js';
import * as mockProvider from './ai/providers/mockProvider.js';
import * as openrouterProvider from './ai/providers/openrouterProvider.js';

export { AiError, AI_STATUS_MAP } from './ai/errors.js';
export { getAiConfig } from './ai/config.js';

/**
 * Returns the active provider based on current environment configuration.
 * @returns {typeof mockProvider | typeof openrouterProvider}
 */
export function getActiveProvider() {
  const config = getAiConfig();
  return config.isMock ? mockProvider : openrouterProvider;
}

/**
 * Generates an advisory grade suggestion for a submitted written answer.
 *
 * @param {Object} params
 * @param {string} params.attemptId
 * @param {string} params.questionId
 * @param {string} params.examinerId
 * @param {Object} [deps] Injectable overrides for testing
 * @returns {Promise<{ suggestion: Object, meta: Object }>}
 */
export async function suggestGradeForAttempt({ attemptId, questionId, examinerId }, deps = {}) {
  const config = getAiConfig();
  const provider = deps.provider || (config.isMock ? mockProvider : openrouterProvider);

  // 1. Load and validate context from the attempt snapshot
  const context = await loadAttemptContext({ attemptId, questionId, examinerId }, deps);

  // 2. Cache lookup (key based on attemptId, questionId, rubric, model, and mode)
  const cacheKey = createCacheKey({
    cacheId: context.cacheId,
    model: config.model,
    isMock: config.isMock,
  });

  const cache = deps.cache || aiCache;
  const cachedResult = cache.get(cacheKey);
  if (cachedResult) {
    return {
      ...cachedResult,
      meta: {
        ...cachedResult.meta,
        cached: true,
      },
    };
  }

  // 3. Delegate to active provider
  const result = await provider.suggestGrade(context, deps.fetchFn);

  // 4. Cache and return
  cache.set(cacheKey, result);
  return result;
}

/**
 * AI connectivity health check.
 * @param {Function} [fetchFn]
 * @returns {Promise<{ ok: boolean, source: string, model: string, latencyMs?: number }>}
 */
export async function testConnection(fetchFn = globalThis.fetch) {
  const provider = getActiveProvider();
  return provider.testConnection(fetchFn);
}

/**
 * Generates draft questions based on topic and difficulty (advisory only).
 * @param {Object} params
 * @param {string} params.topic
 * @param {string} params.difficulty
 * @param {number} params.count
 * @param {Function} [fetchFn]
 * @returns {Promise<{ questions: Array<Object>, meta: Object }>}
 */
export async function suggestQuestions(params, fetchFn = globalThis.fetch) {
  const provider = getActiveProvider();
  return provider.suggestQuestions(params, fetchFn);
}

/**
 * Generic structured generation for extensibility.
 * @param {Object} params
 * @param {string} params.system
 * @param {string} params.user
 * @param {any} params.schema
 * @param {Function} [fetchFn]
 */
export async function generateStructured({ system, user, schema }, fetchFn = globalThis.fetch) {
  const provider = getActiveProvider();
  if (provider.generateStructured) {
    return provider.generateStructured({ system, user, schema }, fetchFn);
  }
  return { data: {}, source: 'mock', model: getAiConfig().model };
}

/**
 * Preserved for backward-compatibility with existing /api/ai/test prompt route.
 * @param {string|Array} promptOrMessages
 * @param {Object} [options]
 */
export async function generateCompletion(promptOrMessages, options = {}) {
  const config = getAiConfig();
  const model = options.model || config.model;

  if (config.isMock) {
    return {
      content: `[MOCK AI RESPONSE (${model})]: Successfully processed prompt.`,
      model: `${model} (mock)`,
      mock: true,
      usage: { prompt_tokens: 15, completion_tokens: 25, total_tokens: 40 },
    };
  }

  const promptText = typeof promptOrMessages === 'string' ? promptOrMessages : JSON.stringify(promptOrMessages);
  const provider = openrouterProvider;
  const messages = [
    ...(options.systemPrompt ? [{ role: 'system', content: options.systemPrompt }] : []),
    { role: 'user', content: promptText },
  ];

  const body = await provider.callOpenRouter(messages);
  return {
    content: body?.choices?.[0]?.message?.content ?? '',
    model,
    mock: false,
    usage: body?.usage,
  };
}

export default {
  suggestGradeForAttempt,
  testConnection,
  suggestQuestions,
  generateStructured,
  generateCompletion,
  getActiveProvider,
};
