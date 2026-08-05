/**
 * Token-Brücke: stellt sicher, dass die committeten Generate noch zu den
 * Quell-Tokens passen. Erkennt Drift, wenn jemand wp-design-tokens ändert,
 * aber `npm run tokens` vergisst — oder ein Generat von Hand editiert.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { colors, spacingPx } from '../src/lib/theme/tokens.generated';
// Resolves the vendored tokens/ and nothing else — see scripts/tokens-source.mjs.
import { themeCssPath } from '../../../scripts/tokens-source.mjs';

const ROOT = resolve(__dirname, '..');

function read(rel: string): string {
  return readFileSync(resolve(ROOT, rel), 'utf8');
}

/**
 * The drift check used to skip itself wherever the token source was missing,
 * because wp-design-tokens was a sibling checkout that CI did not have. The
 * tokens are vendored into tokens/ now, so the source is present everywhere and
 * this check is unconditional — which is the point: drift is introduced on
 * developer machines, but it has to be *caught* on the PR.
 */
describe('Token-Brücke', () => {
  it('liest die Tokens aus dem Repo, nicht aus einem Fremd-Checkout', () => {
    // An upward search once found a foreign checkout at a different commit than
    // the repo's own copy; asserting the path is inside the repo forecloses that.
    expect(themeCssPath()).toBe(resolve(ROOT, '../../tokens/theme.css'));
  });

  it('generierte Dateien sind aktuell (kein Drift gegenüber theme.css)', () => {
    const before = {
      tw: read('tailwind.tokens.generated.js'),
      ts: read('src/lib/theme/tokens.generated.ts'),
      css: read('src/lib/theme/readerCss.generated.ts'),
    };
    execFileSync('node', ['scripts/generate-tokens.mjs'], { cwd: ROOT, stdio: 'pipe' });
    expect(read('tailwind.tokens.generated.js')).toBe(before.tw);
    expect(read('src/lib/theme/tokens.generated.ts')).toBe(before.ts);
    expect(read('src/lib/theme/readerCss.generated.ts')).toBe(before.css);
  });

  it('Kernfarben der Marke sind korrekt abgebildet', () => {
    expect(colors.emphasis).toBe('#ff5064'); // Journalismus-Rot
    expect(colors.alternative).toBe('#fde162'); // Club-Gelb
    expect(colors['grey-700']).toBe('#333333'); // Fließtext
  });

  it('Spacing-T-Shirt-Skala ist in px aufgelöst', () => {
    expect(spacingPx.m).toBe(24); // 1.5rem
    expect(spacingPx.xs).toBe(8); // 0.5rem
  });
});
