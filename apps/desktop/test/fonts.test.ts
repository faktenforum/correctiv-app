/**
 * The brand faces: one table, three readers, and they must agree.
 *
 * `src/style/fonts.ts` says which loaded-family name is which family and weight.
 * `scripts/stage-fonts.mjs` copies exactly those files into `data/fonts/`. The shim
 * resolves `fontFamily` through the same table. And the NAMES come from a fourth
 * place that knows nothing about any of it: `FAMILY_MAP` in
 * `apps/mobile/src/lib/theme/fonts.ts`, which the phone and the web target share.
 *
 * WHY THIS IS ASSERTED IN BOTH DIRECTIONS. Neither direction of drift reports itself:
 *
 *   - a name the app can produce and the table does not carry is a **substituted
 *     typeface**. Pango does not report a missing family — `set_family()` against a
 *     map that never got the file resolves to the default sans, the window draws, the
 *     process exits 0, and the app is simply wearing the wrong face;
 *   - a table entry no name reaches is a face that ships, and is paid for in bytes and
 *     in a licence obligation, for nothing.
 *
 * The phone's file is read as TEXT rather than imported, deliberately. It imports
 * `@expo-google-fonts/*` for the asset ids, which this host shims away and a test has
 * no shim for — and a second independent reading is the mechanism here anyway. It is
 * the same trade `tokens.test.ts` makes.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { cssFontFamily, FONT_CUTS, FONT_FAMILIES, fontCutFor } from '../src/style/fonts.js';

const APP = resolve(import.meta.dirname, '..');
const PHONE_FONTS = resolve(APP, '..', 'mobile', 'src', 'lib', 'theme', 'fonts.ts');

/**
 * The loaded-family names `fontFamilyFor()` can return, read out of the phone's
 * `FAMILY_MAP` block.
 *
 * Scoped to that block rather than to the whole file: the same names also appear as
 * `import` bindings and as `fontAssets` keys, so a file-wide sweep would pass even if
 * `FAMILY_MAP` had stopped naming one of them — which is the case this exists to catch.
 */
function namesTheAppCanProduce(): string[] {
  const source = readFileSync(PHONE_FONTS, 'utf8');
  const start = source.indexOf('const FAMILY_MAP');
  expect(start, 'FAMILY_MAP in apps/mobile/src/lib/theme/fonts.ts').toBeGreaterThan(-1);
  const end = source.indexOf('\n};', start);
  expect(end, 'the end of the FAMILY_MAP block').toBeGreaterThan(start);
  const block = source.slice(start, end);
  const names = new Set<string>();
  for (const match of block.matchAll(/'([A-Za-z][A-Za-z0-9]*_\d{3}[A-Za-z]+)'/g)) {
    names.add(match[1]!);
  }
  return [...names].sort();
}

describe('the brand faces', () => {
  it('carries every loaded-family name the app can produce', () => {
    expect(Object.keys(FONT_CUTS).sort()).toEqual(namesTheAppCanProduce());
  });

  it('carries no name the app cannot produce', () => {
    // The same equality from the other side, spelled separately so a failure says
    // WHICH direction drifted rather than just "these two lists differ".
    const produced = new Set(namesTheAppCanProduce());
    expect(Object.keys(FONT_CUTS).filter((name) => !produced.has(name))).toEqual([]);
  });

  it('names two families and no more', () => {
    // Not a style rule: every family is a licence obligation and a payload cost, and
    // the design system has exactly two. A third arriving unremarked is the thing to
    // notice.
    expect([...FONT_FAMILIES].sort()).toEqual(['Merriweather', 'Source Sans 3']);
  });

  it('resolves every face to a real file', () => {
    for (const [name, cut] of Object.entries(FONT_CUTS)) {
      const path = require.resolve(cut.source, { paths: [APP] });
      expect(existsSync(path), `${name} -> ${cut.source}`).toBe(true);
      expect(statSync(path).size, `${name} is not empty`).toBeGreaterThan(0);
    }
  });

  it('gives every face a distinct basename', () => {
    // Two faces sharing a basename would stage as one file, and the one that did not
    // ship is a substituted typeface rather than an error. The staging script refuses
    // it; this says the table never gets there.
    const leaves = Object.values(FONT_CUTS).map((cut) => basename(cut.source));
    expect(new Set(leaves).size).toBe(leaves.length);
  });

  it('stages exactly the declared faces, and a licence for each family', () => {
    execFileSync('node', ['scripts/stage-fonts.mjs'], { cwd: APP, stdio: 'pipe' });
    const staged = readdirSync(resolve(APP, 'data', 'fonts')).sort();
    const faces = Object.values(FONT_CUTS)
      .map((cut) => basename(cut.source))
      .sort();
    expect(staged.filter((entry) => entry.endsWith('.ttf'))).toEqual(faces);
    // One licence text per PACKAGE the faces come from, because SIL OFL 1.1 requires
    // the licence to travel with them.
    expect(staged.filter((entry) => /LICEN[CS]E|OFL/i.test(entry)).length).toBe(
      FONT_FAMILIES.length,
    );
  });

  it('quotes a family GTK would otherwise refuse', () => {
    // The measured failure: `font-family: Source Sans 3` in a generated rule is a
    // sequence of identifiers, GTK refuses the WHOLE rule, and the uncaught
    // `StyleSheetError` takes the screen. A one-word family is fine unquoted, which is
    // why it is the case that hides this.
    //
    // Both directions are asserted because both are wrong in a way nothing reports: an
    // unquoted multi-word family kills the screen, and a quoted keyword stops being a
    // keyword.
    expect(cssFontFamily('Source Sans 3')).toBe("'Source Sans 3'");
    expect(cssFontFamily('Merriweather')).toBe('Merriweather');
    // Every family this app registers must survive the round trip.
    for (const family of FONT_FAMILIES) {
      const value = cssFontFamily(family);
      expect(value.includes(' ') ? value.startsWith("'") && value.endsWith("'") : true).toBe(true);
    }
  });

  it('answers only for a name it carries', () => {
    expect(fontCutFor('SourceSans3_700Bold')).toEqual({
      family: 'Source Sans 3',
      weight: 700,
      source: '@expo-google-fonts/source-sans-3/700Bold/SourceSans3_700Bold.ttf',
    });
    // A system family is not an error — the shim reports it and passes it through,
    // because this host cannot promise what Pango does with a name it did not stage.
    expect(fontCutFor('Cantarell')).toBeUndefined();
    // And `undefined` must come from the table, not from a prototype lookup.
    expect(fontCutFor('toString')).toBeUndefined();
    expect(fontCutFor('constructor')).toBeUndefined();
  });
});
