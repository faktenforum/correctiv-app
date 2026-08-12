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

/** An useFonts() übergeben — lädt alle Schnitte vor dem ersten Render. */
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
