import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  AI_LIMITS,
  AIRequestError,
  generateAI,
  parseAIRequest,
} from '../server/ai-service.js';

const PRODUCTION_ORIGIN = 'https://app-seven-lilac-81.vercel.app';

function allowedOrigins(req: VercelRequest): Set<string> {
  const origins = new Set<string>([PRODUCTION_ORIGIN]);
  const host = req.headers.host;
  if (host) {
    origins.add(`https://${host}`);
    origins.add(`http://${host}`);
  }

  for (const candidate of [
    process.env.APP_URL,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
    ...(process.env.AI_ALLOWED_ORIGINS?.split(',') ?? []),
  ]) {
    const origin = candidate?.trim().replace(/\/$/, '');
    if (origin) origins.add(origin);
  }
  return origins;
}

function applyCors(req: VercelRequest, res: VercelResponse): boolean {
  const origin = typeof req.headers.origin === 'string' ? req.headers.origin : undefined;
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '600');

  if (!origin) return true;
  if (!allowedOrigins(req).has(origin)) return false;
  res.setHeader('Access-Control-Allow-Origin', origin);
  return true;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!applyCors(req, res)) {
    return res.status(403).json({ error: 'Origin not allowed', code: 'ORIGIN_NOT_ALLOWED' });
  }
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(405).json({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' });
  }

  const contentType = req.headers['content-type'];
  if (typeof contentType !== 'string' || !contentType.toLowerCase().startsWith('application/json')) {
    return res.status(415).json({ error: 'Content-Type must be application/json', code: 'INVALID_CONTENT_TYPE' });
  }

  const declaredLength = Number(req.headers['content-length'] ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > AI_LIMITS.maxBodyBytes) {
    return res.status(413).json({ error: 'Request body is too large', code: 'PAYLOAD_TOO_LARGE' });
  }

  try {
    const bodyBytes = Buffer.byteLength(JSON.stringify(req.body ?? null), 'utf8');
    if (bodyBytes > AI_LIMITS.maxBodyBytes) {
      return res.status(413).json({ error: 'Request body is too large', code: 'PAYLOAD_TOO_LARGE' });
    }

    const payload = parseAIRequest(req.body);
    const result = await generateAI(payload, {
      GROQ_API_KEY: process.env.GROQ_API_KEY,
      GEMINI_API_KEY: process.env.GEMINI_API_KEY,
      VITE_GROQ_API_KEY: process.env.VITE_GROQ_API_KEY,
      VITE_GEMINI_API_KEY: process.env.VITE_GEMINI_API_KEY,
    });
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json(result);
  } catch (error) {
    if (error instanceof AIRequestError) {
      return res.status(error.status).json({ error: error.message, code: error.code });
    }
    console.error('AI endpoint failed without provider details');
    return res.status(500).json({ error: 'AI service failed', code: 'AI_ERROR' });
  }
}
