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
 * There is deliberately no `font-serif` / `font-sans` utility.
 *
 * Typography never goes through a class in this app: `<Typo>` builds a React Native
 * TextStyle from the token constants, because the metrics have to be computed
 * (lineHeight = fontSize x leading) and because one loaded family per cut is what
 * works around Android ignoring fontWeight on custom fonts. So `theme.css` declares
 * no font families, and `fontFamilyFor()` above is the only way to reach one.
 *
 * A `fontFamily` constant used to sit here mirroring the Tailwind map's entry. That
 * map is gone, nothing ever imported the constant, and its comment had quietly
 * become wrong twice over — so it went with it.
 */
