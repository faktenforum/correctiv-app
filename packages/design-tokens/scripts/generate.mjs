#!/usr/bin/env node
/**
 * The token bridge: reads the binding design tokens from tokens/theme.css (vendored
 * from wp-design-tokens, Tailwind v4 CSS) and generates three artefacts.
 *
 * Two are shared — they are what this package publishes:
 *
 *   1. src/tokens.generated.ts   typed constants: both colour schemes, spacing,
 *                                the type scale, radii, durations
 *   2. src/reader.generated.ts   theme.css as a string, plus the dark override block
 *
 * The third is written into the app instead, because it is not shared:
 *
 *   3. apps/mobile-rn/tailwind.tokens.generated.js   theme map for tailwind.config.js
 *
 * Why that one leaves the package: it is a Tailwind v3 theme map, and Tailwind v3 is
 * what NativeWind 4 is — an engine the app happens to run on, not a property of the
 * tokens. A CMS on Tailwind v4 reads theme.css directly and has no use for it. It is
 * written from here rather than from a second script in the app so that theme.css is
 * parsed ONCE: two passes could disagree about the two colour schemes, and the
 * disagreement would only show up on a device. This generator is repo-bound anyway —
 * it finds theme.css through the repo root (scripts/tokens-source.mjs) — so it finds
 * the app the same way, and that is the only app path it knows.
 *
 * Values are resolved to px (rem × 16), because NativeWind inlines rem at build time
 * against a root size of 14 — px sidesteps that. The token repo stays the single
 * source of truth; this script must never produce output that is then hand-edited.
 *
 * Run:  npm run tokens
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { REPO_ROOT, themeCssPath } from '../../../scripts/tokens-source.mjs';
// The dark palette and the fixed role colours — the one part of the colour system
// that is a decision rather than a design token. The reasoning is in palette.js.
import { dark, roles } from '../palette.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PKG = resolve(__dirname, '..');

// The source is tokens/theme.css in this repo (see tokens/README.md). Why the
// resolution lives in scripts/tokens-source.mjs and not here is explained there.
const THEME_CSS_PATH = themeCssPath();

const REM_BASE = 16; // wp-design-tokens assumes a 16px base

// ---------------------------------------------------------------------------
// 1. Read theme.css and extract the first (base) :root block
// ---------------------------------------------------------------------------
const themeCss = readFileSync(THEME_CSS_PATH, 'utf8');

function firstRootBlock(css) {
  const start = css.indexOf(':root');
  const open = css.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < css.length; i++) {
    if (css[i] === '{') depth++;
    else if (css[i] === '}') {
      depth--;
      if (depth === 0) return css.slice(open + 1, i);
    }
  }
  throw new Error('No :root block found in theme.css');
}

const rootBody = firstRootBlock(themeCss);

// Collect every --var-* declaration (comments ignored)
const rawVars = {};
const declRe = /(--var-[a-z0-9-]+)\s*:\s*([^;]+);/gi;
let m;
while ((m = declRe.exec(rootBody)) !== null) {
  rawVars[m[1]] = m[2].trim();
}

// Resolve var() references (e.g. --var-font-serif: var(--var-font-merriweather))
function resolveVar(value, seen = new Set()) {
  const ref = value.match(/^var\((--var-[a-z0-9-]+)\)$/i);
  if (!ref) return value;
  const name = ref[1];
  if (seen.has(name)) return value;
  seen.add(name);
  if (rawVars[name] == null) return value;
  return resolveVar(rawVars[name], seen);
}

const vars = {};
for (const [k, v] of Object.entries(rawVars)) vars[k] = resolveVar(v);

// ---------------------------------------------------------------------------
// 2. Value conversion
// ---------------------------------------------------------------------------
function toPx(value) {
  const v = value.trim();
  const rem = v.match(/^(-?[\d.]+)rem$/);
  if (rem) return `${round(parseFloat(rem[1]) * REM_BASE)}px`;
  const px = v.match(/^(-?[\d.]+)px$/);
  if (px) return `${round(parseFloat(px[1]))}px`;
  if (v === '0') return '0px';
  return v;
}
function toNumberPx(value) {
  const px = toPx(value);
  const n = parseFloat(px);
  return Number.isNaN(n) ? value : n;
}
function toMs(value) {
  const s = value.match(/^([\d.]+)s$/);
  if (s) return Math.round(parseFloat(s[1]) * 1000);
  return parseFloat(value);
}
function round(n) {
  return Math.round(n * 1000) / 1000;
}

// Collect tokens by group
function group(prefix, transform = (x) => x) {
  const out = {};
  for (const [k, v] of Object.entries(vars)) {
    if (k.startsWith(prefix)) out[k.slice(prefix.length)] = transform(v);
  }
  return out;
}

const tokenColors = group('--var-color-'); // emphasis, alternative, grey-100..700
const radius = group('--var-radius-', toPx); // xs, s, md
const durationsMs = group('--var-duration-', toMs); // fast, slow
const leading = group('--var-leading-', (v) => parseFloat(v)); // unitless
const letterSpacingPx = group('--var-letter-spacing-', toNumberPx);
const fontWeights = group('--var-font-weight-'); // normal, semibold, bold

// Spacing (t-shirt scale)
const spacingTokens = {};
for (const [k, v] of Object.entries(vars)) {
  const mm = k.match(/^--var-spacing-([a-z0-9]+)$/);
  if (mm) spacingTokens[mm[1]] = toPx(v);
}

// Font sizes: text-* and headline-*
const fontSizePx = {};
for (const [k, v] of Object.entries(vars)) {
  const t = k.match(/^--var-font-size-(text|headline)-([a-z]+)$/);
  if (t) fontSizePx[`${t[1]}-${t[2]}`] = toNumberPx(v);
}

const containers = {
  container: toPx(vars['--var-container']),
  'container-content': toPx(vars['--var-container-content']),
};

// ---------------------------------------------------------------------------
// 2b. The second colour layer: dark mode and the fixed role colours
// ---------------------------------------------------------------------------
// `roles` and `dark` come from palette.js (imported at the top), not from theme.css,
// whose dark block is a placeholder carrying the light values.

// A dark value for a token that does not (or no longer) exist would be invisible:
// the colour would simply stay on its light value in dark mode.
for (const name of Object.keys(dark)) {
  if (tokenColors[name] == null) {
    throw new Error(
      `palette.js sets a dark value for "${name}", but theme.css has no such colour.`,
    );
  }
}
// And the other way round: a token without a dark value stays light and is only
// noticed in a finished build. Role colours are scheme-independent on purpose.
for (const name of Object.keys(tokenColors)) {
  if (dark[name] == null) {
    throw new Error(`theme.css has the colour "${name}", palette.js gives it no dark value.`);
  }
}

/** The complete palette per scheme: tokens plus roles. */
const colors = { ...tokenColors, ...roles };
const colorsDark = { ...tokenColors, ...dark, ...roles };

