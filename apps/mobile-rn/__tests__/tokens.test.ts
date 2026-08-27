/**
 * The token bridge: makes sure the committed artefacts still match the source
 * tokens. Catches drift when someone changes wp-design-tokens and forgets
 * `npm run tokens` — or edits a generated file by hand.
 *
 * The bridge itself lives in @correctiv/design-tokens, so that the CMS can consume
 * the same values; the check stays here, because this app is the consumer that
 * would show the damage, and because this is the suite CI already runs. All three
 * four artefacts belong to the package now — nothing is written into this app since
 * the move to Uniwind, because a Tailwind v4 theme is CSS and CSS is portable.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { colors, colorsDark, spacingPx } from '@correctiv/design-tokens/tokens.generated';
// Resolves the vendored tokens/ and nothing else — see scripts/tokens-source.mjs.
import { themeCssPath } from '../../../scripts/tokens-source.mjs';

/** This app. */
const APP = resolve(__dirname, '..');
/** The package that owns the generator and every artefact it writes. */
const TOKENS_PKG = resolve(APP, '../../packages/design-tokens');

function read(root: string, rel: string): string {
  return readFileSync(resolve(root, rel), 'utf8');
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
    const before = {
      // The Tailwind v4 theme this app imports…
      theme: read(TOKENS_PKG, 'theme.css'),
      // …and the variant-carrying twin a consumer outside this repo imports, so
      // drift here is drift in what the CMS would get.
      standalone: read(TOKENS_PKG, 'theme.standalone.css'),
      ts: read(TOKENS_PKG, 'src/tokens.generated.ts'),
      reader: read(TOKENS_PKG, 'src/reader.generated.ts'),
    };
    execFileSync('node', ['scripts/generate.mjs'], { cwd: TOKENS_PKG, stdio: 'pipe' });
    expect(read(TOKENS_PKG, 'theme.css')).toBe(before.theme);
    expect(read(TOKENS_PKG, 'theme.standalone.css')).toBe(before.standalone);
    expect(read(TOKENS_PKG, 'src/tokens.generated.ts')).toBe(before.ts);
    expect(read(TOKENS_PKG, 'src/reader.generated.ts')).toBe(before.reader);
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
