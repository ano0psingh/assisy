import assert from 'node:assert/strict';
import { readdir, readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveAIKeys } from '../server/ai-config.ts';
import { parseAIJson } from '../src/lib/ai.ts';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));

async function filesUnder(directory, extensions) {
  const output = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) output.push(...await filesUnder(path, extensions));
    else if (extensions.some(extension => entry.name.endsWith(extension))) output.push(path);
  }
  return output;
}

async function assertNoMarkers(directory, extensions, markers) {
  for (const path of await filesUnder(directory, extensions)) {
    const contents = await readFile(path, 'utf8');
    for (const marker of markers) {
      assert.equal(
        contents.includes(marker),
        false,
        `${path} contains browser-forbidden AI marker: ${marker}`,
      );
    }
  }
}

const forbiddenSourceMarkers = [
  ['VITE', 'GROQ', 'API', 'KEY'].join('_'),
  ['VITE', 'GEMINI', 'API', 'KEY'].join('_'),
  'api.groq.com',
  '@google/genai',
];
await assertNoMarkers(
  resolve(root, 'src'),
  ['.ts', '.tsx', '.js', '.jsx'],
  forbiddenSourceMarkers,
);

const dist = resolve(root, 'dist');
if (await stat(dist).then(() => true, () => false)) {
  await assertNoMarkers(dist, ['.js', '.html'], forbiddenSourceMarkers);
}

assert.deepEqual(
  resolveAIKeys({
    GROQ_API_KEY: 'preferred-groq',
    VITE_GROQ_API_KEY: 'legacy-groq',
    GEMINI_API_KEY: 'preferred-gemini',
    VITE_GEMINI_API_KEY: 'legacy-gemini',
  }),
  { groq: 'preferred-groq', gemini: 'preferred-gemini' },
);
assert.deepEqual(
  resolveAIKeys({
    VITE_GROQ_API_KEY: 'legacy-groq',
    VITE_GEMINI_API_KEY: 'legacy-gemini',
  }),
  { groq: 'legacy-groq', gemini: 'legacy-gemini' },
);
assert.deepEqual(resolveAIKeys({ GROQ_API_KEY: '  ', GEMINI_API_KEY: '' }), {
  groq: undefined,
  gemini: undefined,
});

assert.deepEqual(parseAIJson('{"ok":true}'), { ok: true });
assert.deepEqual(parseAIJson('```json\n{"fallback":true}\n```'), { fallback: true });

console.log('AI boundary checks passed');