// ---------------------------------------------------------------------------
// 3a. apps/mobile-rn/tailwind.tokens.generated.js — the app's own artefact
// ---------------------------------------------------------------------------
// Font families: the family names the app actually loads (@expo-google-fonts).
// The CSS stacks ("Merriweather", sans-serif) are not usable directly in RN. One
// family per cut works around the Android fontWeight bug; the regular families are
// the NativeWind default for `font-serif`/`font-sans`, and weighted cuts go through
// apps/mobile-rn/src/lib/theme/fonts.ts and the <Typo> component.
//
// They live in THIS section and not in src/, because a family name only means
// something to a runtime that loaded that font: "Merriweather_400Regular" is a React
// Native asset name and would be nonsense to a CMS. The app's typed counterpart is
// the `fontFamily` constant in apps/mobile-rn/src/lib/theme/fonts.ts, which owns the
// weighted cuts as well — so the two are next to each other where they are used.
const RN_FONT_FAMILY = { serif: 'Merriweather_400Regular', sans: 'SourceSans3_400Regular' };

/** "#ff5064" → "255 80 100" — the shape `rgb(var(--x) / <alpha-value>)` needs. */
function toRgbTriple(hex) {
  const m = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) throw new Error(`Colour is not a 6-digit hex value: ${hex}`);
  const n = parseInt(m[1], 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
}

/**
 * Colours go through CSS variables rather than fixed hex values, so that dark mode
 * needs NO `dark:` variant on every surface: `bg-grey-100` resolves the variable at
 * runtime and `.dark:root` redefines it. react-native-css-interop recognises exactly
 * this selector pair (`isRootDarkVariableSelector`) as long as `darkMode: 'class'`
 * is set — see tailwind.config.js.
 *
 * `<alpha-value>` is preserved, or the build would lose classes like
 * `bg-always-dark/70`, the scrim under the play buttons.
 */
const twColors = { transparent: 'transparent', current: 'currentColor' };
for (const name of Object.keys(colors)) {
  twColors[name] = `rgb(var(--color-${name}) / <alpha-value>)`;
}

const colorVars = {
  ':root': Object.fromEntries(
    Object.entries(colors).map(([k, v]) => [`--color-${k}`, toRgbTriple(v)]),
  ),
  '.dark:root': Object.fromEntries(
    Object.entries(colorsDark).map(([k, v]) => [`--color-${k}`, toRgbTriple(v)]),
  ),
};
const twFontSize = Object.fromEntries(Object.entries(fontSizePx).map(([k, v]) => [k, `${v}px`]));
const twSpacing = { px: '1px', 0: '0px', ...spacingTokens };
// Numeric linear scale (2px steps, like the source's own fallback scale)
for (let i = 1; i <= 48; i++) twSpacing[i] = `${i * 2}px`;
const twLetterSpacing = Object.fromEntries(
  Object.entries(letterSpacingPx).map(([k, v]) => [k, `${v}px`]),
);
const twLineHeight = Object.fromEntries(Object.entries(leading).map(([k, v]) => [k, String(v)]));

const HEADER =
  '// AUTO-GENERATED by packages/design-tokens/scripts/generate.mjs — do not edit by hand.\n// Source: tokens/theme.css · Regenerate: npm run tokens\n';

