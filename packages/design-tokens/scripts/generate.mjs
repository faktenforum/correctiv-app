#!/usr/bin/env node
/**
 * The token bridge: reads the binding design tokens from tokens/theme.css (vendored
 * from wp-design-tokens) and generates the four artefacts this package publishes:
 *
 *   1. theme.css                 the Tailwind v4 theme — the file the app's
 *                                global.css imports, and the one a CMS on
 *                                Tailwind v4 can import unchanged
 *   2. theme.standalone.css      the same, with the `light` / `dark` variant
 *                                definitions spelled out, for a build that has no
 *                                Uniwind to supply them
 *   3. src/tokens.generated.ts   typed constants: both colour schemes, spacing,
 *                                the type scale, radii, durations
 *   4. src/reader.generated.ts   theme.css as a string, plus the dark override block
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
 * ## The shape of this file
 *
 * Six phases, in order, each one a function, so that a change has one obvious place
 * to land. `main()` at the bottom is the whole flow on one screen.
 *
 *   1. parse      tokens/theme.css → a flat map of every --var-* value
 *   2. convert    the unit helpers the two consumers need (rem · px · s)
 *   3. group      that flat map → the token scales, by prefix
 *   4. palette    the second colour layer, and the two checks that must be LOUD
 *   5. render     one function per artefact, each returning a complete string
 *   6. write      the only side effects in the file
 *
 * Nothing here decides how the output LOOKS except the five render functions, and
 * every byte of what they produce is pinned by
 * `apps/mobile/__tests__/tokens.test.ts`, which regenerates all four artefacts
 * and byte-compares them against the committed copies. Restructuring this script is
 * safe exactly to the extent that check is.
 *
 * Run:  npm run tokens
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { themeCssPath, typographyCssPath } from '../../../scripts/tokens-source.mjs';
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
// 1. Parse — theme.css into a flat map of --var-* values
// ---------------------------------------------------------------------------

/**
 * The FIRST `:root` block, and deliberately only that one: theme.css carries a
 * second inside its `@media (prefers-color-scheme: dark)` section, and that one is
 * the placeholder holding the LIGHT values. Reading it would produce a dark mode
 * that compiles, ships and changes nothing on screen.
 */
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

/** Follows `--var-font-serif: var(--var-font-merriweather)` to its endpoint. */
function resolveVar(rawVars, value, seen = new Set()) {
  const ref = value.match(/^var\((--var-[a-z0-9-]+)\)$/i);
  if (!ref) return value;
  const name = ref[1];
  if (seen.has(name)) return value; // a cycle: leave the value as written
  seen.add(name);
  if (rawVars[name] == null) return value;
  return resolveVar(rawVars, rawVars[name], seen);
}

/**
 * Every `--var-*` declaration in the base `:root`, with `var()` references
 * followed. Insertion order is the order theme.css declares them in, and it
 * survives into every artefact — the generated files list their tokens in source
 * order, which is why a reordering upstream is a real diff here.
 */
function parseVars(css) {
  const rootBody = firstRootBlock(css);

  // Collect every --var-* declaration (comments ignored)
  const rawVars = {};
  const declRe = /(--var-[a-z0-9-]+)\s*:\s*([^;]+);/gi;
  let m;
  while ((m = declRe.exec(rootBody)) !== null) {
    rawVars[m[1]] = m[2].trim();
  }

  const vars = {};
  for (const [k, v] of Object.entries(rawVars)) vars[k] = resolveVar(rawVars, v);
  return vars;
}

// ---------------------------------------------------------------------------
// 2. Convert — the units the two consumers need
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

// ---------------------------------------------------------------------------
// 3. Group — the flat map into the token scales
// ---------------------------------------------------------------------------

/**
 * The scales every artefact is built from. Each is a slice of the flat map, keyed
 * by whatever follows the prefix.
 */
