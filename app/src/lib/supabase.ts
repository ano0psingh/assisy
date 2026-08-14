import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = url && anonKey
  ? createClient(url, anonKey)
  : null;

export const supabaseUrl: string | undefined = url;
export const supabaseAnonKey: string | undefined = anonKey;

export function isSupabaseConfigured(): boolean {
  return !!(url && anonKey);
}

/**
 * The access token, cached synchronously.
 *
 * `auth.getSession()` is async, which is unusable in an unload handler where the
 * last pending save has to be sent without awaiting anything.
 */
let cachedAccessToken: string | null = null;

if (supabase) {
  void supabase.auth.getSession().then(({ data }) => {
    cachedAccessToken = data.session?.access_token ?? null;
  });
  supabase.auth.onAuthStateChange((_event, session) => {
    cachedAccessToken = session?.access_token ?? null;
  });
}

export function getCachedAccessToken(): string | null {
  return cachedAccessToken;
}
