export interface AIEnvironment {
  GROQ_API_KEY?: string;
  GEMINI_API_KEY?: string;
  VITE_GROQ_API_KEY?: string;
  VITE_GEMINI_API_KEY?: string;
}

export interface AIKeys {
  groq?: string;
  gemini?: string;
}

function nonEmpty(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

/**
 * The VITE_* names are a temporary server-only rollout fallback. Never pass
 * this result through Vite's `define` option or return it to a client.
 */
export function resolveAIKeys(env: AIEnvironment): AIKeys {
  return {
    groq: nonEmpty(env.GROQ_API_KEY) ?? nonEmpty(env.VITE_GROQ_API_KEY),
    gemini: nonEmpty(env.GEMINI_API_KEY) ?? nonEmpty(env.VITE_GEMINI_API_KEY),
  };
}
