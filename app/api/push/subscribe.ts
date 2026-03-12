import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '',
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { subscription, userId, habitReminders, timezone } = req.body;

  if (!subscription?.endpoint) {
    return res.status(400).json({ error: 'Missing subscription' });
  }

  const uid = userId || 'anonymous';

  try {
    const { error } = await supabase
      .from('push_subscriptions')
      .upsert(
        {
          user_id: uid,
          endpoint: subscription.endpoint,
          subscription,
          habit_reminders: habitReminders || [],
          timezone: timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'endpoint' },
      );

    if (error) throw error;
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('Subscribe error:', e);
    return res.status(500).json({ error: 'Failed to save subscription' });
  }
}
