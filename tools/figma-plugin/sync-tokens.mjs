// Mirror the app's design tokens into the board description.
//
// Reads packages/design-tokens/theme.css — the generated file the app itself uses —
// and writes the values into `spec.json` under `tokens`. The plugin turns those into
// Figma variables with a Hell and a Dunkel mode and BINDS the replica's fills to
// them, so changing a value in Figma repaints every screen that uses it.
//
// Figma is therefore a place to try a value, never the place a value is decided.
// Run this after `npm run tokens`, and the board follows the app.
//
//   node tools/figma-plugin/sync-tokens.mjs

import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const THEME = join(HERE, '../../packages/design-tokens/theme.css');
const SPEC = join(HERE, 'spec.json');

/**
 * Which of the board's colours is which token.
 *
 * Deliberately not exhaustive, and it names the DOMINANT role for each hex, because a
 * hex on its own does not say whether it is a surface, a border or a text colour. The
 * semantic tier does, so a re-transcription may need a hand afterwards: white is
 * `canvas` here, but white TEXT on a brand surface is `always-light`.
 *
 * A hex earns an entry only where the mapping is unambiguous, and only where the APP
 * names it. What stays literal is what the app has no name for either: the greys the
 * board writes its own placeholder LABELS in, where the app draws an icon instead; the
 * lavender behind an active tab, which is Android's and not ours; the video stage's
 * near-black and YouTube's red. Pretending those are tokens would put a name on a
 * decision nobody made.
 */
const AS_TOKEN = {
  '#ff5064': 'color-accent',
  // The brand red as it was measured off a screenshot, one notch off the real value.
  // Five tab-bar icons carried it, close enough that nobody saw it and far enough that
  // no token work would ever have caught it: it never pretended to be a token.
  '#f9545f': 'color-accent',
  '#fde162': 'color-accent-alternative',
  '#ffffff': 'color-canvas',
  '#f4f4f6': 'color-surface',
  '#f5f5f6': 'color-surface',
  '#e2e2e5': 'color-stroke',
  // Three the app names and the transcription did not. `ProgressBar` and the stage
  // bars are `bg-stroke`; onboarding's inactive step dots are `colors['stroke']`,
  // which is the arguable one and was settled the app's way in #76.
  '#e5e5e8': 'color-stroke',
  '#d9d9db': 'color-stroke',
  // `Thumbnail` is `bg-grey-300`, and the switch track went back to it in #76, because
  // an off track is not a border. Both are the deprecated tier on purpose: the
  // semantic one has no surface at this value, which ADR 0022 lists for upstream.
  '#dadadd': 'color-grey-300',
  '#e0e0e3': 'color-grey-300',
  // `LiveBanner` is `bg-always-dark`: a fixed role colour, because the banner is dark
  // in both schemes.
  '#333336': 'color-always-dark',
  '#a8a8b0': 'color-grey-500',
  '#7a7a82': 'color-on-canvas-muted',
  '#212124': 'color-on-canvas',
};

const css = await readFile(THEME, 'utf8');

/** `@theme`, `@variant light` and `@variant dark` as three flat maps. */
function block(name) {
  const start = css.indexOf(name);
  if (start === -1) return {};
  const open = css.indexOf('{', start);
  let depth = 0;
  let end = open;
  for (let i = open; i < css.length; i++) {
    if (css[i] === '{') depth++;
    if (css[i] === '}') {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  const out = {};
  for (const line of css.slice(open, end).split('\n')) {
    const m = line.match(/^\s*--([a-z0-9-]+):\s*([^;]+);/);
    if (m) out[m[1]] = m[2].trim();
  }
  return out;
}

const theme = block('@theme');
const light = { ...theme, ...block('@variant light') };
const dark = { ...theme, ...block('@variant dark') };

/** rem to px at the 16px root the app assumes; anything else passes through. */
function number(value) {
  const rem = value.match(/^(-?[\d.]+)rem$/);
  if (rem) return Math.round(Number.parseFloat(rem[1]) * 16 * 1000) / 1000;
  const px = value.match(/^(-?[\d.]+)px$/);
  if (px) return Number.parseFloat(px[1]);
  if (/^-?[\d.]+$/.test(value)) return Number.parseFloat(value);
  return null;
}

const tokens = {};
for (const [name, value] of Object.entries(light)) {
  if (name.startsWith('color-')) {
    if (!/^#[0-9a-f]{6}$/i.test(value)) continue;
    tokens[name] = { light: value.toLowerCase(), dark: (dark[name] || value).toLowerCase() };
    continue;
  }
  if (name.startsWith('spacing-') || name.startsWith('radius-') || name.startsWith('text-')) {
    const n = number(value);
    if (n !== null) tokens[name] = n;
  }
}

const spec = JSON.parse(await readFile(SPEC, 'utf8'));
spec.tokens = tokens;

let bound = 0;
function walk(node) {
  if (Array.isArray(node)) {
    for (const child of node) walk(child);
    return;
  }
  if (node === null || typeof node !== 'object') return;
  for (const key of ['fill', 'stroke', 'color']) {
    const value = node[key];
    if (typeof value === 'string' && AS_TOKEN[value.toLowerCase()]) {
      node[key] = '@' + AS_TOKEN[value.toLowerCase()];
      bound++;
    }
  }
  for (const child of node.children || []) walk(child);
}
walk(spec.screens || []);
// And the pages that carry their own screens. Harmless today, because the only such
// pages are the kit's and `kit.mjs` already writes `@token` refs — but a hand-written
// page entry would otherwise keep its literal hexes and quietly stop following the
// tokens, on that page alone.
for (const page of spec.pages || []) walk(page.screens || []);

await writeFile(SPEC, `${JSON.stringify(spec, null, 2)}\n`);

const colours = Object.values(tokens).filter((t) => typeof t === 'object').length;
console.log(`${Object.keys(tokens).length} tokens (${colours} colours), ${bound} references bound`);