const tailwindOut = `${HEADER}
/* eslint-disable */
module.exports = {
  colors: ${JSON.stringify(twColors, null, 2)},
  colorVars: ${JSON.stringify(colorVars, null, 2)},
  spacing: ${JSON.stringify(twSpacing, null, 2)},
  borderRadius: ${JSON.stringify({ none: '0px', ...radius, full: '9999px' }, null, 2)},
  fontSize: ${JSON.stringify(twFontSize, null, 2)},
  fontWeight: ${JSON.stringify(fontWeights, null, 2)},
  letterSpacing: ${JSON.stringify(twLetterSpacing, null, 2)},
  lineHeight: ${JSON.stringify(twLineHeight, null, 2)},
  fontFamily: ${JSON.stringify({ serif: [RN_FONT_FAMILY.serif], sans: [RN_FONT_FAMILY.sans] }, null, 2)},
  maxWidth: ${JSON.stringify(containers, null, 2)},
};
`;
// REPO_ROOT is known to be non-null here: themeCssPath() above throws without it.
const APP_TAILWIND_TOKENS = resolve(REPO_ROOT, 'apps/mobile-rn/tailwind.tokens.generated.js');
writeFileSync(APP_TAILWIND_TOKENS, tailwindOut);

// ---------------------------------------------------------------------------
// 3b. src/tokens.generated.ts — the typed constants
// ---------------------------------------------------------------------------
const spacingPx = Object.fromEntries(
  Object.entries(spacingTokens).map(([k, v]) => [k, parseFloat(v)]),
);
const radiusPx = Object.fromEntries(Object.entries(radius).map(([k, v]) => [k, parseFloat(v)]));

const tsOut = `${HEADER}
/* eslint-disable */
// Two complete palettes. Classes (bg-, border-) switch by themselves through the
// CSS variables; these constants do NOT — read them directly and the colour stays
// on its light value in dark mode. In the app, use useColors() from @/lib/theme.
export const colors = ${JSON.stringify(colors, null, 2)} as const;
export const colorsDark: Record<ColorToken, string> = ${JSON.stringify(colorsDark, null, 2)};
export const spacingPx = ${JSON.stringify(spacingPx, null, 2)} as const;
export const radiusPx = ${JSON.stringify(radiusPx, null, 2)} as const;
export const fontSizePx = ${JSON.stringify(fontSizePx, null, 2)} as const;
export const leading = ${JSON.stringify(leading, null, 2)} as const;
export const letterSpacingPx = ${JSON.stringify(letterSpacingPx, null, 2)} as const;
export const fontWeights = ${JSON.stringify(fontWeights, null, 2)} as const;
export const durationsMs = ${JSON.stringify(durationsMs, null, 2)} as const;

export type ColorToken = keyof typeof colors;
export type SpacingToken = keyof typeof spacingPx;
`;
const SRC_DIR = resolve(PKG, 'src');
mkdirSync(SRC_DIR, { recursive: true });
writeFileSync(resolve(SRC_DIR, 'tokens.generated.ts'), tsOut);

// ---------------------------------------------------------------------------
// 3c. src/reader.generated.ts
//     theme.css (base :root plus media queries; the WebView ignores @theme inline)
// ---------------------------------------------------------------------------
const themeCssForReader = themeCss.split('@theme inline')[0].trim();

// Dark mode for the article WebView. READER_LAYOUT_CSS in the core takes every
// colour from `--var-color-*`, so redefining the same variables after THEME_CSS is
// enough — the same palette as the app, maintained in one place.
const darkVarBlock = Object.entries(colorsDark)
  .map(([k, v]) => `--var-color-${k}:${v}`)
  .join(';');
// The one rule the variables do not reach: the "partly false" verdict plaque sits
// on the club yellow, which stays yellow in the dark — and its text is grey-700,
// which would turn near-white there.
const readerDarkCss = `:root{${darkVarBlock}}.rating--qualified{color:${roles['always-dark']}}`;

const readerOut = `${HEADER}
/* eslint-disable */
// theme.css verbatim (CSS custom properties) — the WebView uses the --var-* directly.
export const THEME_CSS = ${JSON.stringify(themeCssForReader)};

// Appended AFTER THEME_CSS when the app is running dark. See the host's reader
// wiring — apps/mobile-rn/src/lib/articles/reader.ts.
export const READER_DARK_CSS = ${JSON.stringify(readerDarkCss)};
`;
writeFileSync(resolve(SRC_DIR, 'reader.generated.ts'), readerOut);

// ---------------------------------------------------------------------------
console.log('Token bridge generated:');
console.log('  • packages/design-tokens/src/tokens.generated.ts');
console.log('  • packages/design-tokens/src/reader.generated.ts');
console.log('  • apps/mobile-rn/tailwind.tokens.generated.js');
console.log(
  `  (${Object.keys(colors).length} colours, ${Object.keys(spacingTokens).length} spacing tokens, ${Object.keys(fontSizePx).length} font sizes)`,
);
