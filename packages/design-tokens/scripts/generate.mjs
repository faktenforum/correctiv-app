#!/usr/bin/env node
/**
 * The token bridge: reads the binding design tokens from tokens/theme.css (vendored
 * from wp-design-tokens) and generates the three artefacts this package publishes:
 *
 *   1. theme.css                 the Tailwind v4 theme — the file the app's
 *                                global.css imports, and the one a CMS on
 *                                Tailwind v4 can import unchanged
 *   2. src/tokens.generated.ts   typed constants: both colour schemes, spacing,
 *                                the type scale, radii, durations
 *   3. src/reader.generated.ts   theme.css as a string, plus the dark override block
 *
 * Nothing is written into the app any more. That changed with the move to
 * Uniwind: the previous artefact was a Tailwind v3 theme map, which is what
 * NativeWind is — an engine the app happened to run on, not a property of the
 * tokens. Tailwind v4 takes its theme from CSS, and CSS is portable, so the app
 * and the CMS can read the same file.
 *
 * The typed constants resolve to px, because a React Native style takes numbers.
 * theme.css keeps rem — see the note on that artefact below for why the two units
 * now agree where they used to have to differ. The token repo stays the single
 * source of truth; this script must never produce output that is then hand-edited.
 *
 * Run:  npm run tokens
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { themeCssPath } from '../../../scripts/tokens-source.mjs';
// The dark palette and the fixed role colours — the one part of the colour system
// that is a decision rather than a design token. The reasoning is in palette.js.
import { dark, roles } from '../palette.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PKG = resolve(__dirname, '..');

// The source is tokens/theme.css in this repo (see tokens/README.md). Why the
// resolution lives in scripts/tokens-source.mjs and not here is explained there.
const THEME_CSS_PATH = themeCssPath();

const REM_BASE = 16; // wp-design-tokens assumes a 16px base, and so does Uniwind

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
// 3a. theme.css — the Tailwind v4 theme
// ---------------------------------------------------------------------------
/**
 * Two files, because two consumers need different amounts of scaffolding.
 *
 *   theme.css             the tokens. What the app imports; Uniwind supplies the
 *                         `light` / `dark` variant definitions it needs.
 *   theme.standalone.css  the same, with those definitions included. What a
 *                         consumer outside this repo imports — a WordPress theme
 *                         on Tailwind v4, which has no Uniwind to supply them.
 *
 * The split exists so the app does not shadow Uniwind's own definitions with a
 * second copy of them. Without the standalone file, `theme.css` alone fails on a
 * plain Tailwind v4 build with `Cannot use @variant with unknown variant: light`.
 *
 * Values stay in `rem` here, unlike the px in the typed constants below. Uniwind
 * resolves rem against 16 (`--uniwind-em`), which is both the CSS convention and
 * the base wp-design-tokens assumes, so the app lands on exactly the same pixels
 * — while a browser keeps the user's font scaling, which a px value would throw
 * away. This is why one set of values can serve both consumers; under NativeWind
 * it could not, because that inlined rem against a root size of 14.
 *
 * They sit at the package ROOT because that is where a CSS entry conventionally
 * lives; `src/` is for what TypeScript imports. Both are named explicitly in the
 * `exports` map, and a bare subpath resolves for Uniwind and for the plain
 * Tailwind CLI alike — an earlier note here claimed the CLI ignores exports maps,
 * which is simply not true and was a bad test on my part.
 *
 * ## Why the palette appears three times
 *
 * `@theme` registers the colour names — that is what makes `bg-grey-100` exist as
 * a utility at all — and gives them their light values, so a consumer that never
 * switches themes is already correct. The two `@variant` blocks then carry the
 * per-theme values: Uniwind scans for exactly these to learn which variables are
 * theme-dependent, and both blocks must declare the SAME set or it refuses. The
 * two checks above already guarantee that.
 *
 * The upshot is that dark mode needs no `dark:` variant on any surface:
 * `bg-grey-100` resolves a variable, redefined under both the `.dark` class and
 * `prefers-color-scheme: dark`.
 */
/** The header both generated TypeScript files carry. */
const HEADER =
  '// AUTO-GENERATED by packages/design-tokens/scripts/generate.mjs — do not edit by hand.\n' +
  '// Source: tokens/theme.css · Regenerate: npm run tokens\n';

/** The same, as a CSS comment. */
const CSS_HEADER =
  '/* AUTO-GENERATED by packages/design-tokens/scripts/generate.mjs — do not edit by hand.\n' +
  '   Source: tokens/theme.css · Regenerate: npm run tokens */\n';

/** The raw token value, in the unit theme.css wrote it in. */
const raw = (name) => vars[name];

