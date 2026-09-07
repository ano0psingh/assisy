import type { VercelRequest, VercelResponse } from '@vercel/node';
import webpush from 'web-push';
import { authenticatePushRequest, createPushAdminClient, setPushApiHeaders } from '../../server/push-auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setPushApiHeaders(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const user = await authenticatePushRequest(req);
  if (!user) return res.status(401).json({ error: 'Authentication required' });
  const endpoint = req.body?.endpoint;
  if (typeof endpoint !== 'string') return res.status(400).json({ error: 'Missing endpoint' });

  const publicKey = process.env.VAPID_PUBLIC_KEY || '';
  const privateKey = process.env.VAPID_PRIVATE_KEY || '';
  if (!publicKey || !privateKey) return res.status(500).json({ error: 'VAPID keys not configured' });
  webpush.setVapidDetails(process.env.VAPID_EMAIL || 'mailto:anoop@assisy.app', publicKey, privateKey);

  try {
    const supabase = createPushAdminClient();
    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('endpoint, subscription')
      .eq('user_id', user.id)
      .eq('endpoint', endpoint);
    if (error) throw error;
    if (!subscriptions?.length) return res.status(404).json({ error: 'No push subscription for this account' });

    let sent = 0;
    for (const subscription of subscriptions) {
      try {
        await webpush.sendNotification(subscription.subscription, JSON.stringify({
          title: 'Assisy test notification',
          body: 'Push delivery is configured for this account and browser.',
          tag: 'assisy-push-test',
          url: '/?settings=account',
        }));
        sent++;
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await supabase.from('push_subscriptions').delete().eq('endpoint', subscription.endpoint).eq('user_id', user.id);
        }
      }
    }
    return sent > 0
      ? res.status(200).json({ ok: true, sent })
      : res.status(502).json({ error: 'Push provider rejected every subscription' });
  } catch (error) {
    console.error('Test push error:', error);
    return res.status(500).json({ error: 'Failed to send test notification' });
  }
}
