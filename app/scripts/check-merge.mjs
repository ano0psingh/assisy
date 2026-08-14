/**
 * Checks the local/cloud merge rules in src/store/merge.ts.
 *
 * These rules decide which copy of your data survives a sync, so a mistake here
 * loses work silently. Run with `npm run check:merge`.
 *
 * Deliberately dependency-free: it compiles the module with the esbuild that
 * already ships with Vite, so it needs no test framework.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const appDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const outfile = join(mkdtempSync(join(tmpdir(), 'assisy-merge-')), 'merge.mjs');
execFileSync(
  join(appDir, 'node_modules/.bin/esbuild'),
  [join(appDir, 'src/store/merge.ts'), '--format=esm', `--outfile=${outfile}`],
  { stdio: 'pipe' },
);
const { mergeEntities, mergeLogMaps, mergeGamification } = await import(pathToFileURL(outfile).href);

let pass = 0, fail = 0;
function check(name, actual, expected) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) { pass++; console.log(`  ok   ${name}`); }
  else { fail++; console.log(`  FAIL ${name}\n       got      ${a}\n       expected ${e}`); }
}
const ids = list => list.map(x => x.id).sort();

console.log('\nThe bug that caused data loss: local has newer work, cloud is stale');
check('local-only entity survives a merge with a populated cloud',
  ids(mergeEntities([{ id: 'a' }, { id: 'new-offline-task' }], [{ id: 'a' }])),
  ['a', 'new-offline-task']);

check('cloud-only entity from another device survives',
  ids(mergeEntities([{ id: 'a' }], [{ id: 'a' }, { id: 'from-phone' }])),
  ['a', 'from-phone']);

console.log('\nConflict on the same entity');
check('newer updatedAt wins',
  mergeEntities(
    [{ id: 'a', title: 'local', updatedAt: '2026-08-14T10:00:00Z' }],
    [{ id: 'a', title: 'cloud', updatedAt: '2026-08-13T10:00:00Z' }])[0].title,
  'local');
check('older updatedAt loses',
  mergeEntities(
    [{ id: 'a', title: 'local', updatedAt: '2026-08-12T10:00:00Z' }],
    [{ id: 'a', title: 'cloud', updatedAt: '2026-08-13T10:00:00Z' }])[0].title,
  'cloud');
check('a stamped copy beats an unstamped legacy copy',
  mergeEntities(
    [{ id: 'a', title: 'local', updatedAt: '2026-08-12T10:00:00Z' }],
    [{ id: 'a', title: 'cloud' }])[0].title,
  'local');
check('with no timestamps at all, dirty local wins',
  mergeEntities([{ id: 'a', title: 'local' }], [{ id: 'a', title: 'cloud' }], {}, true)[0].title,
  'local');
check('with no timestamps and a clean local, cloud wins',
  mergeEntities([{ id: 'a', title: 'local' }], [{ id: 'a', title: 'cloud' }], {}, false)[0].title,
  'cloud');
check('Date objects compare correctly against ISO strings',
  mergeEntities(
    [{ id: 'a', title: 'local', updatedAt: new Date('2026-08-14T10:00:00Z') }],
    [{ id: 'a', title: 'cloud', updatedAt: '2026-08-13T10:00:00Z' }])[0].title,
  'local');

console.log('\nDeletions must not come back');
check('a deleted entity is not resurrected by the cloud copy',
  ids(mergeEntities([], [{ id: 'gone', updatedAt: '2026-08-13T00:00:00Z' }],
    { gone: { deletedAt: '2026-08-14T00:00:00Z' } })),
  []);
check('an edit made after the deletion wins over the deletion',
  ids(mergeEntities([], [{ id: 'gone', updatedAt: '2026-08-15T00:00:00Z' }],
    { gone: { deletedAt: '2026-08-14T00:00:00Z' } })),
  ['gone']);

console.log('\nHabit logs (a lost day breaks a streak)');
check('logged days from both sides are unioned',
  mergeLogMaps({ h1: [{ date: '2026-08-14', value: 1 }] }, { h1: [{ date: '2026-08-13', value: 1 }] }).h1
    .map(l => l.date),
  ['2026-08-13', '2026-08-14']);
check('a habit only present locally survives',
  Object.keys(mergeLogMaps({ h2: [{ date: '2026-08-14' }] }, { h1: [{ date: '2026-08-13' }] })).sort(),
  ['h1', 'h2']);
check('same day, dirty local value wins',
  mergeLogMaps({ h1: [{ date: '2026-08-14', value: 5 }] }, { h1: [{ date: '2026-08-14', value: 2 }] }, true)
    .h1[0].value,
  5);

console.log('\nGamification (the old guard discarded a whole side)');
const merged = mergeGamification(
  { skillTrees: [{ id: 'health', currentXP: 500 }], achievements: [{ id: 'a1', isUnlocked: true }],
    userStats: { totalXPEarned: 900, tasksCompleted: 40 } },
  { skillTrees: [{ id: 'health', currentXP: 300 }, { id: 'learning', currentXP: 100 }],
    achievements: [{ id: 'a1', isUnlocked: false }, { id: 'a2', isUnlocked: true }],
    userStats: { totalXPEarned: 1000, tasksCompleted: 12 } });
check('furthest XP per skill is kept', merged.skillTrees.find(s => s.id === 'health').currentXP, 500);
check('a skill only in the cloud is kept', merged.skillTrees.find(s => s.id === 'learning').currentXP, 100);
check('an achievement unlocked on either side stays unlocked',
  merged.achievements.filter(a => a.isUnlocked).map(a => a.id).sort(), ['a1', 'a2']);
check('each lifetime counter takes its own maximum',
  [merged.userStats.totalXPEarned, merged.userStats.tasksCompleted], [1000, 40]);

console.log('\nEdge cases');
check('empty cloud does not wipe local', ids(mergeEntities([{ id: 'a' }], [])), ['a']);
check('malformed entries without an id are dropped',
  ids(mergeEntities([{ id: 'a' }, {}, null], [])), ['a']);
check('undefined gamification sides do not throw',
  mergeGamification(undefined, undefined),
  { skillTrees: [], achievements: [], userStats: {} });

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);