function groupScales(vars) {
  /** Everything under one `--var-` prefix, with the prefix stripped off the keys. */
  function byPrefix(prefix, transform = (x) => x) {
    const out = {};
    for (const [k, v] of Object.entries(vars)) {
      if (k.startsWith(prefix)) out[k.slice(prefix.length)] = transform(v);
    }
    return out;
  }

  // Spacing (t-shirt scale). Matched rather than taken byPrefix, because
  // `--var-spacing` itself is the numeric step and must not become a token of the
  // scale — see the `--spacing:` entry in renderThemeCss.
  const spacingTokens = {};
  for (const [k, v] of Object.entries(vars)) {
    const mm = k.match(/^--var-spacing-([a-z0-9]+)$/);
    if (mm) spacingTokens[mm[1]] = toPx(v);
  }

  // Font sizes: text-* and headline-*, flattened into one scale.
  const fontSizePx = {};
  for (const [k, v] of Object.entries(vars)) {
    const t = k.match(/^--var-font-size-(text|headline)-([a-z]+)$/);
    if (t) fontSizePx[`${t[1]}-${t[2]}`] = toNumberPx(v);
  }

  return {
    tokenColors: byPrefix('--var-color-'), // emphasis, alternative, grey-100..700
    radius: byPrefix('--var-radius-', toPx), // xs, s, md
    durationsMs: byPrefix('--var-duration-', toMs), // fast, slow
    leading: byPrefix('--var-leading-', (v) => parseFloat(v)), // unitless
    letterSpacingPx: byPrefix('--var-letter-spacing-', toNumberPx),
    fontWeights: byPrefix('--var-font-weight-'), // normal, semibold, bold
    spacingTokens,
    fontSizePx,
  };
}

// ---------------------------------------------------------------------------
// 4. Palette — the second colour layer, and the two checks that must be loud
// ---------------------------------------------------------------------------
// `roles` and `dark` come from palette.js (imported at the top), not from theme.css,
// whose dark block is a placeholder carrying the light values.

/**
 * Both directions of one promise: every token colour has a dark value, and every
 * dark value belongs to a token colour.
 *
 * Neither failure has a symptom of its own — the colour simply stays on its light
 * value in dark mode, in a build that is otherwise green — so both THROW rather
 * than warn, and the message names the colour and which side is missing. Uniwind
 * needs the same guarantee: it refuses a pair of `@variant` blocks that do not
 * declare the same set of variables.
 */
function assertPaletteAgrees(tokenColors) {
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
}

/** The complete palette per scheme: tokens plus roles. */
function buildPalettes(tokenColors) {
  assertPaletteAgrees(tokenColors);
  return {
    colors: { ...tokenColors, ...roles },
    colorsDark: { ...tokenColors, ...dark, ...roles },
  };
}

// ---------------------------------------------------------------------------
// 4b. Parse typography.css — the composite `ty-*` utilities
// ---------------------------------------------------------------------------
/**
 * Which CSS property maps to which field of a spec, and which `--var-` prefix its
 * value is expected to carry. `font-family` is the odd one out: its value is
 * `--var-font-serif` or `--var-font-sans`, so the token name IS the family.
 */
const TYPO_PROPERTIES = {
  'font-family': { field: 'family', prefix: '--var-font-' },
  'font-weight': { field: 'weight', prefix: '--var-font-weight-' },
  'font-size': { field: 'size', prefix: '--var-font-size-' },
  'letter-spacing': { field: 'tracking', prefix: '--var-letter-spacing-' },
  'line-height': { field: 'leading', prefix: '--var-leading-' },
};

/**
 * Properties this bridge sees and deliberately drops. React Native has no
 * `word-spacing`, so carrying it would be a field nothing could ever apply.
 *
 * Anything NOT in this list and not in TYPO_PROPERTIES throws, on purpose: an
 * upstream that starts setting `text-transform` should surface as a failed
 * generation rather than as a difference nobody notices between the CSS and the
 * app.
 */
const TYPO_IGNORED = ['word-spacing'];

/** The body of `{ … }` starting at `open`, brace-matched so nested rules survive. */
function balancedBody(css, open) {
  let depth = 0;
  for (let i = open; i < css.length; i++) {
    if (css[i] === '{') depth++;
    else if (css[i] === '}') {
      depth--;
      if (depth === 0) return css.slice(open + 1, i);
    }
  }
  throw new Error('Unbalanced braces in typography.css');
}

