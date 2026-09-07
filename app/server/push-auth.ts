import type { VercelRequest } from '@vercel/node';
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';

function supabaseUrl(): string {
  return process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
}

export function createPushAdminClient(): SupabaseClient {
  const url = supabaseUrl();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || '';
  if (!url || !serviceKey) throw new Error('Supabase push service credentials are not configured');
  return createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function authenticatePushRequest(req: VercelRequest): Promise<User | null> {
  const authorization = req.headers.authorization;
  const token = typeof authorization === 'string' && authorization.startsWith('Bearer ')
    ? authorization.slice(7)
    : '';
  const url = supabaseUrl();
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
  if (!token || !url || !anonKey) return null;
  const client = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await client.auth.getUser(token);
  return error ? null : data.user;
}

export function setPushApiHeaders(res: { setHeader(name: string, value: string): unknown }): void {
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  res.setHeader('Cache-Control', 'no-store');
}
