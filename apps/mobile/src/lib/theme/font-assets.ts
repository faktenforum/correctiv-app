/**
 * The five font files, and the only module in `lib/theme` that reaches Expo.
 *
 * Apart from the root layout nothing in the app needs the files; what components
 * need is the family *name*, which is `fontFamilyFor()` in `./fonts` and a plain
 * string. Splitting the two is not tidiness: `@expo-google-fonts/*` resolves to
 * a React Native asset registration, `./fonts` is re-exported by `lib/theme`'s
 * barrel, and every component that writes `import { useColors } from '@/lib/theme'`
 * therefore used to pull Expo's font loader in behind it. That chain is what kept
 * the handbook from building a single component of this app with Vite (ADR 0027).
 *
 * So this module is deliberately NOT in the barrel. `app/_layout.tsx` imports it
 * by path, and it is the only thing that should.
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