function readDeclarations(body, variant, where) {
  const spec = {};
  for (const [, property, value] of body.matchAll(/^\s*([a-z-]+)\s*:\s*([^;]+);/gm)) {
    if (TYPO_IGNORED.includes(property)) continue;
    const mapping = TYPO_PROPERTIES[property];
    if (!mapping) {
      throw new Error(
        `typography.css: ty-${variant} sets "${property}"${where}, which this bridge ` +
          'neither maps to a React Native style nor lists as deliberately dropped. ' +
          'Add it to TYPO_PROPERTIES or TYPO_IGNORED in scripts/generate.mjs.',
      );
    }
    const token = /^var\((--var-[a-z0-9-]+)\)$/i.exec(value.trim())?.[1];
    if (!token || !token.startsWith(mapping.prefix)) {
      throw new Error(
        `typography.css: ty-${variant}'s ${property} is "${value.trim()}", not a ` +
          `var(${mapping.prefix}…) reference. The bridge reads token names, not values.`,
      );
    }
    spec[mapping.field] = token.slice(mapping.prefix.length);
  }
  return spec;
}

/**
 * Every `ty-*` utility as a spec of TOKEN NAMES, not resolved values — the host
 * turns them into a style, because how a family name reaches a text run is a
 * platform question (see the note on font families in src/index.ts).
 *
 * The three headlines that carry a `@media (min-width: 48rem)` line-height get a
 * second field rather than losing it. The app renders the mobile value; that was a
 * decision, and it stays one, but it is no longer made by omission.
 */
