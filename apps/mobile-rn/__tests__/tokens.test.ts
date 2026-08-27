/**
 * The token bridge: makes sure the committed artefacts still match the source
 * tokens. Catches drift when someone changes wp-design-tokens and forgets
 * `npm run tokens` — or edits a generated file by hand.
 *
 * The bridge itself lives in @correctiv/design-tokens, so that the CMS can consume
 * the same values; the check stays here, because this app is the consumer that
 * would show the damage, and because this is the suite CI already runs. All four
 * artefacts belong to the package now — nothing is written into this app since
 * the move to Uniwind, because a Tailwind v4 theme is CSS and CSS is portable.
 *
 * Two kinds of check live here and they catch different things. Keep them apart:
 *
 *   drift        the committed files are what the generator produces right now.
 *                Catches an edited artefact and a forgotten `npm run tokens`;
 *                blind to a generator that is wrong, because then both sides are
 *                wrong together and agree.
 *   content      a specific line is in a specific artefact. Catches exactly the
 *                generator bug drift cannot see.
 *
 * Reading a file is the trap — see the note on COMMITTED.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { colors, colorsDark, spacingPx } from '@correctiv/design-tokens/tokens.generated';
// Resolves the vendored tokens/ and nothing else — see scripts/tokens-source.mjs.
import { themeCssPath } from '../../../scripts/tokens-source.mjs';

/** This app. */
const APP = resolve(__dirname, '..');
/** The package that owns the generator and every artefact it writes. */
const TOKENS_PKG = resolve(APP, '../../packages/design-tokens');

/** All four, so that reading "the artefacts" cannot quietly mean three of them. */
const ARTEFACTS = [
  // The Tailwind v4 theme this app imports…
  'theme.css',
  // …and the variant-carrying twin a consumer outside this repo imports, so drift
  // here is drift in what the CMS would get.
  'theme.standalone.css',
  'src/tokens.generated.ts',
  'src/reader.generated.ts',
] as const;

type Artefact = (typeof ARTEFACTS)[number];

/** The four artefacts as they are on disk at this moment. */
function readArtefacts(): Record<Artefact, string> {
  const out = {} as Record<Artefact, string>;
  for (const rel of ARTEFACTS) out[rel] = readFileSync(resolve(TOKENS_PKG, rel), 'utf8');
  return out;
}

/**
 * The committed artefacts, read ONCE while this module is evaluated — which is
 * before jest runs a single test body in it. Every content assertion below reads
 * this snapshot and never the disk, and that is not tidiness.
 *
 * The drift check runs the real generator, which REWRITES all four files. So when
 * the content assertions read the disk themselves, the ones declared after it were
 * reading a freshly regenerated copy: breaking an artefact by hand turned the drift
 * check red and left them green, and no hand-edit could ever make them fail. Two
 * were added that way and were unfalsifiable from the day they were written. The
 * assertions are still declared after the drift check on purpose — with the
 * snapshot in front of them, order no longer decides anything, and that is the
 * property worth being able to see.
 *
 * Splitting the drift check into a file of its own does NOT fix this: jest runs
 * test files in parallel workers, so the regeneration would land at some arbitrary
 * point in another file's reads — the same mask, now a race, green or red by
 * timing. The side effect has to be kept away from the assertions, not moved.
 */
const COMMITTED = readArtefacts();

/** Puts the committed bytes back under any artefact the generator rewrote. */
function restoreArtefacts(): void {
  for (const rel of ARTEFACTS) {
    const path = resolve(TOKENS_PKG, rel);
    if (readFileSync(path, 'utf8') !== COMMITTED[rel]) writeFileSync(path, COMMITTED[rel]);
  }
}

/**
 * The drift check used to skip itself wherever the token source was missing,
 * because wp-design-tokens was a sibling checkout that CI did not have. The
 * tokens are vendored into tokens/ now, so the source is present everywhere and
 * this check is unconditional — which is the point: drift is introduced on
 * developer machines, but it has to be *caught* on the PR.
 */
