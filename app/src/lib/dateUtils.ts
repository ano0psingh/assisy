/**
 * Get YYYY-MM-DD string in LOCAL timezone (not UTC).
 * This is critical for habit/task day boundaries — using toISOString()
 * returns UTC which causes dates to be off by a day in timezones like IST.
 */
export function getLocalDateString(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Add calendar days in local time, preserving day boundaries across DST changes. */
export function addLocalDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

const LOCAL_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const LOCAL_TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export interface SchedulableTask {
  scheduledDate?: string;
  scheduledTime?: string;
  durationMinutes?: number;
  focusedDate?: string;
}

/** Parse a local YYYY-MM-DD without letting the Date constructor interpret it as UTC. */
export function parseLocalDate(value: string | undefined | null): Date | null {
  if (!value) return null;
  const match = LOCAL_DATE_RE.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year
    || date.getMonth() !== month - 1
    || date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

export function isLocalDateString(value: string | undefined | null): value is string {
  return parseLocalDate(value) !== null;
}

/** Return a canonical local date string, or undefined for invalid input. */
export function normalizeLocalDateString(value: string | Date | undefined | null): string | undefined {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? undefined : getLocalDateString(value);
  }
  const parsed = parseLocalDate(value);
  return parsed ? getLocalDateString(parsed) : undefined;
}

export function normalizeLocalTime(value: string | undefined | null): string | undefined {
  return value && LOCAL_TIME_RE.test(value) ? value : undefined;
}

/** Prefer the new scheduling field, falling back to legacy focusedDate data. */
export function getScheduledDate(task: Pick<SchedulableTask, 'scheduledDate' | 'focusedDate'>): string | undefined {
  return normalizeLocalDateString(task.scheduledDate)
    ?? normalizeLocalDateString(task.focusedDate);
}

export function isTaskScheduledOn(
  task: Pick<SchedulableTask, 'scheduledDate' | 'focusedDate'>,
  date: string | Date,
): boolean {
  const dateString = normalizeLocalDateString(date);
  return dateString !== undefined && getScheduledDate(task) === dateString;
}

/** Clamp durations to a usable 5-minute to 24-hour calendar block. */
export function normalizeDurationMinutes(value: number | undefined | null, fallback = 30): number {
  const safeFallback = Number.isFinite(fallback) ? Math.min(1440, Math.max(5, Math.round(fallback))) : 30;
  if (value == null || !Number.isFinite(value)) return safeFallback;
  return Math.min(1440, Math.max(5, Math.round(value)));
}

export function getScheduledStartMinute(
  task: Pick<SchedulableTask, 'scheduledTime'>,
): number | null {
  const time = normalizeLocalTime(task.scheduledTime);
  if (!time) return null;
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

export function getScheduledEndMinute(
  task: Pick<SchedulableTask, 'scheduledTime' | 'durationMinutes'>,
  fallbackDuration = 30,
): number | null {
  const start = getScheduledStartMinute(task);
  return start === null ? null : start + normalizeDurationMinutes(task.durationMinutes, fallbackDuration);
}

/**
 * Whether two timed blocks overlap on the same local day. Flexible/all-day
 * tasks have no start time and therefore do not collide with timed blocks.
 */
export function scheduledTasksOverlap(
  first: SchedulableTask,
  second: SchedulableTask,
  fallbackDuration = 30,
): boolean {
  const firstDate = getScheduledDate(first);
  const secondDate = getScheduledDate(second);
  if (!firstDate || firstDate !== secondDate) return false;

  const firstStart = getScheduledStartMinute(first);
  const secondStart = getScheduledStartMinute(second);
  const firstEnd = getScheduledEndMinute(first, fallbackDuration);
  const secondEnd = getScheduledEndMinute(second, fallbackDuration);
  if (firstStart === null || secondStart === null || firstEnd === null || secondEnd === null) {
    return false;
  }

  return firstStart < secondEnd && secondStart < firstEnd;
}

// Compatibility export for older callers; recurrence logic lives in one module.
export { isRecurrenceDate } from './recurrence';
