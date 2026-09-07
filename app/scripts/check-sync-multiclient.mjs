/**
 * Deterministic, credential-free simulations of two clients sharing a cloud
 * snapshot. Production merge and outbox functions are bundled and imported;
 * this file contains scenarios, not replacement sync algorithms.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const appDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const tempDir = mkdtempSync(join(tmpdir(), 'assisy-multiclient-'));
const entry = join(tempDir, 'entry.ts');
const outfile = join(tempDir, 'sync.mjs');
writeFileSync(entry, `
  export { mergeEntities } from ${JSON.stringify(join(appDir, 'src/store/merge.ts'))};
  export { enqueueMutation, listMutations, removeMutation } from ${JSON.stringify(join(appDir, 'src/store/outbox.ts'))};
`);
execFileSync(
  join(appDir, 'node_modules/.bin/esbuild'),
  [entry, '--bundle', '--platform=node', '--format=esm', `--outfile=${outfile}`],
  { stdio: 'pipe' },
);

const { mergeEntities, enqueueMutation, listMutations, removeMutation } =
  await import(pathToFileURL(outfile).href);

let passed = 0;
function check(name, condition) {
  if (!condition) throw new Error(`FAIL: ${name}`);
  passed += 1;
  console.log(`  ok   ${name}`);
}
const at = minute => `2026-09-06T12:${String(minute).padStart(2, '0')}:00.000Z`;
const entity = (id, title, minute) => ({ id, title, updatedAt: at(minute) });
const merge = (local, cloud, tombstones = {}, dirty = true) =>
  mergeEntities(local, cloud, tombstones, dirty);

console.log('\nMulti-client convergence');
{
  const cloud = [];
  const a = [entity('task-a', 'A edit', 1)];
  const b = [entity('task-b', 'B edit', 2)];
  const afterA = merge(a, cloud);
  const afterB = merge(b, afterA);
  const convergedA = merge(afterA, afterB);
  check('concurrent different-entity edits survive', convergedA.length === 2);
  check('both clients converge after the next pull',
    JSON.stringify(convergedA) === JSON.stringify(merge(afterB, convergedA)));
}
{
  const stale = entity('same', 'older client edit', 3);
  const newer = entity('same', 'newer client edit', 4);
  check('same-entity newer edit wins', merge([stale], [newer])[0].title === newer.title);
}
{
  const staleCopy = entity('deleted', 'stale offline copy', 5);
  const tombstones = { deleted: { deletedAt: at(6) } };
  check('delete beats a stale copy', merge([staleCopy], [], tombstones).length === 0);
  const revived = entity('deleted', 'intentional later edit', 7);
  check('an edit newer than deletion revives the entity',
    merge([revived], [], tombstones)[0].title === revived.title);
}
{
  let offline = [entity('keep', 'created offline', 8)];
  offline = [entity('keep', 'edited offline', 9), entity('drop', 'temporary', 8)];
  offline = offline.filter(item => item.id !== 'drop');
  const tombstones = { drop: { deletedAt: at(10) } };
  const reconnected = merge(offline, [entity('remote', 'remote work', 9)], tombstones);
  check('offline create and edit survive reconnect',
    reconnected.some(item => item.id === 'keep' && item.title === 'edited offline'));
  check('offline delete stays deleted after reconnect',
    !reconnected.some(item => item.id === 'drop'));
  check('reconnect also preserves remote work', reconnected.some(item => item.id === 'remote'));
}
{
  const fetched = [entity('login', 'cloud before login', 11)];
  const loginTimeEdit = [entity('login', 'typed during login fetch', 12)];
  const initiallyMerged = merge(loginTimeEdit, fetched);
  const finalWindowEdit = entity('second', 'typed before apply', 13);
  const applied = merge([finalWindowEdit, ...loginTimeEdit], initiallyMerged);
  check('login-time edit is not overwritten', applied[0].title === 'typed during login fetch');
  check('fetch-to-apply window edit is merged too', applied.some(item => item.id === 'second'));
}

console.log('\nDurable outbox replay');
{
  const userA = 'simulation-account-a';
  const userB = 'simulation-account-b';
  const first = await enqueueMutation(userA, 'tasks', { tasks: [entity('a', 'first', 14)] });
  const latest = await enqueueMutation(userA, 'tasks', { tasks: [entity('a', 'latest', 15)] });
  await enqueueMutation(userB, 'tasks', { tasks: [entity('b', 'isolated', 15)] });
  check('account-scoped replay is isolated',
    (await listMutations(userA)).every(item => item.userId === userA));
  check('offline edits coalesce to the latest payload',
    (await listMutations(userA))[0].payload.tasks[0].title === 'latest');
  await removeMutation(first.id, first.revision);
  check('stale acknowledgement is idempotent',
    (await listMutations(userA))[0].revision === latest.revision);
  await removeMutation(latest.id, latest.revision);
  await removeMutation(latest.id, latest.revision);
  check('replayed acknowledgement remains harmless', (await listMutations(userA)).length === 0);
  for (const pending of await listMutations(userB)) {
    await removeMutation(pending.id, pending.revision);
  }
}

console.log(`\n${passed} passed, 0 failed\n`);