const themeEntries = [
  // Tailwind's DEFAULT radius, cleared. Without this line v4 also emits a BARE
  // form of each logical side utility — `rounded-s` for the start side, `-e`,
  // `-t`, `-b`, `-l`, `-r`, `-ss`, `-se`, `-es`, `-ee` — and this scale has a
  // token called `s`. Both rules were emitted and both applied: every Badge, the
  // search field and the duration chip on a video thumbnail had 4px leading
  // corners and 2px trailing ones, past a green build, because `--radius-s` still
  // held the right value and still emitted a correct rule of its own.
  //
  // Clearing the DEFAULT removes the bare form for ALL ten names, so no radius
  // token can collide this way — including ones the design system has not added
  // yet. `apps/mobile-rn/__tests__/tokens.test.ts` fails if this line goes.
  ['  --radius: initial;'],
  // The numeric step. The design system counts in 2px, so `p-4` is 8px and not
  // Tailwind's 16 — which is why numeric utilities are banned outright; see
  // apps/mobile-rn/__tests__/no-numeric-utilities.test.ts.
  [`  --spacing: ${raw('--var-spacing')};`],
  Object.keys(spacingTokens).map((k) => `  --spacing-${k}: ${raw(`--var-spacing-${k}`)};`),
  Object.keys(radius).map((k) => `  --radius-${k}: ${raw(`--var-radius-${k}`)};`),
  // `text-m`, not `text-text-m`: the token names carry their own `text-` prefix
  // and Tailwind's font-size namespace supplies one too.
  Object.keys(fontSizePx).map(
    (k) => `  --text-${k.replace(/^text-/, '')}: ${raw(`--var-font-size-${k}`)};`,
  ),
  Object.keys(leading).map((k) => `  --leading-${k}: ${raw(`--var-leading-${k}`)};`),
  Object.keys(letterSpacingPx).map(
    (k) => `  --tracking-${k}: ${raw(`--var-letter-spacing-${k}`)};`,
  ),
  Object.keys(fontWeights).map((k) => `  --font-weight-${k}: ${raw(`--var-font-weight-${k}`)};`),
  [
    `  --container-content: ${raw('--var-container-content')};`,
    `  --container-wide: ${raw('--var-container')};`,
  ],
];

const variantBlock = (name, palette) =>
  [
    `@variant ${name} {`,
    ...Object.entries(palette).map(([k, v]) => `  --color-${k}: ${v};`),
    '}',
  ].join('\n');

const paletteLines = (palette) => Object.entries(palette).map(([k, v]) => `  --color-${k}: ${v};`);

const themeCssOut = [
  CSS_HEADER,
  '@theme {',
  themeEntries.map((group) => group.join('\n')).join('\n\n'),
  '',
  '  /* Light values, so a consumer that never switches themes is already right. */',
  ...paletteLines(colors),
  '}',
  '',
  variantBlock('light', colors),
  '',
  variantBlock('dark', colorsDark),
  '',
].join('\n');

writeFileSync(resolve(PKG, 'theme.css'), themeCssOut);

/**
 * The `light` and `dark` variants, spelled out for a build that has no Uniwind.
 * Both halves matter: the class lets an app override the device, the media query
 * is what applies when it does not.
 */
const VARIANT_DEFINITIONS = ['light', 'dark']
  .map((theme) =>
    [
      `@custom-variant ${theme} {`,
      `  &:where(.${theme}, .${theme} *) { @slot; }`,
      '',
      `  @media (prefers-color-scheme: ${theme}) {`,
      '    &:not(:where(.light, .light *, .dark, .dark *)) { @slot; }',
      '  }',
      '}',
    ].join('\n'),
  )
  .join('\n\n');

/**
 * The import comes FIRST, and that is not cosmetic: CSS allows `@import` only
 * before other statements, so a conforming preprocessor must drop a late one. The
 * Tailwind CLI is lenient and accepted it either way; `postcss-import` — routine in
 * a WordPress chain — warns and drops it, and the consumer then gets the two variant
 * definitions and NOTHING else: no colours, no spacing, no radii, every utility
 * silently absent behind a build warning. Which is precisely the failure this file
 * exists to prevent, aimed at its one named consumer.
 *
 * `@variant light` resolving before the `@custom-variant` that defines it is fine —
 * Tailwind collects definitions before applying them, and the compiled output is
 * byte-identical either way.
 */
const standaloneOut = [CSS_HEADER, "@import './theme.css';", '', VARIANT_DEFINITIONS, ''].join(
  '\n',
);

writeFileSync(resolve(PKG, 'theme.standalone.css'), standaloneOut);

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
console.log('  • packages/design-tokens/theme.css');
console.log('  • packages/design-tokens/theme.standalone.css');
console.log('  • packages/design-tokens/src/tokens.generated.ts');
console.log('  • packages/design-tokens/src/reader.generated.ts');
console.log(
  `  (${Object.keys(colors).length} colours, ${Object.keys(spacingTokens).length} spacing tokens, ${Object.keys(fontSizePx).length} font sizes)`,
);
