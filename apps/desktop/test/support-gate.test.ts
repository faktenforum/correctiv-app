/**
 * The build-time support gate, reproduced in this repository.
 *
 * `gjsify build --dialect react-native` composes a gate that fails a build on an
 * import whose ADR 0032 support-table status is not supported/partial. This host does
 * not use that flag — `gjsify.config.mjs` explains why: the flag's alias plugin is
 * `pre`, so it would win over the redirect to `src/shims/react-native.tsx`, and that
 * shim is what answers the 110 refused props the app passes.
 *
 * Giving up the gate would be the wrong half of that trade, so it is reproduced here,
 * against the SAME published table the gate reads
 * (`@gjsify/react-native/support-table`). Two things this version does that the
 * original cannot:
 *
 *   - it runs in `npm run check`, in about a second, with no GTK and no build;
 *   - it reads the app's source, so it fails when a SCREEN grows an unsupported
 *     import, which is where the change will actually come from.
 *
 * What it does NOT cover: props. A refused prop is a render-time refusal per screen,
 * and `npm run route-sweep` is what opens every route and reads the log for one.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { isImportable, SUPPORT_TABLE } from '@gjsify/react-native/support-table';

const MOBILE_SRC = resolve(__dirname, '..', '..', 'mobile', 'src');
const DESKTOP_SRC = resolve(__dirname, '..', 'src');

/**
 * Names the app imports from `react-native` that this host answers WITHOUT the
 * support table's blessing, each with the file that does it.
 *
 * One entry, and it is the reason `src/app/artikel.tsx` exists as a variant at all.
 * A second entry here should be argued for, not added: the alternative to a variant
 * is usually a shim, and a shim that fakes a subsystem is worse than a screen that
 * does without it.
 */
const ANSWERED_BY_A_DESKTOP_VARIANT: Readonly<Record<string, string>> = {
  Animated: 'src/app/artikel.tsx renders the reader header without the fade',
};

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return /\.tsx?$/.test(entry) ? [full] : [];
  });
}

/** Every name imported from `react-native`, per file. Type-only imports cost nothing. */
function reactNativeImports(file: string): string[] {
  const source = readFileSync(file, 'utf8');
  const names: string[] = [];
  for (const match of source.matchAll(/import\s*\{([^}]*)\}\s*from\s*'react-native'/g)) {
    for (const raw of match[1]!.split(',')) {
      const name = raw.trim();
      if (name === '' || name.startsWith('type ')) continue;
      names.push(name.split(/\s+as\s+/)[0]!.trim());
    }
  }
  return names;
}

describe('the react-native import surface', () => {
  const files = sourceFiles(MOBILE_SRC);

  it('finds the app to check', () => {
    expect(files.length).toBeGreaterThan(50);
  });

  it('imports only names @gjsify/react-native supports, or ones a variant answers', () => {
    const offenders: string[] = [];
    for (const file of files) {
      for (const name of reactNativeImports(file)) {
        if (isImportable(name)) continue;
        if (name in ANSWERED_BY_A_DESKTOP_VARIANT) continue;
        const entry = SUPPORT_TABLE[name];
        offenders.push(
          `${relative(MOBILE_SRC, file)} imports ${name} — ${entry?.status ?? 'unknown'}` +
            `${entry?.tier ? ` (tier ${entry.tier})` : ''}: ${entry?.reason ?? 'not in the support table'}`,
        );
      }
    }
    expect(offenders).toEqual([]);
  });

  it('keeps the desktop tree itself free of unsupported imports', () => {
    // The desktop sources are ours, so there is no excuse list here at all: a variant
    // is what the excuse list above points AT, and a variant that imports the thing it
    // exists to avoid would be a silent no-op waiting to happen.
    const offenders: string[] = [];
    for (const file of sourceFiles(DESKTOP_SRC)) {
      // The shim is the one file that legitimately names them: it re-exports the whole
      // surface, refusing values included, so `Animated` stays a loud throw.
      if (file.endsWith(join('shims', 'react-native.tsx'))) continue;
      for (const name of reactNativeImports(file)) {
        if (isImportable(name)) continue;
        offenders.push(`${relative(DESKTOP_SRC, file)} imports ${name}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('still needs every name on the variant list', () => {
    // The other direction, and the one that keeps this list honest: when `Animated`
    // lands in @gjsify/react-native, this fails and says so — rather than leaving a
    // hand-written variant in place for ever because nobody re-checked.
    const nowSupported = Object.keys(ANSWERED_BY_A_DESKTOP_VARIANT).filter((name) =>
      isImportable(name),
    );
    // The reason travels in the compared value: vitest takes a message argument and
    // oxlint's jest rule does not, and a bare empty-array failure would name neither
    // the export nor the variant that can now be deleted.
    expect(nowSupported.map((name) => `${name} — ${ANSWERED_BY_A_DESKTOP_VARIANT[name]}`)).toEqual(
      [],
    );
  });
});
