import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_EMAIL = process.env.VAPID_EMAIL || 'mailto:anoop@assisy.app';

webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC, VAPID_PRIVATE);

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '',
);

function getMinutesInTimezone(tz: string): number {
  try {
    const now = new Date();
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(now);
    const hh = parseInt(parts.find(p => p.type === 'hour')?.value || '0');
    const mm = parseInt(parts.find(p => p.type === 'minute')?.value || '0');
    return hh * 60 + mm;
  } catch {
    return -1;
  }
}

function timeToMinutes(time: string): number {
  const [hh, mm] = time.split(':').map(Number);
  return (hh || 0) * 60 + (mm || 0);
}

function isWithinWindow(currentMinutes: number, targetMinutes: number, windowMinutes: number): boolean {
  const diff = Math.abs(currentMinutes - targetMinutes);
  return diff <= windowMinutes || (1440 - diff) <= windowMinutes;
}

function getDateInTimezone(tz: string): string {
  try {
    const now = new Date();
    return now.toLocaleDateString('en-CA', { timeZone: tz }); // en-CA gives YYYY-MM-DD
  } catch {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Verify this is called by Vercel Cron (optional security)
  const authHeader = req.headers.authorization;
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
    return res.status(500).json({ error: 'VAPID keys not configured' });
  }

  try {
    const { data: subs, error } = await supabase
      .from('push_subscriptions')
      .select('*');

    if (error) throw error;
    if (!subs || subs.length === 0) {
      return res.status(200).json({ sent: 0, message: 'No subscriptions' });
    }

    let sent = 0;
    const staleEndpoints: string[] = [];

    const WINDOW_MINUTES = 5;

    for (const sub of subs) {
      const tz = sub.timezone || 'Asia/Kolkata';
      const currentMinutes = getMinutesInTimezone(tz);
      const todayStr = getDateInTimezone(tz);
      const reminders: { name: string; time: string }[] = sub.habit_reminders || [];
      const lastSent: Record<string, string> = sub.last_sent || {};

      const planHour = sub.daily_planning_hour ?? 9;
      const planMinutes = planHour * 60;

      const dueReminders: string[] = [];

      if (isWithinWindow(currentMinutes, planMinutes, WINDOW_MINUTES) && lastSent['daily_plan'] !== todayStr) {
        dueReminders.push('daily_plan');
      }

      for (const r of reminders) {
        const targetMinutes = timeToMinutes(r.time);
        if (isWithinWindow(currentMinutes, targetMinutes, WINDOW_MINUTES) && lastSent[r.name] !== todayStr) {
          dueReminders.push(r.name);
        }
      }

      if (dueReminders.length === 0) continue;

      for (const reminder of dueReminders) {
        const payload = reminder === 'daily_plan'
          ? JSON.stringify({ title: 'Plan your day', body: 'Take a minute to review your tasks and set priorities.', tag: 'daily-planning' })
          : JSON.stringify({ title: `Don't forget: ${reminder}`, body: `Time to check in on your ${reminder} habit.`, tag: `habit-${reminder}` });

        try {
          await webpush.sendNotification(sub.subscription, payload);
          sent++;
          lastSent[reminder] = todayStr;
        } catch (err: unknown) {
          const statusCode = (err as { statusCode?: number })?.statusCode;
          if (statusCode === 410 || statusCode === 404) {
            staleEndpoints.push(sub.endpoint);
          }
        }
      }

      // Persist last_sent to prevent duplicate sends
      await supabase
        .from('push_subscriptions')
        .update({ last_sent: lastSent })
        .eq('endpoint', sub.endpoint);
    }

    // Clean up stale subscriptions
    if (staleEndpoints.length > 0) {
      await supabase.from('push_subscriptions').delete().in('endpoint', staleEndpoints);
    }

    return res.status(200).json({ sent, cleaned: staleEndpoints.length });
  } catch (e) {
    console.error('Cron error:', e);
    return res.status(500).json({ error: 'Cron failed' });
  }
}
