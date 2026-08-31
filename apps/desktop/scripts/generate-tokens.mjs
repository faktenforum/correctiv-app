/**
 * `packages/design-tokens/theme.css` -> gjsify `StyleTokens`, for `configureStyle`.
 *
 * ADR 0032 section 3 splits the styling vocabulary in two: the class FAMILIES
 * (`mt`, `bg`, `rounded`, ...) are declared inside `@gjsify/gtk-host/style`, and the
 * VALUES belong to the project. This script is that second half, and it is
 * mechanical on purpose. Every scale below is a rename of something `theme.css`
 * already says, so the desktop host cannot drift from the palette the phone and the
 * web target paint with.
 *
 * TWO CONVERSIONS THAT ARE NOT RENAMES, both forced by GTK rather than chosen:
 *
 *   1. `rem` becomes `px`, at 16. `mt-*`, `gap-*` and `w-*` reach GTK as
 *      `margin-top`, `spacing` and `width-request`, which are `gint`s of device
 *      pixels with no unit conversion behind them, so a `rem` scale is a named
 *      error the moment a margin asks for it. 16 is not a guess: ADR 0008 records
 *      that Uniwind resolves `rem` against 16, which is what the phone already
 *      lands on. Every named spacing and radius token in this file divides into a
 *      whole pixel at that base -- asserted below rather than assumed, because a
 *      fractional margin is the kind of thing that rounds silently and shifts a
 *      layout by a pixel nobody can attribute.
 *
 *   2. Two Tailwind DEFAULTS are added that `@theme` never declares, because
 *      Uniwind supplies them on the phone and nothing here would: `0` in the
 *      spacing scale (`inset-0`, `left-0`, `right-0`, `top-0` -- 6 uses) and `full`
 *      in the radius scale (`rounded-full` -- 11 uses). Without them those six
 *      utilities are a named throw at first render, which is a correct refusal
 *      answering the wrong question: the app is not misspelling a token, it is
 *      using a Tailwind default that this generator failed to carry across.
 *
 * The output is `*.generated.ts` so `.oxfmtrc.json` leaves it alone; the shape it
 * is generated in is already the formatter's.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SOURCE = join(HERE, '..', '..', '..', 'packages', 'design-tokens', 'theme.css');
const OUT = join(HERE, '..', 'src', 'generated', 'tokens.generated.ts');

/** Uniwind's rem base, and therefore the phone's. ADR 0008. */
const REM = 16;

/**
 * One `@theme` / `@variant <name>` block, as a flat map of custom properties.
 *
 * Brace-counted rather than regex-matched to the first `}`: `@theme` holds nested
 * comments and would end early on the wrong one.
 */
function block(css, header) {
  const start = css.indexOf(header);
  if (start === -1) throw new Error(`generate-tokens: no "${header}" block in ${SOURCE}`);
  let depth = 0;
  let index = css.indexOf('{', start);
  const open = index;
  for (; index < css.length; index++) {
    if (css[index] === '{') depth++;
    else if (css[index] === '}' && --depth === 0) break;
  }
  const body = css.slice(open + 1, index);
  const out = {};
  for (const [, name, value] of body.matchAll(/^\s*(--[\w-]+)\s*:\s*([^;]+);/gm)) {
    out[name] = value.trim();
  }
  return out;
}

/**
 * A CSS length in `rem` as whole device pixels, or the value unchanged.
 *
 * Refuses a fractional result for anything the WIDGET-PROPERTY channel reads. A
 * `font-size` of 15.5px is ordinary CSS and passes through; a `margin-top` of
 * 15.5px is a `gint` and would be rounded by GTK with no diagnostic.
 */
function toPx(value, { whole }) {
  const rem = /^(-?[\d.]+)rem$/.exec(value);
  if (!rem) return value;
  const px = Number(rem[1]) * REM;
  if (whole && !Number.isInteger(px)) {
    throw new Error(
      `generate-tokens: "${value}" is ${px}px at a rem base of ${REM}, which is not a whole ` +
        'device pixel. GTK takes this channel as a gint and would round it silently.',
    );
  }
  return `${px}px`;
}

/** Every `--<prefix>-<token>` in a block, as `{ token: value }`. */
function scale(vars, prefix, transform = (value) => value) {
  const out = {};
  for (const [name, value] of Object.entries(vars)) {
    if (!name.startsWith(`--${prefix}-`)) continue;
    out[name.slice(prefix.length + 3)] = transform(value);
  }
  return out;
}

const css = readFileSync(SOURCE, 'utf8');
const theme = block(css, '@theme');
const dark = block(css, '@variant dark');

/**
 * `#rrggbb` as `rgb(r g b)`.
 *
 * The spelling GTK's CSS parser round-trips unchanged, so a rule read back out of
 * the sheet is comparable to the value written here -- which is what makes a probe
 * of the generated document meaningful rather than a string-shape test.
 */
