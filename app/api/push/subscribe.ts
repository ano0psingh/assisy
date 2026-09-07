import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticatePushRequest, createPushAdminClient, setPushApiHeaders } from '../../server/push-auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setPushApiHeaders(res);

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const user = await authenticatePushRequest(req);
  if (!user) return res.status(401).json({ error: 'Authentication required' });

  const { subscription, habitReminders, timezone } = req.body ?? {};

  if (
    typeof subscription?.endpoint !== 'string'
    || typeof subscription?.keys?.p256dh !== 'string'
    || typeof subscription?.keys?.auth !== 'string'
  ) {
    return res.status(400).json({ error: 'Missing subscription' });
  }

  try {
    if (timezone) new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format();
    const supabase = createPushAdminClient();
    const row: Record<string, unknown> = {
      user_id: user.id,
      endpoint: subscription.endpoint,
      subscription,
      timezone: timezone || 'UTC',
      updated_at: new Date().toISOString(),
    };
    if (Array.isArray(habitReminders)) row.habit_reminders = habitReminders;
    const { error } = await supabase
      .from('push_subscriptions')
      .upsert(row, { onConflict: 'endpoint' });

    if (error) throw error;
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('Subscribe error:', e);
    return res.status(500).json({ error: 'Failed to save subscription or invalid timezone' });
  }
}
