// Lift the recurring parts of the board into a page of Figma components.
//
// The parts are not invented here. Each one is CUT FROM the board by name, so a
// component is by construction the thing the screens already show — and its name is
// the name of the file it comes from in `apps/mobile/src/components`, so a designer
// moving a `NavCard` and a developer opening `profile/NavCard.tsx` are talking about
// the same object.
//
//   node tools/figma-plugin/extract-components.mjs
//
// Re-run after the screens change and the kit follows. It only ever reads the spec's
// screens and rewrites the `Bausteine` page; the screens themselves are untouched.

import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SPEC = join(HERE, 'spec.json');
const PAGE = 'Bausteine';

/**
 * What to lift, and where to find one.
 *
 * `from` is matched against a node's name as a prefix, and the FIRST match on the
 * board wins. Where several variants exist — a filled button and an outlined one —
 * each gets its own entry, because Figma variants would need a component set and
 * that is a bigger step than this one.
 */
const WANTED = [
  ['ui/ScreenHeader', 'ScreenHeader'],
  ['ui/Button, gefüllt', 'Button, Mitgliedschaft erweitern'],
  ['ui/Button, umrandet', 'Button, Erneut prüfen'],
  ['ui/Badge, Club', 'Badge, CLUB'],
  ['ui/Card', 'Card, Stufe'],
  ['profile/ClubCard', 'ClubCard'],
  ['profile/NavCard', 'NavCard,'],
  ['profile/SettingRow', 'SettingRow,'],
  ['feed/ArticleRow', 'ArticleRow'],
  ['participate/CalloutCard', 'CalloutCard,'],
  ['participate/ClaimRow', 'ClaimRow'],
  ['media/LiveBanner', 'LiveBanner'],
  ['media/SeriesTile', 'Cover'],
  ['discover/ProjectRow', 'ProjectRow'],
  ['discover/SearchEntry', 'SearchEntry'],
  ['player/MiniPlayer', 'MiniPlayer'],
  ['navigation/TabBar', 'Tab bar'],
];

const spec = JSON.parse(await readFile(SPEC, 'utf8'));

function find(nodes, prefix) {
  for (const node of nodes) {
    if (typeof node !== 'object' || node === null) continue;
    const name = node.name || '';
    if (name.startsWith(prefix)) return node;
    const hit = find(node.children || [], prefix);
    if (hit !== null) return hit;
  }
  return null;
}

/** A copy with the parent's layout stripped: a component stands on its own. */
function detach(node) {
  const copy = JSON.parse(JSON.stringify(node));
  delete copy.x;
  delete copy.y;
  // 'fill' width is meaningless outside the column it came from.
  if (copy.w === 'fill') copy.w = 320;
  return copy;
}

const columns = 4;
const cellW = 380;
const cellH = 220;

const screens = [];
const missing = [];
let placed = 0;

for (const [name, from] of WANTED) {
  const found = find(spec.screens || [], from);
  if (found === null) {
    missing.push(`${name} (kein "${from}" auf dem Board)`);
    continue;
  }
  const body = detach(found);
  body.name = 'Inhalt';
  screens.push({
    t: 'component',
    name,
    x: (placed % columns) * cellW,
    y: Math.floor(placed / columns) * cellH,
    dir: 'V',
    w: 'hug',
    pad: [16, 16, 16, 16],
    fill: '@color-grey-100',
    children: [body],
  });
  placed++;
}

spec.pages = (spec.pages || []).filter((p) => p.name !== PAGE);
spec.pages.push({
  name: PAGE,
  mode: 'replica',
  owned: screens.map((s) => s.name),
  screens,
});

await writeFile(SPEC, `${JSON.stringify(spec, null, 2)}\n`);

console.log(`${placed} components on the ${PAGE} page`);
for (const m of missing) console.log(`  skipped: ${m}`);