function rgb(hex) {
  const match = /^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex.trim());
  if (!match) return hex.trim();
  const [r, g, b] = match.slice(1).map((part) => Number.parseInt(part, 16));
  return `rgb(${r} ${g} ${b})`;
}

const spacing = {
  // Not in `@theme`, and both are Tailwind defaults the app leans on. See the header.
  0: '0px',
  px: '1px',
  ...scale(theme, 'spacing', (value) => toPx(value, { whole: true })),
};

const borderRadius = {
  ...scale(theme, 'radius', (value) => toPx(value, { whole: true })),
  full: '9999px',
};

/**
 * Tailwind's own colour keywords, which `@theme` does not declare.
 *
 * `bg-transparent` is used on this app's own screens and would otherwise be a named
 * throw listing the twelve brand colours -- a correct refusal answering the wrong
 * question, because the app is not misspelling a brand colour, it is using a Tailwind
 * default that Uniwind supplies on the phone and this generator failed to carry.
 *
 * `white` and `black` come along because they are the other two a port reaches for,
 * and neither collides: the two families that read the colour scale (`text-*` and
 * `border-*`) also read `fontSize` and `borderWidth`, and no name here appears in
 * either.
 */
const KEYWORD_COLORS = {
  transparent: 'transparent',
  white: 'rgb(255 255 255)',
  black: 'rgb(0 0 0)',
};

const shared = {
  spacing,
  borderRadius,
  // `theme.css` declares no border widths: the app writes `border` and `border-b`,
  // which are Tailwind's DEFAULT and want 1px. Carried across for the same reason
  // as `0` and `full` above.
  borderWidth: { DEFAULT: '1px', 0: '0', 2: '2px', 4: '4px' },
  // Fractional px is fine here -- font-size is CSS, not a gint.
  fontSize: scale(theme, 'text', (value) => toPx(value, { whole: false })),
  fontWeight: scale(theme, 'font-weight'),
  letterSpacing: scale(theme, 'tracking'),
  lineHeight: scale(theme, 'leading'),
  // Not a token family in `theme.css` -- Tailwind generates these from a number, so
  // there is no scale to read and the whole ramp has to be carried. In steps of 5,
  // which covers every value the app writes today (40, 60, 70, 80, 90) without
  // guessing which one it adds next. No collision risk: the `opacity-*` family reads
  // this scale and nothing else.
  opacity: Object.fromEntries(
    Array.from({ length: 21 }, (_, step) => [String(step * 5), String((step * 5) / 100)]),
  ),
};

const render = (value) => JSON.stringify(value, null, 2).replaceAll('\n', '\n');

const source = `// AUTO-GENERATED by apps/desktop/scripts/generate-tokens.mjs -- do not edit by hand.
// Source: packages/design-tokens/theme.css . Regenerate: npm run tokens -w @correctiv/desktop
//
// The project half of ADR 0032 section 3. \`rem\` is resolved to device pixels at a
// base of 16 (ADR 0008), because GTK reads margins and size requests as gints.

import type { StyleTokens } from '@gjsify/gtk-host/style';

/** The light palette, and every scale that does not vary with the colour scheme. */
export const LIGHT_TOKENS: StyleTokens = ${render({ ...shared, colors: { ...KEYWORD_COLORS, ...scale(theme, 'color', rgb) } })};

/**
 * The dark palette over the same scales.
 *
 * Hand-written upstream rather than derived: \`packages/design-tokens/palette.js\`
 * assigns every grey the dark value of its MAJORITY role, because the grey scale is
 * not semantic -- \`grey-100\` is a page surface and white text on the brand red.
 * An inverted scale would break half of those uses.
 */
export const DARK_TOKENS: StyleTokens = ${render({ ...shared, colors: { ...KEYWORD_COLORS, ...scale(dark, 'color', rgb) } })};

/**
 * The palette for the scheme the user is actually looking at.
 *
 * Read once, at startup. \`configureStyle\` installs a module-level scale and the
 * sheet mints a class per declaration set, so re-configuring mid-session would
 * change what NEW classes resolve to while every widget already on screen kept the
 * class it was given. A scheme change therefore needs a restart on this host, and
 * that limit is named in apps/desktop/README.md rather than left to be discovered.
 */
export const tokensFor = (isDark: boolean): StyleTokens => (isDark ? DARK_TOKENS : LIGHT_TOKENS);
`;

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, source);
console.log(`generate-tokens: wrote ${OUT}`);
console.log(
  `  spacing ${Object.keys(spacing).length} . colors ${Object.keys(scale(theme, 'color')).length} . radius ${Object.keys(borderRadius).length} . text ${Object.keys(shared.fontSize).length}`,
);
