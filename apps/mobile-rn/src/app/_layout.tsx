import '@/global.css';

import { router, Stack, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'nativewind';
import { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { configurePlatform } from '@correctiv/app-core';
import { extractArticleFromDom } from '@correctiv/app-core/articles/extract/dom';
import { configureArticleExtractor } from '@correctiv/app-core/articles/load';
import { registerExclusiveMedium } from '@correctiv/app-core/media/exclusive-playback';
import { persist } from '@correctiv/app-core/stores/persist';
import { PERSISTED_KEYS } from '@correctiv/app-core/stores/settings';

import { expoAudio } from '@/lib/audio/backend';
import { stop as stopAudio } from '@/lib/audio/player';
import { expoPlatform, hydratePlatform } from '@/lib/platform/expo';
import { coreStores, useTheme } from '@/lib/store/core';
import { fontAssets, useColors, useIsDark } from '@/lib/theme';

// Hand the core its platform capabilities before anything reads a store. Storage
// and bundled content come from the adapter; the audio backend is composed in
// here, so this one line is the whole answer to "what does this host give the core".
configurePlatform({ ...expoPlatform, audio: expoAudio });

/**
 * This app carries an HTML parser, so it uses the core's DOM extraction backend
 * rather than the string one that is the default. The difference is a tag
 * allowlist instead of a denylist — measurably cleaner markup in the reader. See
 * @correctiv/app-core/articles/types.ts for the trade-off and the test that keeps
 * the two backends in agreement.
 */
configureArticleExtractor(extractArticleFromDom);

/**
 * Exclusive playback: starting audio stops video and vice versa. Registered here
 * rather than inside either store, so neither has to import the other (the core's
 * media/exclusive-playback.ts explains why that import cycle had to go).
 */
registerExclusiveMedium('audio', stopAudio);
registerExclusiveMedium('video', () => coreStores.video.getState().close());

// The splash screen stays up until Merriweather and Source Sans 3 are loaded, so
// the first render does not flash an unstyled font.
SplashScreen.preventAutoHideAsync();

/**
 * Registered only AFTER the platform cache is hydrated. The KeyValueStore port is
 * synchronous and reads an in-memory mirror, so wiring persist() beforehand would
 * read empty state and then overwrite the real state on the first change — a data
 * loss bug that looks like "settings randomly reset". See lib/platform/expo.ts.
 */
function registerPersistence(): void {
  persist('settings', coreStores.settings, PERSISTED_KEYS);
  persist('savedArticles', coreStores.savedArticles, ['items']);
  persist('membership', coreStores.membership, [
    'isMember',
    'name',
    'memberSince',
    'amountEur',
    'interval',
    'paused',
  ]);
  persist('interests', coreStores.interests, ['selected']);
  persist('participation', coreStores.participation, ['submissions']);
}

/**
 * Anchor: a pushed route keeps the tabs underneath it, even when it is the entry
 * point. Without this, `correctiv://backstage` — or the shared address
 * `/backstage`, its own page in the static export — builds a stack of exactly one
 * screen, and back has nowhere to go. `lib/navigation/goBack.ts` is the floor
 * under this, for the cases where even an anchor cannot help.
 */
export const unstable_settings = { anchor: '(tabs)' };

let gated = false;

/**
 * Hands the app's appearance setting to NativeWind, which owns the `dark` class the
 * whole colour system hangs off (`tailwind.config.js` → `darkMode: 'class'`).
 *
 * The setting is the authority, not the device: 'system' delegates back to the OS,
 * 'light' and 'dark' override it. That distinction is the entire reason this is not
 * `darkMode: 'media'` — a user who picks light on a dark phone means it.
 *
 * The NativeScript build needed a hundred lines here (`composables/useTheme.ts`):
 * it had to disable core's own appearance handling, re-apply a CSS class to every
 * modal root by hand, and force CollectionView to re-render. React Native re-renders
 * on state change on its own, so this is the whole of it.
 */
function useAppearance(): void {
  const theme = useTheme();
  const { setColorScheme } = useColorScheme();

  useEffect(() => {
    setColorScheme(theme);
  }, [theme, setColorScheme]);
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts(fontAssets);
  const [storeReady, setStoreReady] = useState(false);
  useAppearance();
  const palette = useColors();
  const isDark = useIsDark();

  useEffect(() => {
    let active = true;
    const start = async () => {
      await hydratePlatform();
      if (!active) return;
      registerPersistence();
      setStoreReady(true);
    };
    // hydratePlatform swallows storage faults itself; this only stops an
    // unexpected throw from leaving the app stuck on a blank splash screen.
    start().catch((err: unknown) => {
      console.warn('[app] store hydration failed, starting anyway:', err);
      if (active) setStoreReady(true);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (fontsLoaded && storeReady) SplashScreen.hideAsync();
  }, [fontsLoaded, storeReady]);

  /**
   * First start: into the onboarding once per session, as soon as the state is
   * hydrated — before that `onboardingDone` would always be false, which is the
   * very fault registerPersistence above avoids.
   *
   * ONLY when the app starts on the home route. Otherwise the jump overwrites every
   * shared link on the web target: someone opening `/backstage` should see
   * Backstage, not the onboarding first. Natively the case does not arise, because
   * the app always starts at `/`.
   *
   * `replace`, not `push`: the onboarding is not a place one returns to. The module
   * flag keeps a later render from repeating the same jump.
   */
  const pathname = usePathname();
  useEffect(() => {
    if (!storeReady || gated) return;
    gated = true;
    if (pathname !== '/') return;
    if (!coreStores.settings.getState().onboardingDone) router.replace('/onboarding');
  }, [storeReady, pathname]);

  if (!fontsLoaded || !storeReady) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {/* Explicit rather than "auto": auto follows the device, and the app's
          appearance setting may deliberately disagree with it. */}
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          // The stack's own surface, visible for the length of a push animation.
          // Left at its default white it flashed on every navigation in dark mode.
          contentStyle: { backgroundColor: palette['grey-100'] },
        }}
      >
        <Stack.Screen name="(tabs)" />
        {/* Der Vollplayer ist eine Ansicht auf den laufenden Singleton, kein
            eigener Zustand — als Modal, weil er nichts ersetzt. */}
        <Stack.Screen name="player" options={{ presentation: 'modal' }} />
        {/* Beide sind Abläufe über der App, keine Orte in ihr. */}
        <Stack.Screen name="onboarding" options={{ presentation: 'modal' }} />
        <Stack.Screen name="beitreten" options={{ presentation: 'modal' }} />
      </Stack>
    </GestureHandlerRootView>
  );
}
