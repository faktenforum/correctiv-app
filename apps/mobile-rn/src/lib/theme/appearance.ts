import { useEffect } from 'react';
import { useColorScheme as useDeviceColorScheme } from 'react-native';
import { useColorScheme } from 'nativewind';

import { useTheme } from '@/lib/store/core';

/** What the app's appearance setting can be. */
export type ThemeSetting = 'system' | 'light' | 'dark';

/**
 * Turns the setting into a concrete scheme.
 *
 * The whole point is that `'system'` never leaves this function. Handing it on
 * looks harmless — NativeWind accepts it — but it splits the app in half: its
 * JavaScript side then follows the device, while `darkMode: 'class'` waits for a
 * `dark` class that nothing adds, so the CSS variables behind `bg-grey-100` stay on
 * their light values. The result is dark-mode *text* on light-mode *surfaces*:
 * near-white on white, unreadable, on a build where every check is green.
 *
 * That shipped. It survived a browser walk too, because the walk flipped the setting
 * to `'dark'` explicitly and pinned the emulated `prefers-color-scheme` to light —
 * exercising both paths that work and neither that breaks.
 *
 * The parameter is deliberately wider than React Native's `ColorSchemeName`: that
 * type is `'light' | 'dark' | 'unspecified'`, but `Appearance.getColorScheme()` is
 * declared to return it *or null or undefined*, and a web build reports whatever
 * `matchMedia` has. Only `'dark'` means dark; everything else — including a platform
 * that declines to answer — falls to the app's default.
 */
export function resolveAppearance(
  setting: ThemeSetting,
  device: string | null | undefined,
): 'light' | 'dark' {
  if (setting !== 'system') return setting;
  return device === 'dark' ? 'dark' : 'light';
}

/**
 * Hands the resolved scheme to NativeWind, which owns the `dark` class the colour
 * system hangs off (`tailwind.config.js` → `darkMode: 'class'`).
 *
 * The setting is the authority, not the device: `'system'` delegates back to the OS,
 * `'light'` and `'dark'` override it. That distinction is the reason this is not
 * `darkMode: 'media'` — a user who picks light on a dark phone means it — and the
 * reason the delegation has to be resolved here rather than passed along.
 *
 * `useColorScheme` from react-native reports the device scheme and re-renders when
 * it changes, so `'system'` tracks the OS live on all three targets.
 */
export function useAppearance(): void {
  const setting = useTheme();
  const device = useDeviceColorScheme();
  const { setColorScheme } = useColorScheme();

  useEffect(() => {
    setColorScheme(resolveAppearance(setting, device));
  }, [setting, device, setColorScheme]);
}
