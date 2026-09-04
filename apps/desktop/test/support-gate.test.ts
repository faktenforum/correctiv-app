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
 *
 * ## The prop hole, and what closes it
 *
 * That gap is not theoretical, and it is the most expensive thing about this host.
 * `(tabs)/profil.tsx` grew three `<Typo onPress>` rows; the layer refuses `onPress` on
 * a `Gtk.Label`, correctly, and because the tab stack mounts all five tabs from `/` the
 * uncaught `PrimitiveError` ended the whole tree — Home captured 12 848 bytes where it
 * had captured 92 125. This test was green through all of it, so was the typecheck, and
 * so was the build. The only thing that said anything was a screenshot.
 *
 * The named next step was `@gjsify/react-native/prop-table`, and **it publishes now**
 * (verified in 0.47.0: `./prop-table` is among the package's export subpaths). It
 * exposes the layer's per-prop answers as DATA the way `support-table` already exposes
 * the per-import ones, and `explainProp(primitive, prop)` returns exactly the assertion
 * a consumer makes — `null` when the prop renders, the sentence a render would print
 * when it does not.
 *
 * So the hole is closable here, in a second, with no GTK. What it still needs is the
 * other half of the question: this app's shim ANSWERS 110 of the props the layer
 * refuses, so a test asserting `explainProp(...) === null` on the app's source would
 * fail on every one of them. The set the shim answers has to become data first — it is
 * a prose table in `src/shims/react-native.tsx`'s header today — and then this file can
 * assert the difference. Until then `npm run route-sweep` is the only oracle, and it
 * needs a GTK session, a built bundle and an admitted profile.
 * ([ADR 0023](../../../adr/0023-re-exported-screens-and-a-variant-where-the-host-refuses.md))
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
 *
 * The REASON for this one changed on 2026-09-03 even though the name did not, and the
 * assertion at the bottom of this file is what forced the re-check. `Animated` was a
 * refusing export until @gjsify/react-native 0.46; 0.46 implements the three names
 * this app uses, that assertion went red, and the variant was deleted for a re-export
 * — which then failed to render, because an `Animated.View` child does not make its
 * parent a `Gtk.Overlay` the way a `View` child does, and the phone's overlay header
 * is `absolute`. So the variant came back for a narrower reason. See its header.
 *
 * That is the shape this list is meant to have: a name here means "the host cannot do
 * this yet", and the check below asks the layer rather than trusting the note.
 */
const ANSWERED_BY_A_DESKTOP_VARIANT: Readonly<
  Record<string, { readonly where: string; readonly importableAnyway?: string }>
> = {
  Animated: {
    where: 'src/app/artikel.tsx renders the reader header without the fade',
    importableAnyway:
      'the three names this app uses landed in 0.46, but an Animated.View child does ' +
      'not make its parent a Gtk.Overlay the way a View child does — four primitives ' +
      'declare overlayOnAbsoluteChild and Animated is not in the table — so the ' +
      "phone's `absolute` overlay header throws. Individually supported, not composable.",
  },
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
    // The other direction, and the one that keeps this list honest. It has already
    // paid for itself once: `Animated` landed in @gjsify/react-native 0.46 and this
    // went red on the upgrade, naming the variant that could go — rather than leaving
    // a hand-written workaround in place for ever because nobody re-checked. The list
    // is empty now, so this passes trivially; it is here for the next entry.
    // A name that has become importable and carries NO `importableAnyway` note is the
    // failure: the layer now exports it, so the variant has to be re-argued or deleted.
    // Writing the note is that re-argument, and it is deliberately a sentence rather
    // than a boolean — `Animated` came back after being deleted, and the sentence is
    // the only place the narrower reason is written down.
    const unargued = Object.entries(ANSWERED_BY_A_DESKTOP_VARIANT)
      .filter(([name]) => isImportable(name))
      .filter(([, entry]) => entry.importableAnyway === undefined);
    // The reason travels in the compared value: vitest takes a message argument and
    // oxlint's jest rule does not, and a bare empty-array failure would name neither
    // the export nor the variant that can now be deleted.
    expect(unargued.map(([name, entry]) => `${name} — ${entry.where}`)).toEqual([]);
  });
});
