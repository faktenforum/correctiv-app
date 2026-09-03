import { useUniwind } from 'uniwind';

import { colors, colorsDark, type ColorToken } from '@correctiv/design-tokens/tokens.generated';

export type Palette = Record<ColorToken, string>;

/**
 * The active palette, for the colours a class cannot carry.
 *
 * Most of the app never needs this: `bg-canvas` and `border-stroke` resolve
 * through CSS variables, and Uniwind swaps those underneath — so surfaces and
 * borders follow the scheme without a single `dark:` variant. What stays behind are
 * the values that leave the class system: an `<Ionicons color>`, an
 * `ActivityIndicator`, a `Switch`'s `trackColor`, a `Text` style computed in TS.
 * Those read a plain string, and a plain string cannot change with the scheme.
 *
 * Hence the hook. Importing `colors` directly still works and is still right for a
 * colour that must NOT follow the scheme — a primitive, such as `white` on a red
 * button, which is white in both — but for anything else it silently pins the light
 * value.
 *
 * `useUniwind()` reports the resolved theme, never `'system'`: that setting means
 * "follow the device", and Uniwind has already asked the device by the time this
 * returns. See lib/theme/appearance.ts.
 */
export function useColors(): Palette {
  return useUniwind().theme === 'dark' ? colorsDark : colors;
}

/** True when the app is currently painting dark. For the few non-colour decisions. */
export function useIsDark(): boolean {
  return useUniwind().theme === 'dark';
}