function parseTypography(css) {
  const specs = {};
  for (const match of css.matchAll(/@utility\s+ty-([a-z0-9-]+)\s*\{/g)) {
    const variant = match[1];
    const body = balancedBody(css, match.index + match[0].length - 1);
    const mobile = readDeclarations(body.replace(/@media[^{]*\{[\s\S]*?\n\s*\}/g, ''), variant, '');
    const media = /@media\s*\(min-width:\s*48rem\)\s*\{([\s\S]*?)\n\s*\}/.exec(body);
    const tablet = media ? readDeclarations(media[1], variant, ' inside its @media block') : {};
    specs[variant] = tablet.leading ? { ...mobile, leadingTablet: tablet.leading } : mobile;
  }
  if (Object.keys(specs).length === 0) throw new Error('typography.css: no ty-* utilities found');
  return specs;
}

// ---------------------------------------------------------------------------
// 5. Render — one function per artefact, each returning a complete string
// ---------------------------------------------------------------------------

/** The header both generated TypeScript files carry. */
const HEADER =
  '// AUTO-GENERATED by packages/design-tokens/scripts/generate.mjs — do not edit by hand.\n' +
  '// Source: tokens/theme.css · Regenerate: npm run tokens\n';

/** The same, as a CSS comment. */
const CSS_HEADER =
  '/* AUTO-GENERATED by packages/design-tokens/scripts/generate.mjs — do not edit by hand.\n' +
  '   Source: tokens/theme.css · Regenerate: npm run tokens */\n';

const paletteLines = (palette) => Object.entries(palette).map(([k, v]) => `  --color-${k}: ${v};`);

const variantBlock = (name, palette) =>
  [`@variant ${name} {`, ...paletteLines(palette), '}'].join('\n');

/**
 * theme.css — the Tailwind v4 theme, and the artefact the other three are
 * variations on.
 *
 * Two CSS files, because two consumers need different amounts of scaffolding.
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
 * two checks in phase 4 already guarantee that.
 *
 * The upshot is that dark mode needs no `dark:` variant on any surface:
 * `bg-grey-100` resolves a variable, redefined under both the `.dark` class and
 * `prefers-color-scheme: dark`.
 */
function renderThemeCss(vars, scales, colors, colorsDark) {
  const { radius, leading, letterSpacingPx, fontWeights, spacingTokens, fontSizePx } = scales;

  /** The raw token value, in the unit theme.css wrote it in. */
  const raw = (name) => vars[name];

  // One array per group; the groups are separated by a blank line in the output.
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
    // yet. `apps/mobile/__tests__/tokens.test.ts` fails if this line goes, and it
    // asserts the LINE rather than relying on its drift check: once this generator
    // stops emitting the line, the committed file agrees with it again and drift
    // sees nothing.
    ['  --radius: initial;'],
    // The numeric step. The design system counts in 2px, so `p-4` is 8px and not
    // Tailwind's 16 — which is why numeric utilities are banned outright; see
    // apps/mobile/__tests__/no-numeric-utilities.test.ts.
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

  return [
    CSS_HEADER,
    '@theme {',
    themeEntries.map((lines) => lines.join('\n')).join('\n\n'),
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
}

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
 * theme.standalone.css — theme.css plus those definitions.
 *
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
function renderStandaloneCss() {
  return [CSS_HEADER, "@import './theme.css';", '', VARIANT_DEFINITIONS, ''].join('\n');
}

/** src/tokens.generated.ts — the typed constants, in px, because an RN style takes numbers. */
function renderTokensTs(scales, colors, colorsDark) {
  const { radius, durationsMs, leading, letterSpacingPx, fontWeights, spacingTokens, fontSizePx } =
    scales;

  const spacingPx = Object.fromEntries(
    Object.entries(spacingTokens).map(([k, v]) => [k, parseFloat(v)]),
  );
  const radiusPx = Object.fromEntries(Object.entries(radius).map(([k, v]) => [k, parseFloat(v)]));

  return `${HEADER}
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
}

/**
 * src/reader.generated.ts — theme.css as a string for the article WebView, which is
 * a browser context of its own and shares nothing with the app's styles.
 *
 * The base `:root` plus the media queries, but not `@theme inline`: that is
 * Tailwind's, and the WebView would ignore it.
 */
function renderTypographyTs(specs) {
  const header = HEADER.replace('tokens/theme.css', 'tokens/typography.css');
  return `${header}
/* eslint-disable */
// The composite \`ty-*\` utilities, as TOKEN NAMES.
// Resolve them against the scales in ./tokens.generated. A host turns a spec into
// whatever its platform calls a text style; this file takes no view on that.
//
// \`leadingTablet\` is present where typography.css overrides the line height at
// 48rem. Read it or do not — but it is here, rather than dropped in transcription.
export const typographySpecs = ${JSON.stringify(specs, null, 2)} as const;

export type TypoVariant = keyof typeof typographySpecs;
`;
}

function renderReaderTs(themeCss, colorsDark) {
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

  return `${HEADER}
/* eslint-disable */
// theme.css verbatim (CSS custom properties) — the WebView uses the --var-* directly.
export const THEME_CSS = ${JSON.stringify(themeCssForReader)};

// Appended AFTER THEME_CSS when the app is running dark. See the host's reader
// wiring — apps/mobile/src/lib/articles/reader.ts.
export const READER_DARK_CSS = ${JSON.stringify(readerDarkCss)};
`;
}

// ---------------------------------------------------------------------------
// 6. Write — the only side effects in this file
// ---------------------------------------------------------------------------
function main() {
  const themeCss = readFileSync(THEME_CSS_PATH, 'utf8');
  const typographySpecs = parseTypography(readFileSync(typographyCssPath(), 'utf8'));
  const vars = parseVars(themeCss);
  const scales = groupScales(vars);
  const { colors, colorsDark } = buildPalettes(scales.tokenColors);

  writeFileSync(resolve(PKG, 'theme.css'), renderThemeCss(vars, scales, colors, colorsDark));
  writeFileSync(resolve(PKG, 'theme.standalone.css'), renderStandaloneCss());

  const SRC_DIR = resolve(PKG, 'src');
  mkdirSync(SRC_DIR, { recursive: true });
  writeFileSync(
    resolve(SRC_DIR, 'tokens.generated.ts'),
    renderTokensTs(scales, colors, colorsDark),
  );
  writeFileSync(resolve(SRC_DIR, 'typography.generated.ts'), renderTypographyTs(typographySpecs));
  writeFileSync(resolve(SRC_DIR, 'reader.generated.ts'), renderReaderTs(themeCss, colorsDark));

  console.log('Token bridge generated:');
  console.log('  • packages/design-tokens/theme.css');
  console.log('  • packages/design-tokens/theme.standalone.css');
  console.log('  • packages/design-tokens/src/tokens.generated.ts');
  console.log('  • packages/design-tokens/src/typography.generated.ts');
  console.log('  • packages/design-tokens/src/reader.generated.ts');
  console.log(
    `  (${Object.keys(colors).length} colours, ${Object.keys(scales.spacingTokens).length} spacing tokens, ${Object.keys(scales.fontSizePx).length} font sizes)`,
  );
}

main();
