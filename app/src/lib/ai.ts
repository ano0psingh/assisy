const GROQ_KEY = import.meta.env.VITE_GROQ_API_KEY as string | undefined;
const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;

export function isAIConfigured(): boolean {
  return !!(GROQ_KEY || GEMINI_KEY);
}

export function getAIProvider(): 'groq' | 'gemini' | null {
  if (GROQ_KEY) return 'groq';
  if (GEMINI_KEY) return 'gemini';
  return null;
}

export interface AskAIOptions {
  temperature?: number;
  jsonMode?: boolean;
  systemPrompt?: string;
  maxRetries?: number;
}

async function callGroq(
  prompt: string,
  options: AskAIOptions = {},
): Promise<string> {
  const { temperature = 0.5, jsonMode = false, systemPrompt } = options;

  const messages: { role: string; content: string }[] = [];
  if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
  messages.push({ role: 'user', content: prompt });

  const body: Record<string, unknown> = {
    model: 'llama-3.3-70b-versatile',
    messages,
    temperature,
  };
  if (jsonMode) body.response_format = { type: 'json_object' };

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${GROQ_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Groq API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? '';
}

async function callGemini(
  prompt: string,
  options: AskAIOptions = {},
): Promise<string> {
  const { temperature = 0.5, jsonMode = false, systemPrompt } = options;
  const { GoogleGenAI } = await import('@google/genai');
  const ai = new GoogleGenAI({ apiKey: GEMINI_KEY! });

  const config: Record<string, unknown> = { temperature };
  if (systemPrompt) config.systemInstruction = systemPrompt;
  if (jsonMode) config.responseMimeType = 'application/json';

  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash-lite',
    contents: prompt,
    config,
  });

  return response.text ?? '';
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Unified AI call with automatic Groq -> Gemini fallback and retry logic.
 */
export async function askAI(
  prompt: string,
  options: AskAIOptions = {},
): Promise<string> {
  const maxRetries = options.maxRetries ?? 2;

  if (!GROQ_KEY && !GEMINI_KEY) {
    throw new Error('No AI API key configured. Add VITE_GROQ_API_KEY or VITE_GEMINI_API_KEY to .env.local.');
  }

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return GROQ_KEY
        ? await callGroq(prompt, options)
        : await callGemini(prompt, options);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      const isRateLimit =
        msg.includes('429') ||
        msg.includes('RESOURCE_EXHAUSTED') ||
        msg.includes('rate_limit');

      if (isRateLimit && attempt < maxRetries) {
        const waitSec = GROQ_KEY ? 10 : 60;
        await delay(waitSec * 1000);
        continue;
      }

      // If Groq failed (non-rate-limit) and Gemini is available, try Gemini
      if (GROQ_KEY && GEMINI_KEY && !isRateLimit) {
        try {
          return await callGemini(prompt, options);
        } catch {
          // Both failed, throw the original
        }
      }

      throw err;
    }
  }

  throw new Error('Max retries exceeded');
}

/**
 * Ask AI and parse the response as JSON. Automatically enables jsonMode.
 */
export async function askAIJson<T = unknown>(
  prompt: string,
  options: AskAIOptions = {},
): Promise<T> {
  const text = await askAI(prompt, { ...options, jsonMode: true });
  try {
    return JSON.parse(text) as T;
  } catch {
    // Sometimes the response has markdown fences around the JSON
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned) as T;
  }
}
