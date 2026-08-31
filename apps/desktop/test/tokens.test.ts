/**
 * The generated token scales must match `packages/design-tokens/theme.css`.
 *
 * The repo's own rule for generated artefacts: "Drift is a failed PR, not a discovery"
 * (ADR 0010). `apps/mobile/__tests__/tokens.test.ts` regenerates its four artefacts and
 * byte-compares them; this does the same for the one this host adds.
 *
 * It also restores the committed bytes afterwards — for the reason that file gives, and
 * it is a good one: a check that REPAIRS what it reports would go green on the next run
 * with nothing done about it.
 *
 * Two properties are asserted beyond the byte comparison, because they are the two the
 * generator exists to guarantee and neither is visible in a diff:
 *
 *   - every spacing and radius value is a whole pixel, since those reach GTK as `gint`
 *     device pixels with no unit conversion (a `rem` there is a named error, and a
 *     fractional px would be rounded silently);
 *   - no token name is reachable from two scales that one utility family reads, which
 *     L1 refuses by name rather than picking.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { afterAll, describe, expect, it } from 'vitest';

import { DARK_TOKENS, LIGHT_TOKENS } from '../src/generated/tokens.generated.js';

const APP = resolve(__dirname, '..');
const GENERATED = resolve(APP, 'src', 'generated', 'tokens.generated.ts');

const committed = readFileSync(GENERATED, 'utf8');

afterAll(() => {
  writeFileSync(GENERATED, committed);
});

describe('the generated token scales', () => {
  it('is byte-identical to what the generator produces now', () => {
    execFileSync('node', [resolve(APP, 'scripts', 'generate-tokens.mjs')], { cwd: APP });
    expect(readFileSync(GENERATED, 'utf8')).toBe(committed);
  });

  it('spells every spacing and radius value in whole device pixels', () => {
    for (const [name, scale] of [
      ['spacing', LIGHT_TOKENS.spacing],
      ['borderRadius', LIGHT_TOKENS.borderRadius],
    ] as const) {
      for (const [token, value] of Object.entries(scale ?? {})) {
        // The failing token is put IN the compared value rather than in a message
        // argument: vitest takes a second argument, oxlint's jest rule does not, and
        // a bare `expect(value).toMatch(...)` failure would name neither the scale nor
        // the token.
        expect(`${name}.${token}=${value}`).toMatch(/=-?\d+(px)?$/);
      }
    }
  });

  it('carries the Tailwind defaults the app relies on and @theme does not declare', () => {
    // Measured against the app's own class vocabulary: `inset-0`/`left-0`/`right-0`/
    // `top-0` need spacing `0` (6 uses), `rounded-full` needs radius `full` (12), and
    // `bg-transparent` needs colour `transparent`. Each was a named throw before the
    // generator carried it, which is a correct refusal answering the wrong question.
    expect(LIGHT_TOKENS.spacing?.['0']).toBe('0px');
    expect(LIGHT_TOKENS.borderRadius?.full).toBeDefined();
    expect(LIGHT_TOKENS.colors?.transparent).toBe('transparent');
    expect(LIGHT_TOKENS.opacity?.['40']).toBeDefined();
  });

  it('keeps no token name in two scales one family reads', () => {
    // `text-*` reads fontSize AND colors; `border-*` reads borderWidth AND colors;
    // `font-*` reads fontWeight AND fontFamily. A name in both halves makes the
    // utility ambiguous, and L1 refuses it by name rather than choosing.
    const pairs: Array<readonly [string, object | undefined, string, object | undefined]> = [
      ['fontSize', LIGHT_TOKENS.fontSize, 'colors', LIGHT_TOKENS.colors],
      ['borderWidth', LIGHT_TOKENS.borderWidth, 'colors', LIGHT_TOKENS.colors],
      ['fontWeight', LIGHT_TOKENS.fontWeight, 'fontFamily', LIGHT_TOKENS.fontFamily],
    ];
    for (const [leftName, left, rightName, right] of pairs) {
      const shared = Object.keys(left ?? {}).filter((key) => key in (right ?? {}));
      // Same reason as above: the scale names travel in the compared value.
      expect(shared.map((key) => `${leftName}+${rightName}: ${key}`)).toEqual([]);
    }
  });

  it('differs from the light palette only in its colours', () => {
    // The dark half is the app's hand-written palette (`packages/design-tokens/palette.js`
    // assigns every grey the dark value of its MAJORITY role, because the grey scale is
    // not semantic). Everything else is one scale shared by both, and a divergence
    // would mean the generator had started deriving something it should be copying.
    const { colors: lightColors, ...lightRest } = LIGHT_TOKENS;
    const { colors: darkColors, ...darkRest } = DARK_TOKENS;
    expect(darkRest).toEqual(lightRest);
    expect(darkColors).not.toEqual(lightColors);
    expect(Object.keys(darkColors ?? {})).toEqual(Object.keys(lightColors ?? {}));
  });
});
