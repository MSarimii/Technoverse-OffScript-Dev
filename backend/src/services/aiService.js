import dotenv from 'dotenv';
import { OpenRouter } from '@openrouter/sdk';
import { z } from 'zod';

dotenv.config();

const isMock = process.env.USE_MOCK_AI === 'true';
const apiKey = process.env.OPENROUTER_API_KEY;
const defaultModel = process.env.OPENROUTER_MODEL || 'google/gemini-2.5-flash';
const siteUrl = process.env.OPENROUTER_SITE_URL || 'http://localhost:5173';
const siteName = process.env.OPENROUTER_SITE_NAME || 'HackathonApp';

// Initialize OpenRouter client strictly if not in mock mode
let openRouterClient = null;

if (!isMock) {
  if (!apiKey || apiKey.trim() === '') {
    const errorMsg =
      '[OpenRouter AI Service] CRITICAL ERROR: OPENROUTER_API_KEY is missing in environment variables. ' +
      'Please supply a valid OpenRouter API key in .env or set USE_MOCK_AI=true for offline development.';
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  openRouterClient = new OpenRouter({
    apiKey: apiKey.trim(),
  });
} else {
  console.log('[OpenRouter AI Service] Running in USE_MOCK_AI=true mode. Synthetic responses will be returned.');
}

/**
 * Helper to handle errors gracefully, specifically detecting 429 rate limit issues.
 */
const handleAiError = (error, context = 'AI operation') => {
  const isRateLimit =
    error?.status === 429 ||
    error?.statusCode === 429 ||
    error?.name === 'TooManyRequestsResponseError' ||
    String(error?.message).includes('429') ||
    String(error?.message).toLowerCase().includes('rate limit');

  if (isRateLimit) {
    const rateLimitError = new Error(
      `OpenRouter Rate Limit Exceeded (429) during ${context}. Please wait a few seconds or switch models in OPENROUTER_MODEL.`
    );
    rateLimitError.statusCode = 429;
    rateLimitError.isRateLimit = true;
    return rateLimitError;
  }

  return error;
};

/**
 * 1. Standard Completion Helper
 * Sends a prompt or conversation history to OpenRouter and returns the text completion.
 *
 * @param {string|Array} promptOrMessages - Plain string prompt or array of { role, content } messages.
 * @param {Object} [options={}] - Custom options (model, temperature, maxTokens, systemPrompt).
 * @returns {Promise<{ content: string, model: string, usage?: Object }>}
 */
export const generateCompletion = async (promptOrMessages, options = {}) => {
  const model = options.model || process.env.OPENROUTER_MODEL || defaultModel;

  // Normalise messages array
  const messages = Array.isArray(promptOrMessages)
    ? promptOrMessages
    : [
        ...(options.systemPrompt ? [{ role: 'system', content: options.systemPrompt }] : []),
        { role: 'user', content: promptOrMessages },
      ];

  // 1. Mock Mode Fallback
  if (isMock || !openRouterClient) {
    return {
      content: `[MOCK AI RESPONSE (${model})]: Successfully processed prompt "${typeof promptOrMessages === 'string' ? promptOrMessages.slice(0, 50) : 'message list'}..."`,
      model: `${model} (mock)`,
      mock: true,
      usage: { prompt_tokens: 15, completion_tokens: 25, total_tokens: 40 },
    };
  }

  // 2. Production OpenRouter Completion
  try {
    const response = await openRouterClient.chat.send({
      chatRequest: {
        model,
        messages,
        temperature: options.temperature ?? 0.7,
        maxTokens: options.maxTokens,
      },
      httpReferer: siteUrl,
      appTitle: siteName,
    });

    const choice = response.choices?.[0];
    const content = choice?.message?.content || '';

    return {
      content,
      model,
      usage: response.usage,
      raw: response,
    };
  } catch (error) {
    throw handleAiError(error, 'generateCompletion');
  }
};

/**
 * 2. Streaming Completion Helper
 * Streams tokens as an async generator.
 *
 * @param {string|Array} promptOrMessages - Prompt text or message array
 * @param {Object} [options={}] - Streaming configuration options
 * @returns {AsyncGenerator<string>} Yields text chunks as they arrive
 */
export async function* generateStream(promptOrMessages, options = {}) {
  const model = options.model || process.env.OPENROUTER_MODEL || defaultModel;

  const messages = Array.isArray(promptOrMessages)
    ? promptOrMessages
    : [
        ...(options.systemPrompt ? [{ role: 'system', content: options.systemPrompt }] : []),
        { role: 'user', content: promptOrMessages },
      ];

  // 1. Mock Streaming Fallback
  if (isMock || !openRouterClient) {
    const mockWords = [
      '[MOCK',
      ' STREAM]:',
      ' This',
      ' is',
      ' a',
      ' simulated',
      ' token',
      ' stream',
      ' generated',
      ' by',
      ' TechnoVerse',
      ' AI',
      ' service.',
    ];
    for (const word of mockWords) {
      await new Promise((resolve) => setTimeout(resolve, 50));
      yield word;
    }
    return;
  }

  // 2. Production OpenRouter Streaming
  try {
    const stream = await openRouterClient.chat.send({
      chatRequest: {
        model,
        messages,
        stream: true,
        temperature: options.temperature ?? 0.7,
      },
      httpReferer: siteUrl,
      appTitle: siteName,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices?.[0]?.delta?.content;
      if (delta) {
        yield delta;
      }
    }
  } catch (error) {
    throw handleAiError(error, 'generateStream');
  }
}

/**
 * 3. Structured JSON Output Helper
 * Guarantees that the response is parsed JSON adhering to a specified Zod schema.
 *
 * @param {string|Array} promptOrMessages - Prompt or message list
 * @param {z.ZodType|Object} schema - Zod schema to validate against
 * @param {Object} [options={}] - Custom configuration
 * @returns {Promise<{ data: any, rawJson: string, model: string }>}
 */
export const generateStructuredOutput = async (promptOrMessages, schema, options = {}) => {
  const model = options.model || process.env.OPENROUTER_MODEL || defaultModel;

  // Augment system prompt to enforce JSON format
  const jsonInstruction =
    'Respond ONLY with valid JSON. Do not include markdown code block syntax (no ```json or ```). Return the raw JSON object directly.';

  const baseMessages = Array.isArray(promptOrMessages)
    ? promptOrMessages
    : [{ role: 'user', content: promptOrMessages }];

  const messages = [
    { role: 'system', content: options.systemPrompt ? `${options.systemPrompt}\n${jsonInstruction}` : jsonInstruction },
    ...baseMessages,
  ];

  // 1. Mock Structured Output Fallback
  if (isMock || !openRouterClient) {
    const mockData = {
      mock: true,
      result: 'Mock structured output generated successfully',
      timestamp: new Date().toISOString(),
      model: `${model} (mock)`,
    };

    return {
      data: mockData,
      rawJson: JSON.stringify(mockData),
      model: `${model} (mock)`,
      mock: true,
    };
  }

  // 2. Production OpenRouter Structured Output
  try {
    const response = await openRouterClient.chat.send({
      chatRequest: {
        model,
        messages,
        responseFormat: { type: 'json_object' },
        temperature: options.temperature ?? 0.2,
      },
      httpReferer: siteUrl,
      appTitle: siteName,
    });

    const rawContent = response.choices?.[0]?.message?.content || '{}';

    // Strip markdown code fences if model accidentally emitted them
    const cleanedJson = rawContent
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    let parsed;
    try {
      parsed = JSON.parse(cleanedJson);
    } catch (parseErr) {
      throw new Error(`Failed to parse AI output as JSON: ${parseErr.message}. Content was: ${rawContent}`);
    }

    // Validate with Zod schema if provided
    let validatedData = parsed;
    if (schema && typeof schema.safeParse === 'function') {
      const result = schema.safeParse(parsed);
      if (!result.success) {
        throw new Error(`AI JSON response did not match expected schema: ${JSON.stringify(result.error.issues)}`);
      }
      validatedData = result.data;
    }

    return {
      data: validatedData,
      rawJson: cleanedJson,
      model,
      usage: response.usage,
    };
  } catch (error) {
    throw handleAiError(error, 'generateStructuredOutput');
  }
};

export default {
  generateCompletion,
  generateStream,
  generateStructuredOutput,
};
