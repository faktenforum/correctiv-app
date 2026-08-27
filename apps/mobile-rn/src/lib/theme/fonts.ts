/**
 * Font families. One loaded family per cut, which works around Android ignoring
 * fontWeight on custom fonts. Merriweather (articles and headlines) and Source
 * Sans 3 (UI) come from @expo-google-fonts.
 */
import { Merriweather_400Regular, Merriweather_700Bold } from '@expo-google-fonts/merriweather';
import {
  SourceSans3_400Regular,
  SourceSans3_600SemiBold,
  SourceSans3_700Bold,
} from '@expo-google-fonts/source-sans-3';

/** Passed to useFonts() — loads every cut before the first render. */
export const fontAssets = {
  Merriweather_400Regular,
  Merriweather_700Bold,
  SourceSans3_400Regular,
  SourceSans3_600SemiBold,
  SourceSans3_700Bold,
};

export type FontFamily = 'serif' | 'sans';
export type FontWeightName = 'normal' | 'semibold' | 'bold';

const FAMILY_MAP: Record<FontFamily, Partial<Record<FontWeightName, string>>> = {
  serif: { normal: 'Merriweather_400Regular', bold: 'Merriweather_700Bold' },
  sans: {
    normal: 'SourceSans3_400Regular',
    semibold: 'SourceSans3_600SemiBold',
    bold: 'SourceSans3_700Bold',
  },
};

/** The loaded family name for a family and weight. */
export function fontFamilyFor(family: FontFamily, weight: FontWeightName = 'normal'): string {
  const byWeight = FAMILY_MAP[family];
  return byWeight[weight] ?? byWeight.normal!;
}

/**
 * The regular cut per family — what `font-serif` and `font-sans` resolve to.
 *
 * The token bridge used to generate this, and it stayed behind in the app when the
 * bridge became @correctiv/design-tokens: a family name only means something to a
 * runtime that has loaded that font. `Merriweather_400Regular` is a React Native
 * asset name and would be nonsense to the CMS, which resolves the same two
 * typefaces through the CSS stacks in theme.css. Its counterpart is the `fontFamily`
 * entry the generator still writes into tailwind.tokens.generated.js — same two
 * values, and that generator says the same thing next to them.
 */
export const fontFamily = {
  serif: fontFamilyFor('serif'),
  sans: fontFamilyFor('sans'),
} as const;
