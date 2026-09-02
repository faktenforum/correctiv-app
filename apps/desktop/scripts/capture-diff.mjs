/**
 * A SECOND ORACLE for the route sweep, because the first one reads log lines.
 *
 * WHY THIS EXISTS, and it is a specific failure rather than a general wish. A change to
 * the GTK host was measured here as "the criticals went from 296 to 0" and reported as a
 * confirmation. It was not one: the same change also emitted two extra `notify::visible`
 * signals per removed page, which the tab router reads as *the user clicked a tab*. That
 * is a behavioural regression that produces NO log line, so `route-sweep.mjs` — which
 * opens a route and reads the log — would have reported it as green. The sweep is honest
 * about this in its own header; what it lacked was something else to ask.
 *
 * WHAT THIS ANSWERS. The sweep already writes one PNG per route. Identical pixels
 * through the same encoder give an identical file, so a byte-for-byte match is proof
 * that nothing about that screen changed, and a difference is a place to look.
 *
 * WHAT IT DOES NOT ANSWER, stated because the asymmetry is the whole point: a difference
 * is NOT a regression. The screens load feeds, so a capture taken a second later can
 * differ for reasons that have nothing to do with the change under test. Read a match as
 * a fact and a mismatch as a question.
 *
 * CALIBRATED BEFORE USE, because "no change across 25 routes" is worthless from a
 * procedure that cannot see one. Two measurements on `/einstellungen`, which renders no
 * network content:
 *
 *   the same build captured twice          58961 -> 58961 bytes, byte-identical
 *   ONE character removed from one label   58961 -> 58929 bytes, 32 bytes, 0.05%
 *
 * So the floor is a single character in a single label, and the noise floor on a static
 * screen is zero. Neither number transfers to a feed-backed screen — those differ
 * between runs on their own, and for them a mismatch says nothing at all.
 *
 *   node scripts/capture-diff.mjs --save before     # after a sweep, keep the captures
 *   …make the change, run the sweep again…
 *   node scripts/capture-diff.mjs --against before  # what moved
 */

import { copyFileSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const APP = resolve(HERE, '..');
const SWEEP = join(APP, 'dist', 'sweep');
const KEPT = join(APP, 'dist', 'captures');

/** `--save <name>` / `--against <name>`, whichever was given. */
function mode() {
  const save = process.argv.indexOf('--save');
  if (save !== -1) return { verb: 'save', name: process.argv[save + 1] };
  const against = process.argv.indexOf('--against');
  if (against !== -1) return { verb: 'against', name: process.argv[against + 1] };
  return null;
}

function captures(dir) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return null;
  }
  return new Map(
    entries
      .filter((entry) => entry.endsWith('.png'))
      .map((entry) => [entry, statSync(join(dir, entry)).size]),
  );
}

const chosen = mode();
if (chosen === null || chosen.name === undefined) {
  console.error('usage: capture-diff.mjs --save <name> | --against <name>');
  process.exit(2);
}

const current = captures(SWEEP);
if (current === null || current.size === 0) {
  console.error(
    `capture-diff: no captures in ${SWEEP}. Run \`npm run route-sweep\` first — it writes one PNG per route.`,
  );
  process.exit(2);
}

const target = join(KEPT, chosen.name);

if (chosen.verb === 'save') {
  rmSync(target, { recursive: true, force: true });
  mkdirSync(target, { recursive: true });
  for (const name of current.keys()) copyFileSync(join(SWEEP, name), join(target, name));
  console.log(`capture-diff: kept ${current.size} capture(s) as "${chosen.name}"`);
  process.exit(0);
}

const baseline = captures(target);
if (baseline === null) {
  console.error(
    `capture-diff: no baseline "${chosen.name}" — run \`--save ${chosen.name}\` first.`,
  );
  process.exit(2);
}

const names = [...new Set([...baseline.keys(), ...current.keys()])].sort();
let identical = 0;
const moved = [];
for (const name of names) {
  const before = baseline.get(name);
  const after = current.get(name);
  if (before === undefined) {
    moved.push(`NEW      ${name}  (${after} bytes)`);
    continue;
  }
  if (after === undefined) {
    moved.push(`MISSING  ${name}  (was ${before} bytes) — the route stopped producing a capture`);
    continue;
  }
  if (before === after) {
    // Same size is not the same picture. Compare the bytes, since a capture is a few
    // dozen kilobytes and a false "identical" is the one answer this must never give.
    const same = readFileSync(join(target, name)).equals(readFileSync(join(SWEEP, name)));
    if (same) {
      identical++;
      continue;
    }
    moved.push(`CHANGED  ${name}  (same size, different bytes)`);
    continue;
  }
  const delta = after - before;
  const percent = ((delta / before) * 100).toFixed(1);
  moved.push(`CHANGED  ${name}  ${before} -> ${after} bytes (${delta > 0 ? '+' : ''}${percent}%)`);
}

for (const line of moved) console.log(line);
console.log(
  `\ncapture-diff: ${identical} of ${names.length} capture(s) byte-identical to "${chosen.name}".`,
);
if (moved.length > 0) {
  console.log(
    'A match proves that screen did not change. A mismatch is a place to LOOK — these\n' +
      'screens load feeds, so a capture taken a second later differs for its own reasons.',
  );
}
process.exit(0);
