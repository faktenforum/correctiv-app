/**
 * Token-Brücke: stellt sicher, dass die committeten Generate noch zu den
 * Quell-Tokens passen. Erkennt Drift, wenn jemand wp-design-tokens ändert,
 * aber `npm run tokens` vergisst — oder ein Generat von Hand editiert.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import { colors, spacingPx } from '../src/lib/theme/tokens.generated';

const ROOT = resolve(__dirname, '..');

function read(rel: string): string {
  return readFileSync(resolve(ROOT, rel), 'utf8');
}

/** Same upward search the generator uses — see scripts/generate-tokens.mjs. */
function findThemeCss(from: string): string | null {
  for (let dir = from; ; dir = dirname(dir)) {
    const candidate = resolve(dir, 'wp-design-tokens/css/theme.css');
    if (existsSync(candidate)) return candidate;
    if (dirname(dir) === dir) return null;
  }
}

/**
 * The drift check needs the SOURCE tokens, and wp-design-tokens is a separate
 * repo that is only present as a sibling checkout — CI does not have it, because
 * the generated files are committed instead. So this one test runs where the
 * source exists (every developer machine, i.e. where drift is actually
 * introduced) and reports itself as skipped where it does not.
 *
 * It is skipped LOUDLY on purpose: a check that quietly disappears is worse than
 * no check. The two assertions below need no source and always run, so token
 * VALUES stay guarded even in CI.
 *
 * Making this unconditional requires deciding how wp-design-tokens enters this
 * repo (submodule, dependency, or vendoring the three CSS files) — see
 * adr/0004-react-native-pivot.md, "Offen".
 */
const THEME_CSS = findThemeCss(ROOT);
if (!THEME_CSS) {
  console.warn(
    '\n[tokens.test] SKIPPING the drift check: wp-design-tokens not found in any parent\n' +
      '              directory. Token VALUES are still asserted. See ADR 0004.\n',
  );
}
const itWithSource = THEME_CSS ? it : it.skip;

describe('Token-Brücke', () => {
  itWithSource('generierte Dateien sind aktuell (kein Drift gegenüber theme.css)', () => {
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
