// The app's loaded-family names, and the two axes GTK actually has behind each.
//
// ## Why this is a map and not a pass-through
//
// `lib/theme/fonts.ts` names one loaded family per CUT — `Merriweather_700Bold`, not
// `Merriweather` at weight 700 — and says why: Android ignores `fontWeight` on a
// custom font, so the weight has to travel inside the family name. The consequence
// reaches here: `buildStyle()` in `lib/theme/typography.ts` emits `fontFamily` and
// **no `fontWeight` at all**, for every one of the typography variants.
//
// Pango has never heard of those names. A `.ttf` handed to a font map declares its
// own family and its own weight, and `Merriweather_700Bold` is neither — so asking
// for it gets the default sans back. That is the failure this file exists to make
// impossible, and it is worth spelling out because it does not look like a failure:
// Pango does not report a missing family. The window draws, the text is legible and
// correctly laid out, the process exits 0, and the app is wearing the wrong typeface.
//
// So each name is split back into the family and the weight. The values are read off
// the files with `fc-query`, not derived from their names:
//
//   Merriweather_400Regular   Merriweather     Regular   400
//   Merriweather_700Bold      Merriweather     Bold      700
//   SourceSans3_400Regular    Source Sans 3    Regular   400
//   SourceSans3_600SemiBold   Source Sans 3    SemiBold  600
//   SourceSans3_700Bold       Source Sans 3    Bold      700
//
// Note `Source Sans 3` carries spaces, and that is not a cosmetic detail. The first
// version of this comment claimed the family reaches GTK as a widget property, so no
// quoting question arose. It does not: it is written into a generated CSS rule, and
// `font-family: Source Sans 3` makes GTK refuse the whole rule. The shim quotes it
// until gjsify #1539 does so in the emitter. The family is stored as data here for
// the same reason — it cannot be reconstructed from the asset name.
//
// ## One table, three readers
//
// This table is the single source of truth for three things that must agree, and
// the whole point is that they cannot drift apart silently:
//
//   1. `scripts/stage-fonts.mjs` stages exactly these files into `data/fonts/`.
//   2. `shims/react-native.tsx` resolves `fontFamily` through `fontCutFor()`.
//   3. `test/fonts.test.ts` asserts the table against `lib/theme/fonts.ts` in BOTH
//      directions — every name the app can produce is here, and every entry here is
//      a name the app can produce.
//
// Direction 2 of that test is the one that earns its keep. A missing entry is a
// substituted typeface, which nothing reports; a surplus entry is a face that ships
// for no reason, which nothing reports either.

/** A cut of a family, as GTK expresses it. */
export interface FontCut {
  /** The family Pango knows once the face is registered. */
  readonly family: string;
  /** CSS/React Native numeric weight. */
  readonly weight: number;
  /**
   * The face, as a specifier resolvable from `node_modules`. The staging script
   * resolves it and copies it under its basename; nothing at runtime reads it.
   */
  readonly source: string;
}

/**
 * Loaded-family name -> the cut behind it.
 *
 * Keys are the values `fontFamilyFor()` can return, and that set is closed: it is
 * the union of `FAMILY_MAP`'s entries in `lib/theme/fonts.ts`.
 */
export const FONT_CUTS: Readonly<Record<string, FontCut>> = {
  Merriweather_400Regular: {
    family: 'Merriweather',
    weight: 400,
    source: '@expo-google-fonts/merriweather/400Regular/Merriweather_400Regular.ttf',
  },
  Merriweather_700Bold: {
    family: 'Merriweather',
    weight: 700,
    source: '@expo-google-fonts/merriweather/700Bold/Merriweather_700Bold.ttf',
  },
  SourceSans3_400Regular: {
    family: 'Source Sans 3',
    weight: 400,
    source: '@expo-google-fonts/source-sans-3/400Regular/SourceSans3_400Regular.ttf',
  },
  SourceSans3_600SemiBold: {
    family: 'Source Sans 3',
    weight: 600,
    source: '@expo-google-fonts/source-sans-3/600SemiBold/SourceSans3_600SemiBold.ttf',
  },
  SourceSans3_700Bold: {
    family: 'Source Sans 3',
    weight: 700,
    source: '@expo-google-fonts/source-sans-3/700Bold/SourceSans3_700Bold.ttf',
  },
};

/** The families this app registers, deduplicated — what Pango should end up knowing. */
export const FONT_FAMILIES: readonly string[] = [
  ...new Set(Object.values(FONT_CUTS).map((cut) => cut.family)),
];

/**
 * A family name as it must appear in a generated GTK CSS rule.
 *
 * A WORKAROUND WITH A REMOVAL TRIGGER, and it lives here rather than inline in the
 * shim so that a test can hold it. `@gjsify/gtk-host`'s style layer writes the value
 * into the rule verbatim, and in CSS a family of more than one word is a sequence of
 * identifiers — so `font-family: Source Sans 3` makes GTK refuse the WHOLE rule
 * ("Junk at end of value for font-family"), the layer's own `assertContained` guard
 * throws `StyleSheetError`, and no React boundary catches it. The screen is gone.
 *
 * Measured on GJS with both families verifiably on Pango's font map, so the fault is
 * the CSS and not the font. `Merriweather` needs no quoting, which is exactly why the
 * one-word case is the one that hides this.
 *
 * fixed upstream in gjsify: #1539 quotes it in the emitter, where it belongs, and
 * leaves an already-quoted value alone — so this stays harmless until the next bump
 * removes it and the test below with it.
 */
export function cssFontFamily(family: string): string {
    return family.includes(' ') ? `'${family}'` : family;
}

/**
 * The cut behind a loaded-family name, or `undefined` when the name is not one of
 * this app's.
 *
 * `undefined` is not an error: a caller may legitimately name a system family. It
 * means "this host cannot promise what Pango will do with it", which is a different
 * statement from "this is wrong", and the shim reports it as such.
 */
export function fontCutFor(name: string): FontCut | undefined {
  return Object.hasOwn(FONT_CUTS, name) ? FONT_CUTS[name] : undefined;
}
