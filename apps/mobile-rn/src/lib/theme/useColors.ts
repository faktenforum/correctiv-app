import { useColorScheme } from 'nativewind';

import { colors, colorsDark, type ColorToken } from '@correctiv/design-tokens/tokens.generated';

export type Palette = Record<ColorToken, string>;

/**
 * The active palette, for the colours a class cannot carry.
 *
 * Most of the app never needs this: `bg-grey-100` and `border-grey-300` resolve
 * through CSS variables, and `.dark:root` swaps those underneath — so surfaces and
 * borders follow the scheme without a single `dark:` variant. What stays behind are
 * the values that leave the class system: an `<Ionicons color>`, an
 * `ActivityIndicator`, a `Switch`'s `trackColor`, a `Text` style computed in TS.
 * Those read a plain string, and a plain string cannot change with the scheme.
 *
 * Hence the hook. Importing `colors` directly still works and is still right for a
 * colour that must NOT follow the scheme — `on-emphasis` on a red button stays
 * white in both — but for anything else it silently pins the light value.
 *
 * `useColorScheme()` reports undefined before the first scheme is resolved; light
 * is the app's default and the safe answer while nothing is known.
 */
export function useColors(): Palette {
  const { colorScheme } = useColorScheme();
  return colorScheme === 'dark' ? colorsDark : colors;
}

/** True when the app is currently painting dark. For the few non-colour decisions. */
export function useIsDark(): boolean {
  return useColorScheme().colorScheme === 'dark';
}
