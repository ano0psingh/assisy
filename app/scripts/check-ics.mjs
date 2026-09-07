import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

process.env.TZ = 'America/New_York';
const appDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const tempDir = mkdtempSync(join(tmpdir(), 'assisy-ics-'));
const outfile = join(tempDir, 'ics.mjs');
execFileSync(join(appDir, 'node_modules/.bin/esbuild'), [
  join(appDir, 'src/lib/ics.ts'),
  '--bundle',
  '--platform=node',
  '--format=esm',
  `--outfile=${outfile}`,
]);
const ics = await import(pathToFileURL(outfile).href);

let passed = 0;
let failed = 0;
function check(name, actual, expected) {
  if (JSON.stringify(actual) === JSON.stringify(expected)) {
    passed++;
    console.log(`  ok   ${name}`);
  } else {
    failed++;
    console.error(`  FAIL ${name}: got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`);
  }
}

const baseTask = {
  id: 'task-1',
  title: 'Plan, build; ship \\ repeat',
  description: '<p>First line</p><p>Second, line</p>',
  category: 'Professional',
  priority: 'High',
  effort: 'Low',
  status: 'Pending',
  isRecurring: false,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  scheduledDate: '2026-09-06',
  scheduledTime: '09:30',
  durationMinutes: 75,
  xpValue: 0,
};
const calendar = ics.generateIcs([baseTask], {
  generatedAt: new Date('2026-09-01T12:00:00Z'),
  timeZone: 'America/New_York',
});

console.log('\nICS event');
check('uses CRLF and ends with CRLF', calendar.endsWith('END:VCALENDAR\r\n'), true);
check('local start is converted to UTC', calendar.includes('DTSTART:20260906T133000Z'), true);
check('duration produces DTEND', calendar.includes('DTEND:20260906T144500Z'), true);
check('text punctuation is escaped', calendar.includes('SUMMARY:Plan\\, build\\; ship \\\\ repeat'), true);
check('HTML description becomes escaped text', calendar.includes('DESCRIPTION:First line\\nSecond\\, line'), true);
check('stable standards-shaped UID', calendar.includes('UID:task-1@assisy.app'), true);

console.log('\nRecurrence');
const recurring = ics.generateIcs([{
  ...baseTask,
  id: 'weekly',
  isRecurring: true,
  recurrenceRule: {
    frequency: 'weekly',
    interval: 2,
    weekdays: [1, 3],
    count: 8,
  },
}], { generatedAt: new Date('2026-09-01T12:00:00Z') });
check('representable recurrence emits RRULE', recurring.includes('RRULE:FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,WE;COUNT=8'), true);
const overridden = ics.generateIcs([{
  ...baseTask,
  isRecurring: true,
  recurrenceRule: {
    frequency: 'daily',
    overrides: [{ date: '2026-09-07', action: 'skip' }],
  },
}], { generatedAt: new Date('2026-09-01T12:00:00Z') });
check('unrepresentable overrides omit RRULE', overridden.includes('RRULE:'), false);

console.log('\nLine folding');
const folded = ics.foldIcsLine(`SUMMARY:${'é'.repeat(60)}`);
check('folds long UTF-8 lines', folded.includes('\r\n '), true);
check(
  'every folded physical line is at most 75 octets',
  folded.split('\r\n').every(line => new TextEncoder().encode(line).length <= 75),
  true,
);

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
