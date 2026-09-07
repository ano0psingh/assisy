export function isAIConfigured(): boolean {
  // Credentials are intentionally server-only, so configuration cannot be
  // inspected synchronously from the browser. The endpoint reports a safe
  // configuration error if neither provider is available.
  return true;
}

export function getAIProvider(): 'groq' | 'gemini' | null {
  // Provider selection and fallback now happen server-side.
  return null;
}

export interface AskAIOptions {
  temperature?: number;
  jsonMode?: boolean;
  systemPrompt?: string;
  maxRetries?: number;
}

/**
 * Unified AI call. Provider selection, retries, and fallback are server-side.
 */
export async function askAI(
  prompt: string,
  options: AskAIOptions = {},
): Promise<string> {
  const response = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      ...(options.systemPrompt ? { systemPrompt: options.systemPrompt } : {}),
      options: {
        ...(options.temperature !== undefined ? { temperature: options.temperature } : {}),
        ...(options.jsonMode !== undefined ? { jsonMode: options.jsonMode } : {}),
        ...(options.maxRetries !== undefined ? { maxRetries: options.maxRetries } : {}),
      },
    }),
  });

  const data = await response.json().catch(() => null) as {
    text?: unknown;
    error?: unknown;
  } | null;
  if (!response.ok) {
    throw new Error(
      typeof data?.error === 'string' ? data.error : 'AI service is unavailable',
    );
  }
  if (typeof data?.text !== 'string') throw new Error('AI service returned an invalid response');
  return data.text;
}

/**
 * Ask AI and parse the response as JSON. Automatically enables jsonMode.
 */
export async function askAIJson<T = unknown>(
  prompt: string,
  options: AskAIOptions = {},
): Promise<T> {
  const text = await askAI(prompt, { ...options, jsonMode: true });
  return parseAIJson<T>(text);
}

export function parseAIJson<T = unknown>(text: string): T {
  try {
    return JSON.parse(text) as T;
  } catch {
    // Sometimes the response has markdown fences around the JSON
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned) as T;
  }
}
