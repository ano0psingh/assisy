import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const appDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const tempDir = mkdtempSync(join(tmpdir(), 'assisy-calendar-'));
const esbuild = join(appDir, 'node_modules/.bin/esbuild');

async function load(source, name) {
  const outfile = join(tempDir, `${name}.mjs`);
  execFileSync(esbuild, [join(appDir, source), '--bundle', '--platform=node', '--format=esm', `--outfile=${outfile}`]);
  return import(pathToFileURL(outfile).href);
}

const recurrence = await load('src/lib/recurrence.ts', 'recurrence');
const calendar = await load('src/lib/calendarScheduling.ts', 'calendar');
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

console.log('\nFlexible recurrence');
const dailyAcrossDst = { createdAt: new Date(2026, 2, 7, 12), recurrenceRule: { frequency: 'daily', startDate: '2026-03-07' } };
check('calendar-day recurrence crosses DST boundary', recurrence.isRecurrenceDate('2026-03-09', dailyAcrossDst), true);
check('interval daily', recurrence.isRecurrenceDate('2026-03-10', { ...dailyAcrossDst, recurrenceRule: { frequency: 'daily', interval: 2, startDate: '2026-03-07' } }), false);
check('weekly weekdays', recurrence.isRecurrenceDate('2026-09-09', { createdAt: new Date(2026, 8, 1), recurrenceRule: { frequency: 'weekly', weekdays: [1, 3], startDate: '2026-09-01' } }), true);
check('month end includes leap day', recurrence.isRecurrenceDate('2028-02-29', { createdAt: new Date(2028, 0, 31), recurrenceRule: { frequency: 'monthly', monthEnd: true, startDate: '2028-01-31' } }), true);
check('missing day is not silently clamped', recurrence.isRecurrenceDate('2026-02-28', { createdAt: new Date(2026, 0, 31), recurrenceRule: { frequency: 'monthly', monthDay: 31, startDate: '2026-01-31' } }), false);
check('count ends series', recurrence.isRecurrenceDate('2026-09-04', { createdAt: new Date(2026, 8, 1), recurrenceRule: { frequency: 'daily', count: 3, startDate: '2026-09-01' } }), false);
check('end date is inclusive', recurrence.isRecurrenceDate('2026-09-03', { createdAt: new Date(2026, 8, 1), recurrenceRule: { frequency: 'daily', endDate: '2026-09-03', startDate: '2026-09-01' } }), true);
const overridden = { createdAt: new Date(2026, 8, 1), recurrenceRule: { frequency: 'daily', startDate: '2026-09-01', overrides: [{ date: '2026-09-03', action: 'reschedule', rescheduledDate: '2026-09-05' }] } };
check('rescheduled source is removed', recurrence.isRecurrenceDate('2026-09-03', overridden), false);
check('rescheduled target is added', recurrence.isRecurrenceDate('2026-09-05', overridden), true);

console.log('\nCollision and free slots');
const blocks = [
  { id: 'a', title: 'A', scheduledDate: '2026-09-06', scheduledTime: '09:00', durationMinutes: 60 },
  { id: 'b', title: 'B', scheduledDate: '2026-09-06', scheduledTime: '10:00', durationMinutes: 30 },
];
check('edge-touching candidate is valid', calendar.validateSchedule({ id: 'c', scheduledDate: '2026-09-06', scheduledTime: '08:30', durationMinutes: 30 }, blocks).valid, true);
check('overlap reports exact block', calendar.validateSchedule({ id: 'c', scheduledDate: '2026-09-06', scheduledTime: '09:30', durationMinutes: 30 }, blocks).collisions.map(x => x.id), ['a']);
check('next slot skips occupied intervals', calendar.findNextFreeSlot(blocks, '2026-09-06', 30, 9 * 60, 12 * 60), 10 * 60 + 30);

console.log('\nOverlap lanes');
const lanes = calendar.layoutOverlapLanes([
  { id: 'a', scheduledTime: '09:00', durationMinutes: 60 },
  { id: 'b', scheduledTime: '09:30', durationMinutes: 60 },
  { id: 'c', scheduledTime: '10:30', durationMinutes: 30 },
]);
check('overlaps get deterministic side-by-side lanes', lanes, [
  { id: 'a', lane: 0, laneCount: 2, conflicted: true },
  { id: 'b', lane: 1, laneCount: 2, conflicted: true },
  { id: 'c', lane: 0, laneCount: 1, conflicted: false },
]);

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
