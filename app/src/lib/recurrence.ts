import type { RecurrenceRule, Task } from '../types';

type RecurringLike = Pick<Task,
  | 'createdAt'
  | 'recurrencePattern'
  | 'recurrenceRule'
  | 'specificDays'
  | 'monthDay'
  | 'pausedUntil'
  | 'skippedDates'
>;

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

function parseDate(value: string): Date | null {
  const match = DATE_RE.exec(value);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12);
  return date.getFullYear() === Number(match[1])
    && date.getMonth() === Number(match[2]) - 1
    && date.getDate() === Number(match[3]) ? date : null;
}

function formatDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function calendarDayNumber(date: Date): number {
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000);
}

function daysBetween(start: Date, end: Date): number {
  return calendarDayNumber(end) - calendarDayNumber(start);
}

function lastDayOfMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

export function getRecurrenceRule(task: Partial<RecurringLike>): RecurrenceRule | null {
  if (task.recurrenceRule?.frequency) {
    return {
      ...task.recurrenceRule,
      interval: Math.max(1, Math.floor(task.recurrenceRule.interval ?? 1)),
      weekdays: task.recurrenceRule.weekdays?.filter(day => day >= 0 && day <= 6),
    };
  }
  if (!task.recurrencePattern) return null;
  const frequency = task.recurrencePattern === 'specific_days'
    ? 'weekly'
    : task.recurrencePattern;
  return {
    frequency,
    interval: 1,
    weekdays: frequency === 'weekly' ? task.specificDays : undefined,
    monthDay: frequency === 'monthly' ? task.monthDay ?? 1 : undefined,
  };
}

function rawMatch(date: Date, start: Date, rule: RecurrenceRule): boolean {
  const elapsedDays = daysBetween(start, date);
  if (elapsedDays < 0) return false;
  const interval = Math.max(1, Math.floor(rule.interval ?? 1));
  if (rule.frequency === 'daily') return elapsedDays % interval === 0;
  if (rule.frequency === 'weekly') {
    const weekdays = rule.weekdays?.length ? rule.weekdays : [start.getDay()];
    return Math.floor(elapsedDays / 7) % interval === 0 && weekdays.includes(date.getDay());
  }
  const elapsedMonths = (date.getFullYear() - start.getFullYear()) * 12 + date.getMonth() - start.getMonth();
  if (rule.frequency === 'monthly') {
    if (elapsedMonths < 0 || elapsedMonths % interval !== 0) return false;
    return rule.monthEnd
      ? date.getDate() === lastDayOfMonth(date)
      : date.getDate() === (rule.monthDay ?? start.getDate());
  }
  const elapsedYears = date.getFullYear() - start.getFullYear();
  return elapsedYears >= 0
    && elapsedYears % interval === 0
    && date.getMonth() === start.getMonth()
    && date.getDate() === (rule.monthDay ?? start.getDate());
}

function countThrough(date: Date, start: Date, rule: RecurrenceRule): number {
  let count = 0;
  const cursor = new Date(start);
  while (cursor <= date) {
    if (rawMatch(cursor, start, rule)) count++;
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
}

function sourceIsValid(sourceDate: string, start: Date, rule: RecurrenceRule): boolean {
  const source = parseDate(sourceDate);
  if (!source || sourceDate < formatDate(start) || (rule.endDate && sourceDate > rule.endDate)) return false;
  return rawMatch(source, start, rule)
    && (!rule.count || countThrough(source, start, rule) <= rule.count);
}

/** Match an occurrence using local calendar arithmetic, never elapsed milliseconds. */
export function isRecurrenceDate(dateString: string, task: Partial<RecurringLike>): boolean {
  const date = parseDate(dateString);
  const rule = getRecurrenceRule(task);
  if (!date || !rule) return false;
  if (task.pausedUntil && dateString <= task.pausedUntil) return false;
  if (task.skippedDates?.includes(dateString)) return false;

  const fallbackStart = task.createdAt instanceof Date && !Number.isNaN(task.createdAt.getTime())
    ? formatDate(task.createdAt)
    : dateString;
  const startString = rule.startDate && parseDate(rule.startDate) ? rule.startDate : fallbackStart;
  const start = parseDate(startString)!;

  const movedHere = rule.overrides?.find(override =>
    override.action === 'reschedule' && override.rescheduledDate === dateString
  );
  if (movedHere) return sourceIsValid(movedHere.date, start, rule);
  if (rule.overrides?.some(override => override.date === dateString)) return false;
  if (dateString < startString || (rule.endDate && dateString > rule.endDate)) return false;
  if (!rawMatch(date, start, rule)) return false;
  return !rule.count || countThrough(date, start, rule) <= rule.count;
}

export function withSkippedOccurrence(task: Partial<RecurringLike>, date: string): RecurrenceRule {
  const rule = getRecurrenceRule(task) ?? { frequency: 'daily' };
  const overrides = (rule.overrides ?? []).filter(override => override.date !== date);
  return { ...rule, overrides: [...overrides, { date, action: 'skip' }] };
}

export function withRescheduledOccurrence(
  task: Partial<RecurringLike>,
  date: string,
  rescheduledDate: string,
): RecurrenceRule {
  const rule = getRecurrenceRule(task) ?? { frequency: 'daily' };
  const overrides = (rule.overrides ?? []).filter(override => override.date !== date);
  return {
    ...rule,
    overrides: [...overrides, { date, action: 'reschedule', rescheduledDate }],
  };
}

export function endRecurrenceBefore(task: Partial<RecurringLike>, date: string): RecurrenceRule {
  const rule = getRecurrenceRule(task) ?? { frequency: 'daily' };
  const parsed = parseDate(date);
  if (!parsed) return rule;
  parsed.setDate(parsed.getDate() - 1);
  return { ...rule, endDate: formatDate(parsed) };
}
