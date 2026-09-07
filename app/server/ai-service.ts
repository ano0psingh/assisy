import { GoogleGenAI } from '@google/genai';
import { resolveAIKeys, type AIEnvironment } from './ai-config.js';

export const AI_LIMITS = {
  maxBodyBytes: 40_000,
  maxPromptLength: 24_000,
  maxSystemPromptLength: 12_000,
  maxRetries: 2,
} as const;

export interface AIRequestOptions {
  temperature?: number;
  jsonMode?: boolean;
  maxRetries?: number;
}

export interface AIRequestPayload {
  prompt: string;
  systemPrompt?: string;
  options?: AIRequestOptions;
}

export interface AIResult {
  text: string;
  provider: 'groq' | 'gemini';
}

export class AIRequestError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(
    message: string,
    status: number,
    code: string,
  ) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

class ProviderError extends Error {
  readonly provider: 'groq' | 'gemini';
  readonly status?: number;

  constructor(
    provider: 'groq' | 'gemini',
    status?: number,
  ) {
    super(`${provider} request failed`);
    this.provider = provider;
    this.status = status;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(value: Record<string, unknown>, allowed: readonly string[]): boolean {
  return Object.keys(value).every(key => allowed.includes(key));
}

export function parseAIRequest(value: unknown): AIRequestPayload {
  if (!isRecord(value) || !hasOnlyKeys(value, ['prompt', 'systemPrompt', 'options'])) {
    throw new AIRequestError('Invalid request payload', 400, 'INVALID_PAYLOAD');
  }

  if (
    typeof value.prompt !== 'string'
    || value.prompt.trim().length === 0
    || value.prompt.length > AI_LIMITS.maxPromptLength
  ) {
    throw new AIRequestError('Prompt is required and must be within the length limit', 400, 'INVALID_PROMPT');
  }

  if (
    value.systemPrompt !== undefined
    && (typeof value.systemPrompt !== 'string' || value.systemPrompt.length > AI_LIMITS.maxSystemPromptLength)
  ) {
    throw new AIRequestError('System prompt exceeds the length limit', 400, 'INVALID_SYSTEM_PROMPT');
  }

  const optionsValue = value.options;
  if (
    optionsValue !== undefined
    && (!isRecord(optionsValue) || !hasOnlyKeys(optionsValue, ['temperature', 'jsonMode', 'maxRetries']))
  ) {
    throw new AIRequestError('Invalid AI options', 400, 'INVALID_OPTIONS');
  }

  const options = optionsValue as Record<string, unknown> | undefined;
  const temperature = options?.temperature;
  const jsonMode = options?.jsonMode;
  const maxRetries = options?.maxRetries;

  if (
    temperature !== undefined
    && (typeof temperature !== 'number' || !Number.isFinite(temperature) || temperature < 0 || temperature > 2)
  ) {
    throw new AIRequestError('Temperature must be between 0 and 2', 400, 'INVALID_OPTIONS');
  }
  if (jsonMode !== undefined && typeof jsonMode !== 'boolean') {
    throw new AIRequestError('jsonMode must be a boolean', 400, 'INVALID_OPTIONS');
  }
  if (
    maxRetries !== undefined
    && (!Number.isInteger(maxRetries) || (maxRetries as number) < 0 || (maxRetries as number) > AI_LIMITS.maxRetries)
  ) {
    throw new AIRequestError(`maxRetries must be between 0 and ${AI_LIMITS.maxRetries}`, 400, 'INVALID_OPTIONS');
  }

  return {
    prompt: value.prompt,
    ...(typeof value.systemPrompt === 'string' && value.systemPrompt
      ? { systemPrompt: value.systemPrompt }
      : {}),
    ...(options
      ? {
          options: {
            ...(typeof temperature === 'number' ? { temperature } : {}),
            ...(typeof jsonMode === 'boolean' ? { jsonMode } : {}),
            ...(typeof maxRetries === 'number' ? { maxRetries } : {}),
          },
        }
      : {}),
  };
}

async function callGroq(
  apiKey: string,
  payload: AIRequestPayload,
): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  const messages: Array<{ role: 'system' | 'user'; content: string }> = [];
  if (payload.systemPrompt) messages.push({ role: 'system', content: payload.systemPrompt });
  messages.push({ role: 'user', content: payload.prompt });

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-20b',
        messages,
        temperature: payload.options?.temperature ?? 0.5,
        max_completion_tokens: 4096,
        ...(payload.options?.jsonMode
          ? { response_format: { type: 'json_object' } }
          : {}),
      }),
    });

    if (!response.ok) throw new ProviderError('groq', response.status);
    const data = await response.json() as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = data.choices?.[0]?.message?.content;
    if (typeof text !== 'string' || text.length === 0) throw new ProviderError('groq');
    return text;
  } catch (error) {
    if (error instanceof ProviderError) throw error;
    throw new ProviderError('groq');
  } finally {
    clearTimeout(timeout);
  }
}

async function callGemini(
  apiKey: string,
  payload: AIRequestPayload,
): Promise<string> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await Promise.race([
      ai.models.generateContent({
        model: 'gemini-3.5-flash-lite',
        contents: payload.prompt,
        config: {
          temperature: payload.options?.temperature ?? 0.5,
          maxOutputTokens: 4096,
          ...(payload.systemPrompt ? { systemInstruction: payload.systemPrompt } : {}),
          ...(payload.options?.jsonMode ? { responseMimeType: 'application/json' } : {}),
        },
      }),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => reject(new ProviderError('gemini')), 30_000);
      }),
    ]);
    const text = response.text;
    if (typeof text !== 'string' || text.length === 0) throw new ProviderError('gemini');
    return text;
  } catch (error) {
    if (error instanceof ProviderError) throw error;
    const status = isRecord(error) && typeof error.status === 'number' ? error.status : undefined;
    throw new ProviderError('gemini', status);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export async function generateAI(
  payload: AIRequestPayload,
  env: AIEnvironment,
): Promise<AIResult> {
  const keys = resolveAIKeys(env);
  const providers = [
    ...(keys.groq ? [{ name: 'groq' as const, call: () => callGroq(keys.groq!, payload) }] : []),
    ...(keys.gemini ? [{ name: 'gemini' as const, call: () => callGemini(keys.gemini!, payload) }] : []),
  ];

  if (providers.length === 0) {
    throw new AIRequestError('AI service is not configured', 503, 'AI_NOT_CONFIGURED');
  }

  const maxRetries = payload.options?.maxRetries ?? 2;
  let allRateLimited = false;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    const failures: ProviderError[] = [];
    for (const provider of providers) {
      try {
        return { text: await provider.call(), provider: provider.name };
      } catch (error) {
        failures.push(error instanceof ProviderError ? error : new ProviderError(provider.name));
      }
    }

    allRateLimited = failures.length > 0 && failures.every(error => error.status === 429);
    if (attempt < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, 250 * (attempt + 1)));
    }
  }

  throw new AIRequestError(
    allRateLimited ? 'AI providers are temporarily rate limited' : 'AI service is temporarily unavailable',
    allRateLimited ? 429 : 502,
    allRateLimited ? 'AI_RATE_LIMITED' : 'AI_UNAVAILABLE',
  );
}
