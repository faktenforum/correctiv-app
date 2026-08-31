// Uniwind's three names, on a host where Uniwind is not in the chain at all.
//
// ADR 0008 records how deep Uniwind reaches into Metro: it replaces
// `transformerPath`, wraps `resolveRequest`, and rewrites the bare `react-native`
// specifier so `className` reaches the core components. There is no Metro here, and
// gjsify's style partition IS that runtime — `className` is resolved by
// `@gjsify/gtk-host/style`, which is what `--dialect react-native` wires up. So the
// engine is replaced, not supported, and what is left is the three names the app
// imports directly.

import { useColorScheme } from 'react-native';

/** The app's appearance setting, verbatim — `lib/theme/appearance.ts` passes it on. */
export type ThemeSetting = 'system' | 'light' | 'dark';

/**
 * `Uniwind.setTheme`, mapped onto `Adw.StyleManager:color-scheme`.
 *
 * A REAL mapping with one named limit, and the limit is worth reading before the
 * behaviour surprises someone.
 *
 * What it does: Adwaita's own three-state colour scheme is exactly this API's three
 * values, so the window chrome — header bars, buttons, list rows, every widget
 * Adwaita styles — follows the setting immediately and correctly.
 *
 * What it does NOT do: repaint the app's OWN token colours. `bg-grey-100` is
 * resolved to a literal `rgb(...)` when its class is minted, and `configureStyle`
 * installs one module-level token scale (see `src/generated/tokens.generated.ts`).
 * Changing the scale mid-session would change what NEW classes resolve to while
 * every widget already on screen kept the class it was given, which paints half the
 * window in each scheme. So the token palette is chosen once at startup from the
 * scheme the user is actually in, and a change takes effect on the next launch.
 *
 * That is a genuine gap against the phone, where the same setting flips both halves
 * live. It is named here, in README.md and in the entry rather than left to be found.
 */
export const Uniwind = {
  setTheme(setting: ThemeSetting): void {
    // Imported lazily: this module is also reachable from a typecheck and from a
    // test, neither of which has a GTK display, and `gi://` resolves at import.
    void import('gi://Adw?version=1').then(({ default: Adw }) => {
      const manager = Adw.StyleManager.get_default();
      manager.colorScheme =
        setting === 'light'
          ? Adw.ColorScheme.FORCE_LIGHT
          : setting === 'dark'
            ? Adw.ColorScheme.FORCE_DARK
            : Adw.ColorScheme.DEFAULT;
      return manager.colorScheme;
    });
  },
};

/**
 * `useUniwind()`, narrowed to the one field the app reads.
 *
 * `lib/theme/useColors.ts` uses `useUniwind().theme === 'dark'` and nothing else.
 * `useColorScheme` from the React Native layer reads `Adw.StyleManager:dark` — what
 * the user is looking at, rather than what the application asked for — which is the
 * same question `theme` answers on the phone.
 */
export function useUniwind(): { theme: 'light' | 'dark' } {
  return { theme: useColorScheme() === 'dark' ? 'dark' : 'light' };
}

/**
 * `withUniwind`, which is the identity here — and that is a mapping rather than a
 * no-op, for one specific reason.
 *
 * On the phone it exists because Uniwind only rewrites `react-native` imports, so a
 * third-party component (`react-native-safe-area-context`'s `SafeAreaView`,
 * `react-native-webview`'s `WebView`) would drop a `className` silently: it is not a
 * `View` underneath, so the prop reaches a native component that ignores it.
 *
 * On this host both of those components are shims in this directory, and both are
 * built out of React Native primitives that already resolve `className` through
 * `@gjsify/gtk-host/style`. There is nothing left to translate. If a wrapped
 * component ever did NOT handle `className`, this would go back to being a silent
 * drop — so the two call sites are named here rather than trusted:
 * `components/ui/SafeAreaView.tsx` and `components/media/VideoFrame.tsx`.
 */
export function withUniwind<P>(Component: P): P {
  return Component;
}
