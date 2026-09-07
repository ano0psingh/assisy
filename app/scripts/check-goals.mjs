import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const appDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const tempDir = mkdtempSync(join(tmpdir(), 'assisy-goals-'));
const outfile = join(tempDir, 'goal-utils.mjs');
execFileSync(join(appDir, 'node_modules/.bin/esbuild'), [
  join(appDir, 'src/lib/goalUtils.ts'),
  '--bundle',
  '--platform=node',
  '--format=esm',
  `--outfile=${outfile}`,
], { stdio: 'pipe' });
const goals = await import(pathToFileURL(outfile).href);
const bulkOutfile = join(tempDir, 'bulk-update.mjs');
execFileSync(join(appDir, 'node_modules/.bin/esbuild'), [
  join(appDir, 'src/lib/bulkUpdate.ts'),
  '--bundle',
  '--platform=node',
  '--format=esm',
  `--outfile=${bulkOutfile}`,
], { stdio: 'pipe' });
const bulk = await import(pathToFileURL(bulkOutfile).href);

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

const base = {
  id: 'parent', title: 'Goal', category: 'Personal', status: 'Active',
  linkedTaskIds: [], progress: 0, createdAt: new Date('2026-09-01T10:00:00'),
  level: 1, totalXP: 0, currentLevelXP: 0, xpToNextLevel: 100,
};

console.log('\nBackward-compatible goal migration');
const migrated = goals.migrateGoalFields({ ...base, milestones: undefined });
check('new fields receive stable defaults', {
  priority: migrated.priority,
  nextAction: migrated.nextAction,
  targetDate: migrated.targetDate,
  health: migrated.healthCheckIns,
  milestones: migrated.milestones,
}, { priority: 'Medium', nextAction: undefined, targetDate: undefined, health: [], milestones: [] });
check('target dates reject UTC timestamps', goals.migrateGoalFields({
  ...base, milestones: [], targetDate: '2026-09-06T00:00:00Z',
}).targetDate, undefined);

console.log('\nMilestone ordering and progress');
const milestones = [
  { id: 'a', title: 'A', isCompleted: true, xpReward: 10, order: 0 },
  { id: 'b', title: 'B', isCompleted: false, xpReward: 10, order: 1 },
  { id: 'c', title: 'C', isCompleted: false, xpReward: 10, order: 2 },
];
check('explicit down reorder renumbers deterministically',
  goals.reorderMilestones(milestones, 'a', 'down').map(m => [m.id, m.order]),
  [['b', 0], ['a', 1], ['c', 2]]);
check('milestone progress is independent', goals.getMilestoneProgress({ milestones }), 33);

console.log('\nHealth history');
const history = goals.addGoalHealthCheckIn([], 'at-risk', '  Needs focus  ', new Date('2026-09-06T09:00:00Z'), 'check-1');
check('check-in appends timestamped normalized entry', {
  id: history[0].id,
  status: history[0].status,
  note: history[0].note,
  createdAt: history[0].createdAt.toISOString(),
}, { id: 'check-1', status: 'at-risk', note: 'Needs focus', createdAt: '2026-09-06T09:00:00.000Z' });

console.log('\nHierarchy restoration');
const child = { ...base, id: 'child', parentGoalId: 'parent', subGoalIds: [], milestones: [], priority: 'Medium', healthCheckIns: [] };
const restored = goals.restoreGoalHierarchy([], [{ ...migrated, subGoalIds: [] }, child]);
check('parent relationship is rebuilt', restored.find(g => g.id === 'parent').subGoalIds, ['child']);
check('child keeps its parent reference', restored.find(g => g.id === 'child').parentGoalId, 'parent');
const linkedTasks = [{ id: 'task-1', goalId: 'parent' }];
const taskPatches = bulk.collectBulkPatches(linkedTasks, ['task-1'], { goalId: undefined });
const unlinkedTasks = bulk.applyBulkUpdate(linkedTasks, ['task-1'], { goalId: undefined });
check('linked task goalId is restored from undo patch',
  bulk.revertBulkUpdate(unlinkedTasks, taskPatches)[0].goalId,
  'parent');

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
