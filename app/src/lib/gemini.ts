import { askAIJson } from './ai';

export function isGeminiConfigured(): boolean {
  return true;
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
  matched_goals?: string[];
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

Additionally, if active goal titles are provided, assess which goals this article is most relevant to.
Add a "matched_goals" field to your JSON response: an array of goal titles that this article is relevant to (empty array if none match).

Respond ONLY with the JSON object. No markdown, no code fences.`;

function buildPrompt(title: string, source: string, content: string, goalTitles?: string[]): string {
  const trimmed = content.length > 5000 ? content.slice(0, 5000) + '\n\n[content truncated]' : content;
  let prompt = `Analyze this article.\n\nARTICLE TITLE: ${title}\nARTICLE SOURCE: ${source}\n\nARTICLE CONTENT:\n${trimmed}`;
  if (goalTitles?.length) {
    prompt += `\n\nUSER'S ACTIVE GOALS: ${goalTitles.join(', ')}`;
  }
  return prompt;
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

export async function summarizeArticle(
  content: string,
  title: string,
  source: string,
  maxRetries = 2,
  goalTitles?: string[],
): Promise<ArticleSummary & { summary: string; key_takeaways: string[]; content_type: string }> {
  const raw = await askAIJson<ArticleSummary>(
    buildPrompt(title, source, content, goalTitles),
    {
      systemPrompt: SYSTEM_PROMPT,
      temperature: 0.3,
      maxRetries,
    },
  );
  return mapToLegacy(raw);
}

export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
