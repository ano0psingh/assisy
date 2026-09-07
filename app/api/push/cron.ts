import type { VercelRequest, VercelResponse } from '@vercel/node';
import webpush from 'web-push';
import { createPushAdminClient } from '../../server/push-auth';
import {
  collectDueTaskReminders,
  isReminderDue,
  reminderBody,
  zonedDateTimeToUtc,
  type ReminderEvent,
} from '../../server/reminders';

const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_EMAIL = process.env.VAPID_EMAIL || 'mailto:anoop@assisy.app';

webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC, VAPID_PRIVATE);

function getDateInTimezone(now: Date, tz: string): string {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(now);
    const part = (type: string) => parts.find(item => item.type === type)?.value ?? '';
    return `${part('year')}-${part('month')}-${part('day')}`;
  } catch {
    return now.toISOString().slice(0, 10);
  }
}

async function claimDelivery(
  supabase: ReturnType<typeof createPushAdminClient>,
  endpoint: string,
  userId: string,
  event: ReminderEvent,
): Promise<boolean> {
  const row = {
    subscription_endpoint: endpoint,
    reminder_key: event.key,
    user_id: userId,
    scheduled_for: event.remindAt.toISOString(),
    claimed_at: new Date().toISOString(),
  };
  const { error } = await supabase.from('push_reminder_deliveries').insert(row);
  if (!error) return true;
  if (error.code !== '23505') throw error;

  // A crashed invocation may have claimed but never sent. Reclaim after six
  // minutes, while the 16-minute eligibility window still allows one retry.
  const staleBefore = new Date(Date.now() - 6 * 60_000).toISOString();
  const { data, error: reclaimError } = await supabase
    .from('push_reminder_deliveries')
    .update({ claimed_at: row.claimed_at })
    .eq('subscription_endpoint', endpoint)
    .eq('reminder_key', event.key)
    .is('delivered_at', null)
    .lt('claimed_at', staleBefore)
    .select('reminder_key');
  if (reclaimError) throw reclaimError;
  return Boolean(data?.length);
}

function habitAndPlanningEvents(
  sub: Record<string, unknown>,
  now: Date,
  timeZone: string,
): ReminderEvent[] {
  const localDate = getDateInTimezone(now, timeZone);
  const definitions: { key: string; title: string; time: string; kind: 'daily' | 'habit' }[] = [{
    key: 'daily-plan',
    title: 'Plan your day',
    time: `${String(Number(sub.daily_planning_hour ?? 9)).padStart(2, '0')}:00`,
    kind: 'daily',
  }];
  const habits = Array.isArray(sub.habit_reminders) ? sub.habit_reminders : [];
  for (const habit of habits) {
    if (
      habit && typeof habit === 'object'
      && typeof (habit as { name?: unknown }).name === 'string'
      && typeof (habit as { time?: unknown }).time === 'string'
    ) {
      definitions.push({
        key: `habit:${(habit as { name: string }).name}`,
        title: (habit as { name: string }).name,
        time: (habit as { time: string }).time,
        kind: 'habit',
      });
    }
  }
  return definitions.flatMap(definition => {
    const targetAt = zonedDateTimeToUtc(localDate, definition.time, timeZone);
    if (!targetAt || !isReminderDue(targetAt, now)) return [];
    return [{
      key: `${definition.key}:${localDate}`,
      taskId: definition.key,
      kind: 'scheduled' as const,
      title: definition.title,
      remindAt: targetAt,
      targetAt,
      offsetMinutes: 0,
      url: definition.kind === 'daily' ? '/' : '/habits',
    }];
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const authHeader = req.headers.authorization;
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
    return res.status(500).json({ error: 'VAPID keys not configured' });
  }

  try {
    const supabase = createPushAdminClient();
    const { data: subs, error } = await supabase
      .from('push_subscriptions')
      .select('*');

    if (error) throw error;
    if (!subs || subs.length === 0) {
      return res.status(200).json({ sent: 0, message: 'No subscriptions' });
    }

    let sent = 0;
    const staleEndpoints: string[] = [];
    let failed = 0;
    const now = new Date();

    for (const sub of subs) {
      if (typeof sub.user_id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(sub.user_id)) {
        staleEndpoints.push(sub.endpoint);
        continue;
      }
      const tz = typeof sub.timezone === 'string' ? sub.timezone : 'UTC';
      const { data: userData } = await supabase
        .from('user_data')
        .select('tasks, project_tasks')
        .eq('user_id', sub.user_id)
        .maybeSingle();
      const taskEvents = collectDueTaskReminders(
        Array.isArray(userData?.tasks) ? userData.tasks : [],
        Array.isArray(userData?.project_tasks) ? userData.project_tasks : [],
        tz,
        now,
      );
      const events = [...taskEvents, ...habitAndPlanningEvents(sub, now, tz)];

      for (const event of events) {
        if (!await claimDelivery(supabase, sub.endpoint, sub.user_id, event)) continue;
        const isTask = event.key.startsWith('task:');
        const isDaily = event.key.startsWith('daily-plan:');
        const payload = JSON.stringify({
          title: isDaily ? 'Plan your day' : isTask ? event.title : `Don't forget: ${event.title}`,
          body: isDaily
            ? 'Take a minute to review your tasks and set priorities.'
            : isTask
              ? reminderBody(event)
              : `Time to check in on your ${event.title} habit.`,
          tag: event.key,
          url: event.url,
        });

        try {
          await webpush.sendNotification(sub.subscription, payload);
          sent++;
          await supabase
            .from('push_reminder_deliveries')
            .update({ delivered_at: new Date().toISOString() })
            .eq('subscription_endpoint', sub.endpoint)
            .eq('reminder_key', event.key);
        } catch (err: unknown) {
          const statusCode = (err as { statusCode?: number })?.statusCode;
          if (statusCode === 410 || statusCode === 404) {
            staleEndpoints.push(sub.endpoint);
          } else {
            failed++;
            // Re-open this event for the next cron invocation.
            await supabase
              .from('push_reminder_deliveries')
              .delete()
              .eq('subscription_endpoint', sub.endpoint)
              .eq('reminder_key', event.key)
              .is('delivered_at', null);
          }
        }
      }
    }

    if (staleEndpoints.length > 0) {
      await supabase.from('push_subscriptions').delete().in('endpoint', staleEndpoints);
    }
    // Delivery keys are only useful around their send window.
    await supabase
      .from('push_reminder_deliveries')
      .delete()
      .lt('scheduled_for', new Date(now.getTime() - 30 * 86400_000).toISOString());

    return res.status(200).json({ sent, failed, cleaned: new Set(staleEndpoints).size });
  } catch (e) {
    console.error('Cron error:', e);
    return res.status(500).json({ error: 'Cron failed' });
  }
}
