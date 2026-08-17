// Fails if any `dark:` utility in the source generates no CSS.
//
// Dark mode lives in the stylesheet as `light-class dark:dark-class` pairs, which
// relies on the dark class overriding the light one. If the dark class is not a
// class Tailwind actually generates, nothing overrides and the light colour shows
// through in dark mode. That is how goal cards ended up white with white titles:
// Tailwind's opacity scale moves in steps of five, so `bg-violet-500/8` was a
// dead class. It was invisible before the pairs existed, because a dead class in
// dark mode simply meant no background.
//
// Run against a fresh build: npm run build && npm run check:classes
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const APP = dirname(dirname(fileURLToPath(import.meta.url)));
const DIST = join(APP, 'dist', 'assets');
const SRC = join(APP, 'src');

if (!existsSync(DIST)) {
  console.error('No dist/assets. Run `npm run build` first.');
  process.exit(1);
}

const css = readdirSync(DIST)
  .filter(f => f.endsWith('.css'))
  .map(f => readFileSync(join(DIST, f), 'utf8'))
  .join('\n');

/** Utility tokens, including arbitrary values like dark:bg-[#12121a] and rgba(...). */
const TOKEN = /dark:[A-Za-z0-9_:./%#(),[\]-]*[A-Za-z0-9_%)\]]/g;

const tokens = new Set();
const walk = dir => {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.tsx?$/.test(e.name)) {
      for (const m of readFileSync(p, 'utf8').matchAll(TOKEN)) tokens.add(m[0]);
    }
  }
};
walk(SRC);

/** Tailwind escapes these characters when it writes the selector. */
const escapeClass = t => t.replace(/[:/.[\]%,()#]/g, c => '\\' + c);

/** True if the escaped name appears in the CSS as a complete class, not a prefix. */
const isGenerated = token => {
  const sel = escapeClass(token);
  for (let i = css.indexOf(sel); i !== -1; i = css.indexOf(sel, i + 1)) {
    const next = css[i + sel.length];
    // A following class character means we matched a prefix, e.g. /8 inside /80.
    if (next === undefined || !/[A-Za-z0-9\\_-]/.test(next)) return true;
  }
  return false;
};

const dead = [...tokens].filter(t => !isGenerated(t)).sort();

if (dead.length === 0) {
  console.log(`check:classes — ${tokens.size} dark: utilities, all generated`);
  process.exit(0);
}

console.error(`check:classes — ${dead.length} of ${tokens.size} dark: utilities generate no CSS.`);
console.error('In dark mode the light class they pair with will show through instead.\n');
for (const token of dead) {
  console.error(`  ${token}`);
  try {
    const hits = execFileSync('rg', ['-n', '--no-heading', '-F', token, SRC], { encoding: 'utf8' });
    for (const line of hits.trim().split('\n').slice(0, 3)) {
      console.error('      ' + line.replace(SRC + '/', '').trim().slice(0, 120));
    }
  } catch { /* rg exits non-zero when the token has since moved */ }
}
process.exit(1);
