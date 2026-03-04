import { GoogleGenAI } from '@google/genai';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;

export function isGeminiConfigured(): boolean {
  return !!API_KEY;
}

export interface ArticleSummary {
  summary: string;
  key_takeaways: string[];
  tags: string[];
  reading_time_minutes: number;
  relevance_score: number;
  content_type: 'deep_dive' | 'quick_tip' | 'opinion' | 'news' | 'tutorial' | 'research';
}

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    summary: { type: 'string', description: '2-3 sentence core argument summary' },
    key_takeaways: {
      type: 'array',
      items: { type: 'string' },
      description: '3-5 actionable takeaways, each starting with a verb',
    },
    tags: {
      type: 'array',
      items: { type: 'string' },
      description: '1-3 topic classification tags',
    },
    reading_time_minutes: { type: 'number', description: 'Estimated reading time of original article in minutes' },
    relevance_score: { type: 'number', description: 'How useful for a productivity-focused professional, 1-10' },
    content_type: {
      type: 'string',
      enum: ['deep_dive', 'quick_tip', 'opinion', 'news', 'tutorial', 'research'],
      description: 'Type of content',
    },
  },
  required: ['summary', 'key_takeaways', 'tags', 'reading_time_minutes', 'relevance_score', 'content_type'],
};

const SYSTEM_PROMPT = `You are an expert knowledge curator for busy professionals. Your job is to transform articles and newsletters into high-value, actionable intelligence.

RULES:
- The summary must be 2-3 sentences that capture the CORE ARGUMENT, not surface-level description. Answer: "What is the author really saying, and why does it matter?"
- Key takeaways must be ACTIONABLE -- each one should start with a verb (e.g. "Use...", "Avoid...", "Consider...", "Replace X with Y...")
- Tags should classify the topic for filtering (e.g. "productivity", "career", "engineering", "leadership", "health")
- Reading time is estimated from the original article length (roughly 230 words per minute)
- Relevance score (1-10) rates how useful this is for a professional focused on personal growth and productivity
- If the article is mostly promotional or has little substance, set relevance_score to 1-3
- content_type should be one of: deep_dive, quick_tip, opinion, news, tutorial, research`;

function buildPrompt(title: string, source: string, content: string): string {
  const trimmed = content.length > 12000 ? content.slice(0, 12000) + '\n\n[content truncated]' : content;
  return `ARTICLE TITLE: ${title}\nARTICLE SOURCE: ${source}\n\nARTICLE CONTENT:\n${trimmed}`;
}

export async function summarizeArticle(
  content: string,
  title: string,
  source: string,
): Promise<ArticleSummary> {
  if (!API_KEY) throw new Error('Gemini API key not configured');

  const ai = new GoogleGenAI({ apiKey: API_KEY });

  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
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

export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
