/**
 * Regression checks for the local-time scheduling model.
 *
 * Deliberately dependency-free: compile the pure TypeScript helpers with the
 * esbuild already installed by Vite, then exercise the same code the UI uses.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const appDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const tempDir = mkdtempSync(join(tmpdir(), 'assisy-scheduling-'));
const esbuild = join(appDir, 'node_modules/.bin/esbuild');

async function compileAndImport(source, name) {
  const outfile = join(tempDir, `${name}.mjs`);
  execFileSync(esbuild, [
    join(appDir, source),
    '--bundle',
    '--platform=node',
    '--format=esm',
    `--outfile=${outfile}`,
  ], { stdio: 'pipe' });
  return import(pathToFileURL(outfile).href);
}

const dates = await compileAndImport('src/lib/dateUtils.ts', 'date-utils');
const ids = await compileAndImport('src/lib/unifiedTaskIds.ts', 'unified-task-ids');
const merge = await compileAndImport('src/lib/mergeProjectTasks.ts', 'merge-project-tasks');

let passed = 0;
let failed = 0;

function check(name, actual, expected) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) {
    passed++;
    console.log(`  ok   ${name}`);
  } else {
    failed++;
    console.error(`  FAIL ${name}\n       got      ${a}\n       expected ${e}`);
  }
}

console.log('\nLocal dates must never round-trip through UTC');
check('valid leap day parses locally', dates.getLocalDateString(dates.parseLocalDate('2028-02-29')), '2028-02-29');
check('impossible date is rejected', dates.parseLocalDate('2026-02-30'), null);
check('UTC-looking input is rejected', dates.normalizeLocalDateString('2026-08-21T00:00:00Z'), undefined);
check('adding a local day crosses month boundary', dates.getLocalDateString(dates.addLocalDays(dates.parseLocalDate('2026-08-31'), 1)), '2026-09-01');

console.log('\nNew schedules coexist with legacy focusedDate data');
check('new scheduledDate wins', dates.getScheduledDate({
  scheduledDate: '2026-09-06',
  focusedDate: '2026-09-05',
}), '2026-09-06');
check('legacy focusedDate remains visible', dates.getScheduledDate({
  focusedDate: '2026-09-05',
}), '2026-09-05');
check('planned-day lookup promotes a future plan on its day', dates.isTaskScheduledOn({
  scheduledDate: '2026-09-07',
}, '2026-09-07'), true);

console.log('\nTimed blocks and collision boundaries');
check('start minute', dates.getScheduledStartMinute({ scheduledTime: '09:15' }), 555);
check('end minute applies duration', dates.getScheduledEndMinute({
  scheduledTime: '09:15',
  durationMinutes: 45,
}), 600);
check('duration is clamped to one day', dates.normalizeDurationMinutes(2000), 1440);
check('overlapping blocks collide', dates.scheduledTasksOverlap(
  { scheduledDate: '2026-09-06', scheduledTime: '09:00', durationMinutes: 60 },
  { scheduledDate: '2026-09-06', scheduledTime: '09:30', durationMinutes: 30 },
), true);
check('touching block edges do not collide', dates.scheduledTasksOverlap(
  { scheduledDate: '2026-09-06', scheduledTime: '09:00', durationMinutes: 30 },
  { scheduledDate: '2026-09-06', scheduledTime: '09:30', durationMinutes: 30 },
), false);
check('flexible tasks do not collide with timed blocks', dates.scheduledTasksOverlap(
  { scheduledDate: '2026-09-06' },
  { scheduledDate: '2026-09-06', scheduledTime: '09:30', durationMinutes: 30 },
), false);

console.log('\nRecurring projections respect skips and pauses');
check('daily recurrence projects', dates.isRecurrenceDate('2026-09-06', {
  recurrencePattern: 'daily',
}), true);
check('skipped occurrence is hidden', dates.isRecurrenceDate('2026-09-06', {
  recurrencePattern: 'daily',
  skippedDates: ['2026-09-06'],
}), false);
check('paused recurrence is hidden through paused date', dates.isRecurrenceDate('2026-09-06', {
  recurrencePattern: 'daily',
  pausedUntil: '2026-09-06',
}), false);
check('monthly recurrence projects on month day', dates.isRecurrenceDate('2026-09-21', {
  recurrencePattern: 'monthly',
  monthDay: 21,
}), true);

console.log('\nUnified project-task IDs and read adapter stay lossless');
check('project ID is prefixed once', ids.toUnifiedProjectTaskId('abc'), 'pt-abc');
check('already-prefixed ID is stable', ids.toUnifiedProjectTaskId('pt-abc'), 'pt-abc');
check('owner ID is recovered', ids.getProjectTaskId('pt-abc'), 'abc');

const projectTask = {
  id: 'abc',
  title: 'Prepare release',
  description: '',
  status: 'In Progress',
  projectId: 'project-1',
  subProjectId: 'phase-1',
  subTaskIds: [],
  tags: [],
  priority: 'High',
  effort: 'Medium',
  createdAt: new Date('2026-09-01T10:00:00'),
  updatedAt: new Date('2026-09-01T10:00:00'),
  inbox: false,
  scheduledDate: '2026-09-06',
  scheduledTime: '10:30',
  durationMinutes: 45,
  focusedDate: '2026-09-06',
};
const adapted = merge.projectTasksToTasks(
  [{ id: 'phase-1', projectId: 'project-1' }],
  [{ id: 'project-1', title: 'Launch' }],
  () => [projectTask],
)[0];
check('adapter carries schedule fields', {
  id: adapted.id,
  inbox: adapted.inbox,
  date: adapted.scheduledDate,
  time: adapted.scheduledTime,
  duration: adapted.durationMinutes,
}, {
  id: 'pt-abc',
  inbox: false,
  date: '2026-09-06',
  time: '10:30',
  duration: 45,
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
