/**
 * Deterministic checks for durable outbox coalescing and idempotent removal.
 * Uses the module's Node fallback; browser IndexedDB follows the same rules.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const appDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const outfile = join(mkdtempSync(join(tmpdir(), 'assisy-sync-')), 'outbox.mjs');
execFileSync(
  join(appDir, 'node_modules/.bin/esbuild'),
  [join(appDir, 'src/store/outbox.ts'), '--bundle', '--platform=node', '--format=esm', `--outfile=${outfile}`],
  { stdio: 'pipe' },
);

const { enqueueMutation, listMutations, removeMutation } =
  await import(pathToFileURL(outfile).href);

let pass = 0;
function check(name, condition) {
  if (condition) {
    pass++;
    console.log(`  ok   ${name}`);
    return;
  }
  console.error(`  FAIL ${name}`);
  process.exit(1);
}

console.log('\nOutbox is coalesced and retry-safe');
const first = await enqueueMutation('user-1', 'tasks', { tasks: [{ id: 'old' }] });
const latest = await enqueueMutation('user-1', 'tasks', { tasks: [{ id: 'latest' }] });
check('newer mutation replaces the same collection', (await listMutations('user-1')).length === 1);
check('latest payload is retained',
  (await listMutations('user-1'))[0].payload.tasks[0].id === 'latest');

await removeMutation(first.id, first.revision);
check('late acknowledgement cannot remove a newer edit',
  (await listMutations('user-1'))[0].revision === latest.revision);

await removeMutation(latest.id, latest.revision);
check('matching acknowledgement removes the mutation',
  (await listMutations('user-1')).length === 0);

const staleTabCopy = await enqueueMutation('user-1', 'tasks', { tasks: [{ id: 'stale-tab' }] });
await removeMutation(staleTabCopy.id, staleTabCopy.revision + 1);
check('a newer cross-tab acknowledgement discards stale in-memory fallback',
  (await listMutations('user-1')).length === 0);

await enqueueMutation('user-1', 'goals', { goals: [] });
await enqueueMutation('user-2', 'goals', { goals: [] });
check('user-scoped drains do not expose another account',
  (await listMutations('user-1')).every(mutation => mutation.userId === 'user-1'));

console.log(`\n${pass} passed, 0 failed\n`);
