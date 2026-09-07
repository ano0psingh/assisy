import type { RecurrenceRule, Task } from '../types';
import { getScheduledDate, normalizeDurationMinutes, normalizeLocalTime } from './dateUtils';

const WEEKDAYS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

export function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\r\n|\r|\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,');
}

function plainText(html: string | undefined): string {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(?:p|div|li)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .trim();
}

function parseLocalDateTime(date: string, time: string): Date | null {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const timeMatch = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time);
  if (!dateMatch || !timeMatch) return null;
  const result = new Date(
    Number(dateMatch[1]),
    Number(dateMatch[2]) - 1,
    Number(dateMatch[3]),
    Number(timeMatch[1]),
    Number(timeMatch[2]),
    0,
    0,
  );
  return Number.isNaN(result.getTime()) ? null : result;
}

function utcStamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function rrule(task: Task): string | null {
  if (!task.isRecurring) return null;
  const rule: RecurrenceRule | undefined = task.recurrenceRule;
  if (rule?.overrides?.length) return null;
  const frequency = rule?.frequency ?? (
    task.recurrencePattern === 'specific_days' ? 'weekly' : task.recurrencePattern
  );
  if (!frequency || !['daily', 'weekly', 'monthly', 'yearly'].includes(frequency)) return null;
  const parts = [`FREQ=${frequency.toUpperCase()}`];
  const interval = rule?.interval;
  if (interval && interval > 1) parts.push(`INTERVAL=${Math.floor(interval)}`);
  const weekdays = rule?.weekdays ?? task.specificDays;
  if (frequency === 'weekly' && weekdays?.length) {
    parts.push(`BYDAY=${weekdays.filter(day => day >= 0 && day <= 6).map(day => WEEKDAYS[day]).join(',')}`);
  }
  if (frequency === 'monthly') {
    if (rule?.monthEnd) parts.push('BYMONTHDAY=-1');
    else if (rule?.monthDay ?? task.monthDay) parts.push(`BYMONTHDAY=${rule?.monthDay ?? task.monthDay}`);
  }
  if (rule?.count && rule.count > 0) parts.push(`COUNT=${Math.floor(rule.count)}`);
  else if (rule?.endDate) parts.push(`UNTIL=${rule.endDate.replace(/-/g, '')}T235959Z`);
  return parts.join(';');
}

/** Fold content lines to RFC 5545's 75-octet limit. */
export function foldIcsLine(line: string): string {
  const chunks: string[] = [];
  let chunk = '';
  let limit = 75;
  for (const character of line) {
    const candidate = chunk + character;
    if (new TextEncoder().encode(candidate).length > limit && chunk) {
      chunks.push(chunk);
      chunk = character;
      limit = 74;
    } else {
      chunk = candidate;
    }
  }
  chunks.push(chunk);
  return chunks.join('\r\n ');
}

function eventLines(task: Task, generatedAt: Date): string[] | null {
  const date = getScheduledDate(task);
  const time = normalizeLocalTime(task.scheduledTime);
  if (!date || !time) return null;
  const start = parseLocalDateTime(date, time);
  if (!start) return null;
  const end = new Date(start.getTime() + normalizeDurationMinutes(task.durationMinutes, 30) * 60_000);
  const recurrence = rrule(task);
  const uidId = task.id.replace(/[^a-zA-Z0-9._-]/g, '-');
  return [
    'BEGIN:VEVENT',
    `UID:${uidId}@assisy.app`,
    `DTSTAMP:${utcStamp(generatedAt)}`,
    `DTSTART:${utcStamp(start)}`,
    `DTEND:${utcStamp(end)}`,
    `SUMMARY:${escapeIcsText(task.title)}`,
    ...(plainText(task.description) ? [`DESCRIPTION:${escapeIcsText(plainText(task.description))}`] : []),
    `URL:${locationOrigin()}/calendar?task=${encodeURIComponent(task.id)}`,
    ...(recurrence ? [`RRULE:${recurrence}`] : []),
    'END:VEVENT',
  ];
}

function locationOrigin(): string {
  return typeof window === 'undefined' ? 'https://app-seven-lilac-81.vercel.app' : window.location.origin;
}

export function generateIcs(
  tasks: Task[],
  options: { generatedAt?: Date; calendarName?: string; timeZone?: string } = {},
): string {
  const generatedAt = options.generatedAt ?? new Date();
  const timeZone = options.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Assisy//Personal Calendar Export//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeIcsText(options.calendarName ?? 'Assisy')}`,
    `X-WR-TIMEZONE:${escapeIcsText(timeZone)}`,
  ];
  for (const task of tasks) {
    const event = eventLines(task, generatedAt);
    if (event) lines.push(...event);
  }
  lines.push('END:VCALENDAR');
  return `${lines.map(foldIcsLine).join('\r\n')}\r\n`;
}

export function downloadIcs(tasks: Task[], filename: string, calendarName?: string): boolean {
  const exportable = tasks.filter(task => getScheduledDate(task) && normalizeLocalTime(task.scheduledTime));
  if (exportable.length === 0) return false;
  const blob = new Blob([generateIcs(exportable, { calendarName })], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename.endsWith('.ics') ? filename : `${filename}.ics`;
  anchor.click();
  URL.revokeObjectURL(url);
  return true;
}