describe('token bridge', () => {
  it('reads the tokens from this repo, not from a foreign checkout', () => {
    // An upward search once found a foreign checkout at a different commit than
    // the repo's own copy; asserting the path is inside the repo forecloses that.
    expect(themeCssPath()).toBe(resolve(APP, '../../tokens/theme.css'));
  });

  it('keeps the generated files current (no drift against theme.css)', () => {
    /**
     * The only test here that writes anything. It runs the real generator over the
     * real files, because that is the write path a release uses — and puts the
     * committed bytes back afterwards, so the run leaves the working tree exactly
     * as it found it. Two reasons that matters: a check that repairs what it
     * reports goes GREEN on the next run with nothing done about it, and
     * `npm run check` has no business editing files. When this fails, the fix is
     * `npm run tokens` and a commit.
     */
    try {
      execFileSync('node', ['scripts/generate.mjs'], { cwd: TOKENS_PKG, stdio: 'pipe' });
      const regenerated = readArtefacts();
      // File by file, so the diff names the artefact that drifted.
      for (const rel of ARTEFACTS) expect(regenerated[rel]).toBe(COMMITTED[rel]);
    } finally {
      restoreArtefacts();
    }
  });

  it("clears Tailwind's default radius, so a token cannot collide with a side utility", () => {
    /**
     * Without this line Tailwind v4 also emits a BARE form of each logical side
     * utility — `rounded-s` for the start side — and this scale has a token called
     * `s`. Both rules were emitted and both applied: every Badge, the search field
     * and the duration chip on a video thumbnail had 4px leading corners and 2px
     * trailing ones. Nothing errored, and no assertion about `--radius-s` can catch
     * it, because that token still holds the right value and still emits a correct
     * rule of its own. This is the line that resolves it; the collision comes back
     * silently if it goes.
     *
     * Drift cannot stand in for this: drop the line from the generator and the
     * committed file agrees with the generator again on the next `npm run tokens`.
     */
    expect(COMMITTED['theme.css']).toContain('--radius: initial;');
  });

  it('keeps the standalone theme importable by a plain Tailwind build', () => {
    // `@import` is only valid before other statements, so a conforming
    // preprocessor drops a late one — postcss-import does, and the consumer then
    // gets the variant definitions and none of the tokens, behind a warning.
    const firstRule = COMMITTED['theme.standalone.css'].replace(/\/\*[\s\S]*?\*\//g, '').trim();
    expect(firstRule.startsWith("@import './theme.css';")).toBe(true);
  });

  it('maps the brand core colours correctly', () => {
    expect(colors.emphasis).toBe('#ff5064'); // journalism red
    expect(colors.alternative).toBe('#fde162'); // club yellow
    expect(colors['grey-700']).toBe('#333333'); // body text
  });

  it('resolves the spacing t-shirt scale to px', () => {
    expect(spacingPx.m).toBe(24); // 1.5rem
    expect(spacingPx.xs).toBe(8); // 0.5rem
  });
});

/**
 * Dark mode rests on two promises that are easy to break while editing
 * packages/design-tokens/palette.js — and both break silently: the app compiles,
 * the build is green, and only on a device is there white text on a white
 * background.
 */
describe('two-scheme palette', () => {
  it('keeps the role colours identical in both schemes', () => {
    // Otherwise their name is a lie: they sit on surfaces that do not switch
    // themselves — the brand red, the club yellow, a photograph.
    for (const role of ['always-light', 'always-dark'] as const) {
      expect(colorsDark[role]).toBe(colors[role]);
    }
  });

  it('actually switches surfaces and text', () => {
    // Catches a fallback to the placeholder dark block in theme.css, which carries
    // the light values and would produce a dark mode that is not one.
    expect(colorsDark['grey-100']).not.toBe(colors['grey-100']); // page surface
    expect(colorsDark['grey-700']).not.toBe(colors['grey-700']); // body text
    expect(colorsDark.emphasis).not.toBe(colors.emphasis);
  });

  it('keeps body text clear of the page surface in both schemes', () => {
    // The mix-up a non-semantic scale invites: grey-100 is a surface, grey-700 is
    // text. Assign the dark values the same way round and the text ends up at
    // surface brightness — legible only with a magnifier.
    for (const scheme of [colors, colorsDark]) {
      expect(
        Math.abs(brightness(scheme['grey-700']) - brightness(scheme['grey-100'])),
      ).toBeGreaterThan(0.5);
    }
  });
});

/** Perceived brightness, 0…1, roughly per ITU-R BT.601. */
function brightness(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}
