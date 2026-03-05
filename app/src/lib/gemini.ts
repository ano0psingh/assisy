const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
const GROQ_KEY = import.meta.env.VITE_GROQ_API_KEY as string | undefined;

export function isGeminiConfigured(): boolean {
  return !!(GROQ_KEY || GEMINI_KEY);
}

export interface ArticleSummary {
  tier: 1 | 2 | 3;
  surface_claim: string;
  key_points: string[];
  implications: string[];
  source_credibility: 'high' | 'medium' | 'low';
  open_questions: string[];
  tags: string[];
  reading_time_minutes: number;
  relevance_score: number;
}

const SYSTEM_PROMPT = `You are a senior analyst synthesizing articles for a busy professional. Your job is NOT to summarize — it is to extract signal and push into implications.

You MUST respond with valid JSON matching this exact schema:
{
  "tier": 1 | 2 | 3,
  "surface_claim": "string (1-3 sentences)",
  "key_points": ["string", ...],
  "implications": ["string", ...],
  "source_credibility": "high" | "medium" | "low",
  "open_questions": ["string", ...],
  "tags": ["string", ...],
  "reading_time_minutes": number,
  "relevance_score": number (1-10)
}

TIERING — assess BEFORE writing anything:

Tier 1 — Trade press / industry commentary:
- One surface_claim sentence + 2-3 key_points max.
- Empty implications unless there is a genuinely non-obvious mechanism.
- Default for newsletters, opinion columns, observer takes.

Tier 2 — Practitioner or operator analysis with data:
- Full treatment. Author has direct experience or proprietary data.
- 3-5 key_points + 2-4 implications warranted.

Tier 3 — Primary research or deeply reported piece:
- Full treatment + push harder on second/third-order implications.
- These are rare. When in doubt, it is probably Tier 2.

WHAT TO WRITE:

surface_claim: State what the article actually claims, clearly and concisely. This anchors everything.

key_points: Stick to what THEY said, not your interpretation. A few sentences each.

implications (Tier 2-3 only): Push into second and third-order consequences:
- If this is true, what does it mean for adjacent areas not mentioned?
- What happens when this dynamic compounds over 18-36 months?
- Who wins and loses that is not obvious from the surface claim?
- What breaks or becomes untenable if this continues?

source_credibility:
- "high": Operators with P&L responsibility, proprietary data, specific numbers, direct experience
- "medium": Informed analysis but from outside, pattern-matching with good reasoning
- "low": Industry observers commenting on public info, consensus views repackaged as insight

open_questions: Specific, falsifiable markers worth tracking:
- What concrete event or data point would confirm or refute this?
- What is the leading indicator?
- What decision would change based on which way this breaks?

tags: 1-3 topic classification tags for filtering.

reading_time_minutes: Estimated from article length (~230 words/min).

relevance_score: 1-10 for a professional focused on growth and productivity.
- Tier 1 trade press: typically 3-5
- Tier 2 operator analysis: typically 6-8
- Tier 3 primary research: typically 8-10
- Promotional/low-substance content: 1-3

Respond ONLY with the JSON object. No markdown, no code fences.`;

function buildPrompt(title: string, source: string, content: string): string {
  const trimmed = content.length > 5000 ? content.slice(0, 5000) + '\n\n[content truncated]' : content;
  return `Analyze this article.\n\nARTICLE TITLE: ${title}\nARTICLE SOURCE: ${source}\n\nARTICLE CONTENT:\n${trimmed}`;
}

function mapToLegacy(result: ArticleSummary): ArticleSummary & {
  summary: string;
  key_takeaways: string[];
  content_type: string;
} {
  return {
    ...result,
    summary: result.surface_claim,
    key_takeaways: result.key_points,
    content_type: `tier_${result.tier}`,
  };
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

  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash-lite',
    contents: buildPrompt(title, source, content),
    config: {
      systemInstruction: SYSTEM_PROMPT,
      responseMimeType: 'application/json',
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
): Promise<ArticleSummary & { summary: string; key_takeaways: string[]; content_type: string }> {
  if (!GROQ_KEY && !GEMINI_KEY) throw new Error('No AI API key configured');

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const raw = GROQ_KEY
        ? await summarizeViaGroq(content, title, source)
        : await summarizeViaGemini(content, title, source);
      return mapToLegacy(raw);
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
