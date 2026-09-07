import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const appDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const tempDir = mkdtempSync(join(tmpdir(), 'assisy-reminders-'));
const outfile = join(tempDir, 'reminders.mjs');
execFileSync(join(appDir, 'node_modules/.bin/esbuild'), [
  join(appDir, 'server/reminders.ts'),
  '--bundle',
  '--platform=node',
  '--format=esm',
  `--outfile=${outfile}`,
]);
const reminders = await import(pathToFileURL(outfile).href);

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

console.log('\nTimezone conversion');
check(
  'Kolkata local time converts to UTC',
  reminders.zonedDateTimeToUtc('2026-09-06', '09:00', 'Asia/Kolkata')?.toISOString(),
  '2026-09-06T03:30:00.000Z',
);
check(
  'New York conversion observes DST',
  reminders.zonedDateTimeToUtc('2026-07-06', '09:00', 'America/New_York')?.toISOString(),
  '2026-07-06T13:00:00.000Z',
);
check(
  'nonexistent DST wall time is rejected',
  reminders.zonedDateTimeToUtc('2026-03-08', '02:30', 'America/New_York'),
  null,
);

console.log('\nSelection and deduplication keys');
const task = {
  id: 'task-1',
  title: 'Deep work',
  status: 'Pending',
  scheduledDate: '2026-09-06',
  scheduledTime: '09:00',
  scheduledReminderOffsets: [10, 10],
  dueDate: '2026-09-06T00:00:00.000Z',
  dueTime: '10:00',
  dueReminderOffsets: [60],
};
const now = new Date('2026-09-06T03:20:00.000Z');
const due = reminders.collectDueTaskReminders([task], [], 'Asia/Kolkata', now);
check('only currently due offset selected', due.map(event => event.offsetMinutes), [10]);
check('duplicate offsets collapse to one event', due.length, 1);
check(
  'event key is stable across retries',
  reminders.collectDueTaskReminders([task], [], 'Asia/Kolkata', now)[0].key,
  due[0].key,
);
check(
  'future reminders are never sent early',
  reminders.collectDueTaskReminders([task], [], 'Asia/Kolkata', new Date('2026-09-06T03:19:59.000Z')).length,
  0,
);
check(
  'missed events expire after retry window',
  reminders.collectDueTaskReminders([task], [], 'Asia/Kolkata', new Date('2026-09-06T03:47:00.000Z')).length,
  0,
);
check(
  'project deadline reminder is included',
  reminders.collectDueTaskReminders([], [{
    id: 'project-1',
    title: 'Ship',
    status: 'In Progress',
    deadline: '2026-09-06',
    deadlineTime: '09:30',
    deadlineReminderOffsets: [0],
  }], 'Asia/Kolkata', new Date('2026-09-06T04:00:00.000Z')).length,
  1,
);

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
