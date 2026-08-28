import { useEffect } from 'react';
import { Uniwind } from 'uniwind';

import { useTheme } from '@/lib/store/core';

/** What the app's appearance setting can be. */
export type ThemeSetting = 'system' | 'light' | 'dark';

/**
 * Hands the app's appearance setting to Uniwind, which owns the colour system.
 *
 * The setting is passed on VERBATIM, `'system'` included — and that is the part
 * worth reading, because under NativeWind doing so was a bug that shipped.
 *
 * There, `'system'` had to be resolved here first: handing it through left the
 * app's JavaScript following the device while `darkMode: 'class'` waited for a
 * class nothing added, so `useColors()` returned the dark palette while
 * `bg-grey-100` stayed white — near-white text on a white page, on a build where
 * typecheck, lint, the tests, the Android build and the web export were all green.
 * It even survived a browser walk, which flipped the setting to `'dark'` and
 * pinned the emulated `prefers-color-scheme` to light: both paths that work,
 * neither that breaks.
 *
 * Uniwind closes that gap by construction rather than by discipline. It registers
 * two themes, `light` and `dark`, and `setTheme` accepts `'system'` as a third
 * value it handles itself: it turns adaptive themes back on and resolves
 * `currentTheme` to the device scheme. So the value `useUniwind()` reports and the
 * value the styles use are the same one, and `'system'` never survives as a
 * *state*. Its generated CSS covers BOTH paths — a `.light`/`.dark` class on the
 * element or any ancestor, and a `prefers-color-scheme` fallback for when no class
 * is set — so neither half can be left waiting on the other.
 *
 * An explicit `'light'` or `'dark'` still overrides the device, which is the whole
 * reason this is a setting: a user who picks light on a dark phone means it.
 */
export function useAppearance(): void {
  const setting = useTheme();

  useEffect(() => {
    Uniwind.setTheme(setting);
  }, [setting]);
}
