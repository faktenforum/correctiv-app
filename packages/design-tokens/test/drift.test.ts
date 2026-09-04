import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

// Resolves the vendored tokens/ and nothing else — see scripts/tokens-source.mjs.
import { themeCssPath } from '../../../scripts/tokens-source.mjs';

/**
 * The committed artefacts are what the generator produces right now.
 *
 * Catches an edited artefact and a forgotten `npm run tokens`. Blind, by
 * construction, to a generator that is wrong — then both sides are wrong together
 * and agree, which is what the content assertions in
 * `apps/mobile/__tests__/tokens.test.ts` are for.
 *
 * **This test writes.** It runs the real generator over the real files, because
 * that is the write path a release uses, and puts the committed bytes back
 * afterwards so the run leaves the working tree exactly as it found it. It lives
 * here rather than in the app's jest suite, where it used to, for that reason: a
 * check that rewrites files in another package while that package's own
 * assertions are reading them is a mask waiting to happen, and jest runs its files
 * in parallel workers, so moving it to a second jest file would only have turned
 * the mask into a race. One package, one process, its own files.
 *
 * When this fails, the fix is `npm run tokens` and a commit — never a hand-edit of
 * an artefact, and never a repair from inside the check, which would go green on
 * the next run with nothing done about it.
 */
const PKG = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REPO = resolve(PKG, '../..');

/** All five, so that reading "the artefacts" cannot quietly mean four of them. */
const ARTEFACTS = [
  // The Tailwind v4 theme the app imports…
  'theme.css',
  // …and the variant-carrying twin a consumer outside this repo imports, so drift
  // here is drift in what the CMS would get.
  'theme.standalone.css',
  'src/tokens.generated.ts',
  // The composite ty-* specs. Transcribed by hand until 2026-08-27, which is why
  // they are checked: eleven variants with nothing holding them to the source.
  'src/typography.generated.ts',
  'src/reader.generated.ts',
] as const;

type Artefact = (typeof ARTEFACTS)[number];

function readArtefacts(): Record<Artefact, string> {
  const out = {} as Record<Artefact, string>;
  for (const rel of ARTEFACTS) out[rel] = readFileSync(resolve(PKG, rel), 'utf8');
  return out;
}

/** Read before the generator runs, restored after it. */
const COMMITTED = readArtefacts();

function restoreArtefacts(): void {
  for (const rel of ARTEFACTS) {
    const path = resolve(PKG, rel);
    if (readFileSync(path, 'utf8') !== COMMITTED[rel]) writeFileSync(path, COMMITTED[rel]);
  }
}

describe('the token bridge', () => {
  it('reads the tokens from this repo, not from a foreign checkout', () => {
    // An upward search once found a foreign checkout at a different commit than
    // the repo's own copy; asserting the path is inside the repo forecloses that.
    expect(themeCssPath()).toBe(resolve(REPO, 'tokens/theme.css'));
  });

  it('keeps the generated files current (no drift against theme.css)', () => {
    // Unconditional on purpose. Drift is introduced on developer machines, but it
    // has to be caught on the PR, so this must never skip itself.
    try {
      execFileSync('node', ['scripts/generate.mjs'], { cwd: PKG, stdio: 'pipe' });
      const regenerated = readArtefacts();
      // File by file, so the diff names the artefact that drifted.
      for (const rel of ARTEFACTS) expect(regenerated[rel]).toBe(COMMITTED[rel]);
    } finally {
      restoreArtefacts();
    }
  });
});
