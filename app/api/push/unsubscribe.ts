import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticatePushRequest, createPushAdminClient, setPushApiHeaders } from '../../server/push-auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setPushApiHeaders(res);

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const user = await authenticatePushRequest(req);
  if (!user) return res.status(401).json({ error: 'Authentication required' });
  const { endpoint } = req.body ?? {};
  if (!endpoint) return res.status(400).json({ error: 'Missing endpoint' });

  try {
    const supabase = createPushAdminClient();
    const { error } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('endpoint', endpoint)
      .eq('user_id', user.id);
    if (error) throw error;
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('Unsubscribe error:', e);
    return res.status(500).json({ error: 'Failed to remove subscription' });
  }
}
