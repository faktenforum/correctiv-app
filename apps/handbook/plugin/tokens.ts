import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { Plugin } from 'vite';

import { ROOT } from './collect';

const MODULE_ID = 'virtual:tokens.css';
const SOURCE = 'packages/design-tokens/theme.css';

/**
 * Roles the handbook paints with, and the name each has in the token package.
 *
 * Only the semantic tier is taken. The primitives resolve in the package too, but
 * they do not follow the colour scheme, and a handbook page has no business
 * pinning a colour to light: the one thing this site is for is reading, in
 * whichever scheme the reader has chosen.
 */
const ROLES: Record<string, string> = {
  canvas: 'canvas',
  surface: 'surface',
  'on-canvas': 'on-canvas',
  'on-canvas-muted': 'on-canvas-muted',
  stroke: 'stroke',
  'stroke-strong': 'stroke-strong',
  accent: 'accent',
  'accent-alt': 'accent-alternative',
};

/**
 * Two colours that must NOT follow the scheme, and are therefore written here.
 *
 * Text on the brand red and text on the club yellow: the ground is the same in
 * both schemes, so the ink has to be too. The app spells this case
 * `always-light` / `always-dark`; the token package has no name for it, which is
 * the boundary ADR 0022 describes rather than an omission to tidy.
 */
const FIXED: Record<string, string> = {
  'on-accent': '#ffffff',
  'on-accent-alt': '#333333',
};

type Palette = Record<string, string>;

/**
 * Reads one `@variant` block's colour declarations out of the generated theme.
 *
 * Brace-counted rather than matched with a regex, because the block contains
 * nested at-rules and a non-greedy `{(.*?)}` stops at the first inner closing
 * brace, which yields a palette that is short by however many nested rules
 * precede the colours. That failure is quiet: the emitted stylesheet still
 * parses, and the missing roles simply fall back to whatever they inherit.
 */
function variantBlock(css: string, variant: 'light' | 'dark'): Palette {
  const start = css.indexOf(`@variant ${variant}`);
  if (start === -1) throw new Error(`${SOURCE} has no "@variant ${variant}" block`);

  let depth = 0;
  let end = -1;
  for (let i = css.indexOf('{', start); i < css.length; i += 1) {
    if (css[i] === '{') depth += 1;
    else if (css[i] === '}') {
      depth -= 1;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  if (end === -1) throw new Error(`${SOURCE}'s "@variant ${variant}" block is unterminated`);

  const palette: Palette = {};
  for (const [, name, value] of css
    .slice(start, end)
    .matchAll(/--color-([a-z0-9-]+)\s*:\s*([^;]+);/g)) {
    palette[name] = value.trim();
  }
  return palette;
}

function declarations(palette: Palette, indent: string): string {
  return Object.entries(ROLES)
    .map(([local, upstream]) => {
      const value = palette[upstream];
      if (!value) throw new Error(`${SOURCE} defines no --color-${upstream}`);
      return `${indent}--${local}: ${value};`;
    })
    .join('\n');
}

export function tokenCss(css: string): string {
  const light = variantBlock(css, 'light');
  const dark = variantBlock(css, 'dark');

  return `/* Generated from ${SOURCE} by apps/handbook/plugin/tokens.ts. Do not edit.
   The handbook is a third consumer of the token package, after the app and the
   CORRECTIV WordPress CMS. Copying these values here by hand would fork the
   palette on the first change, and the fork would be the one on the website. */

:root {
  color-scheme: light dark;
${declarations(light, '  ')}
${Object.entries(FIXED)
  .map(([name, value]) => `  --${name}: ${value};`)
  .join('\n')}
  --sans: ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  --mono: ui-monospace, SFMono-Regular, Menlo, monospace;
}

/* The default setting is "system", which stamps no attribute, so this block is
   what most readers get. Guarded so an explicit light choice still wins here. */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme='light']) {
${declarations(dark, '    ')}
  }
}

/* And again under the attribute, so the toggle wins in both directions. */
:root[data-theme='dark'] {
${declarations(dark, '  ')}
}

:root[data-theme='light'] {
${declarations(light, '  ')}
}
`;
}

/**
 * Serves the palette, generated from the token package rather than copied.
 *
 * ADR 0010 makes `packages/design-tokens` the one place colour is decided, and
 * ADR 0022 puts the roles this site uses in its semantic tier. So the handbook
 * reads them. The alternative, a hand-written block of hex values in a
 * stylesheet here, was written first and had three of them wrong within the hour:
 * `surface` and `stroke-strong` were near misses, and the brand red was flatly
 * wrong, because the dark scheme lightens it to `#ff6173` for contrast on a dark
 * ground and a copy had kept the light value.
 */
export function tokensPlugin(): Plugin {
  const source = join(ROOT, SOURCE);

  return {
    name: 'handbook-tokens',

    resolveId(id) {
      return id === MODULE_ID ? `\0${MODULE_ID}` : null;
    },

    load(id) {
      if (id !== `\0${MODULE_ID}`) return null;
      this.addWatchFile(source);
      return tokenCss(readFileSync(source, 'utf8'));
    },
  };
}
