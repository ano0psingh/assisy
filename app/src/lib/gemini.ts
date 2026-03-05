const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
const GROQ_KEY = import.meta.env.VITE_GROQ_API_KEY as string | undefined;

export function isGeminiConfigured(): boolean {
  return !!(GROQ_KEY || GEMINI_KEY);
}

export interface ArticleSummary {
  summary: string;
  key_takeaways: string[];
  tags: string[];
  reading_time_minutes: number;
  relevance_score: number;
  content_type: 'deep_dive' | 'quick_tip' | 'opinion' | 'news' | 'tutorial' | 'research';
}

const SYSTEM_PROMPT = `You are an expert knowledge curator for busy professionals. Your job is to transform articles and newsletters into high-value, actionable intelligence.

You MUST respond with valid JSON matching this exact schema:
{
  "summary": "2-3 sentence core argument summary",
  "key_takeaways": ["actionable takeaway starting with a verb", ...],
  "tags": ["topic tag", ...],
  "reading_time_minutes": number,
  "relevance_score": number (1-10),
  "content_type": "deep_dive" | "quick_tip" | "opinion" | "news" | "tutorial" | "research"
}

RULES:
- The summary must capture the CORE ARGUMENT, not surface-level description. Answer: "What is the author really saying, and why does it matter?"
- Key takeaways must be ACTIONABLE -- each one should start with a verb (e.g. "Use...", "Avoid...", "Consider...")
- Tags should classify the topic for filtering (e.g. "productivity", "career", "engineering", "ai")
- Reading time is estimated from the original article length (~230 words per minute)
- Relevance score (1-10) rates how useful this is for a professional focused on personal growth and productivity
- If the article is mostly promotional or has little substance, set relevance_score to 1-3
- content_type must be exactly one of: deep_dive, quick_tip, opinion, news, tutorial, research
- Respond ONLY with the JSON object, no markdown, no code fences.`;

function buildPrompt(title: string, source: string, content: string): string {
  const trimmed = content.length > 4000 ? content.slice(0, 4000) + '\n\n[content truncated]' : content;
  return `ARTICLE TITLE: ${title}\nARTICLE SOURCE: ${source}\n\nARTICLE CONTENT:\n${trimmed}`;
}

async function summarizeViaGroq(content: string, title: string, source: string): Promise<ArticleSummary> {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_KEY}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: buildPrompt(title, source, content) },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Groq API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content ?? '';
  return JSON.parse(text) as ArticleSummary;
}

async function summarizeViaGemini(content: string, title: string, source: string): Promise<ArticleSummary> {
  const { GoogleGenAI } = await import('@google/genai');
  const ai = new GoogleGenAI({ apiKey: GEMINI_KEY! });

  const RESPONSE_SCHEMA = {
    type: 'object',
    properties: {
      summary: { type: 'string' },
      key_takeaways: { type: 'array', items: { type: 'string' } },
      tags: { type: 'array', items: { type: 'string' } },
      reading_time_minutes: { type: 'number' },
      relevance_score: { type: 'number' },
      content_type: { type: 'string', enum: ['deep_dive', 'quick_tip', 'opinion', 'news', 'tutorial', 'research'] },
    },
    required: ['summary', 'key_takeaways', 'tags', 'reading_time_minutes', 'relevance_score', 'content_type'],
  };

  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash-lite',
    contents: buildPrompt(title, source, content),
    config: {
      systemInstruction: SYSTEM_PROMPT,
      responseMimeType: 'application/json',
      responseSchema: RESPONSE_SCHEMA as never,
      temperature: 0.3,
    },
  });

  const text = response.text ?? '';
  return JSON.parse(text) as ArticleSummary;
}

export async function summarizeArticle(
  content: string,
  title: string,
  source: string,
  maxRetries = 2,
): Promise<ArticleSummary> {
  if (!GROQ_KEY && !GEMINI_KEY) throw new Error('No AI API key configured');

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (GROQ_KEY) {
        return await summarizeViaGroq(content, title, source);
      }
      return await summarizeViaGemini(content, title, source);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      const isRateLimit = msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('rate_limit');
      if (isRateLimit && attempt < maxRetries) {
        const waitSec = GROQ_KEY ? 10 : 60;
        console.log(`Rate limited, waiting ${waitSec}s before retry (attempt ${attempt + 1}/${maxRetries})...`);
        await delay(waitSec * 1000);
        continue;
      }
      throw err;
    }
  }
  throw new Error('Max retries exceeded');
}

export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
