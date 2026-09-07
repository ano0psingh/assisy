export const REMINDER_OFFSETS = [0, 10, 30, 60, 1440] as const;
export const REMINDER_RETRY_WINDOW_MS = 16 * 60 * 1000;

export interface ReminderEvent {
  key: string;
  taskId: string;
  kind: 'scheduled' | 'deadline';
  title: string;
  remindAt: Date;
  targetAt: Date;
  offsetMinutes: number;
  url: string;
}

interface ReminderTask {
  id?: unknown;
  title?: unknown;
  status?: unknown;
  scheduledDate?: unknown;
  focusedDate?: unknown;
  scheduledTime?: unknown;
  scheduledReminderOffsets?: unknown;
  dueDate?: unknown;
  dueTime?: unknown;
  dueReminderOffsets?: unknown;
  deadline?: unknown;
  deadlineTime?: unknown;
  deadlineReminderOffsets?: unknown;
}

function validDatePart(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : null;
}

function validTime(value: unknown): string | null {
  return typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value) ? value : null;
}

function validOffsets(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((offset): offset is number =>
    typeof offset === 'number' && REMINDER_OFFSETS.includes(offset as typeof REMINDER_OFFSETS[number]),
  ))].sort((a, b) => b - a);
}

function zonedParts(date: Date, timeZone: string): Record<string, number> {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  return Object.fromEntries(parts
    .filter(part => part.type !== 'literal')
    .map(part => [part.type, Number(part.value)]));
}

/** Convert a wall-clock date/time in an IANA timezone to its UTC instant. */
export function zonedDateTimeToUtc(date: string, time: string, timeZone: string): Date | null {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const timeMatch = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time);
  if (!dateMatch || !timeMatch) return null;
  try {
    const desired = Date.UTC(
      Number(dateMatch[1]), Number(dateMatch[2]) - 1, Number(dateMatch[3]),
      Number(timeMatch[1]), Number(timeMatch[2]), 0,
    );
    let candidate = new Date(desired);
    for (let pass = 0; pass < 3; pass++) {
      const shown = zonedParts(candidate, timeZone);
      const shownAsUtc = Date.UTC(shown.year, shown.month - 1, shown.day, shown.hour, shown.minute, shown.second);
      candidate = new Date(candidate.getTime() + desired - shownAsUtc);
    }
    const roundTrip = zonedParts(candidate, timeZone);
    if (
      roundTrip.year !== Number(dateMatch[1])
      || roundTrip.month !== Number(dateMatch[2])
      || roundTrip.day !== Number(dateMatch[3])
      || roundTrip.hour !== Number(timeMatch[1])
      || roundTrip.minute !== Number(timeMatch[2])
    ) return null;
    return candidate;
  } catch {
    return null;
  }
}

export function isReminderDue(
  remindAt: Date,
  now: Date,
  retryWindowMs = REMINDER_RETRY_WINDOW_MS,
): boolean {
  const age = now.getTime() - remindAt.getTime();
  return age >= 0 && age <= retryWindowMs;
}

function addEvents(
  events: ReminderEvent[],
  task: ReminderTask,
  kind: ReminderEvent['kind'],
  date: string | null,
  time: string | null,
  offsets: number[],
  timeZone: string,
  now: Date,
  routeTaskId?: string,
): void {
  if (!date || !time || offsets.length === 0 || typeof task.id !== 'string') return;
  const targetAt = zonedDateTimeToUtc(date, time, timeZone);
  if (!targetAt) return;
  for (const offsetMinutes of offsets) {
    const remindAt = new Date(targetAt.getTime() - offsetMinutes * 60_000);
    if (!isReminderDue(remindAt, now)) continue;
    events.push({
      key: `task:${task.id}:${kind}:${targetAt.toISOString()}:${offsetMinutes}`,
      taskId: task.id,
      kind,
      title: typeof task.title === 'string' && task.title.trim() ? task.title.trim() : 'Task',
      remindAt,
      targetAt,
      offsetMinutes,
      url: kind === 'scheduled'
        ? `/calendar?task=${encodeURIComponent(routeTaskId ?? task.id)}`
        : `/tasks?task=${encodeURIComponent(routeTaskId ?? task.id)}`,
    });
  }
}

export function collectDueTaskReminders(
  tasks: ReminderTask[],
  projectTasks: ReminderTask[],
  timeZone: string,
  now: Date = new Date(),
): ReminderEvent[] {
  const events: ReminderEvent[] = [];
  for (const task of tasks) {
    if (task.status === 'Completed') continue;
    addEvents(
      events,
      task,
      'scheduled',
      validDatePart(task.scheduledDate) ?? validDatePart(task.focusedDate),
      validTime(task.scheduledTime),
      validOffsets(task.scheduledReminderOffsets),
      timeZone,
      now,
    );
    addEvents(
      events,
      task,
      'deadline',
      validDatePart(task.dueDate),
      validTime(task.dueTime),
      validOffsets(task.dueReminderOffsets),
      timeZone,
      now,
    );
  }
  for (const task of projectTasks) {
    if (task.status === 'Done') continue;
    addEvents(
      events,
      task,
      'scheduled',
      validDatePart(task.scheduledDate) ?? validDatePart(task.focusedDate),
      validTime(task.scheduledTime),
      validOffsets(task.scheduledReminderOffsets),
      timeZone,
      now,
      `pt-${task.id}`,
    );
    addEvents(
      events,
      task,
      'deadline',
      validDatePart(task.deadline),
      validTime(task.deadlineTime),
      validOffsets(task.deadlineReminderOffsets),
      timeZone,
      now,
      `pt-${task.id}`,
    );
  }
  return events.sort((a, b) => a.remindAt.getTime() - b.remindAt.getTime() || a.key.localeCompare(b.key));
}

export function reminderBody(event: ReminderEvent): string {
  if (event.offsetMinutes === 0) {
    return event.kind === 'scheduled' ? 'Your scheduled block starts now.' : 'This task is due now.';
  }
  const amount = event.offsetMinutes === 1440
    ? '1 day'
    : event.offsetMinutes === 60
      ? '1 hour'
      : `${event.offsetMinutes} minutes`;
  return event.kind === 'scheduled'
    ? `Your scheduled block starts in ${amount}.`
    : `This task is due in ${amount}.`;
}
