import '@/global.css';

import { router, Stack, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Provider } from 'react-redux';

import { configurePlatform } from '@correctiv/app-core';
import { extractArticleFromDom } from '@correctiv/app-core/articles/extract/dom';
import { configureArticleExtractor } from '@correctiv/app-core/articles/load';
import { registerExclusiveMedium } from '@correctiv/app-core/media/exclusive-playback';
import { persist, persisted } from '@correctiv/app-core/stores/persist';
import {
  PERSISTED_KEYS,
  settingsActions,
  type SettingsState,
} from '@correctiv/app-core/stores/settings';
import { membershipActions, type MembershipState } from '@correctiv/app-core/stores/membership';
import {
  savedArticlesActions,
  type SavedArticlesState,
} from '@correctiv/app-core/stores/savedArticles';
import { interestsActions, type InterestsState } from '@correctiv/app-core/stores/interests';
import {
  participationActions,
  type ParticipationState,
} from '@correctiv/app-core/stores/participation';
import { close as closeVideo } from '@correctiv/app-core/stores/video';

import { expoAudio } from '@/lib/audio/backend';
import { stop as stopAudio } from '@/lib/audio/player';
import { expoPlatform } from '@/lib/platform/expo';
import { coreStore, useAppStore } from '@/lib/store/core';
import { fontAssets, useAppearance, useColors, useIsDark } from '@/lib/theme';

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
registerExclusiveMedium('video', () => coreStore.dispatch(closeVideo()));

// The splash screen stays up until Merriweather and Source Sans 3 are loaded, so
// the first render does not flash an unstyled font.
SplashScreen.preventAutoHideAsync();

/**
 * Hydrates the persisted slices, then keeps them written.
 *
 * Awaited before the first render, and that ordering is the whole of the
 * correctness argument: a screen that reads `onboardingDone` before hydration
 * gets `false` and sends a returning user through the onboarding again. The
 * `storeReady` gate below is what enforces it — there used to be a second
 * mechanism, an in-memory mirror in the platform adapter with its own hydration
 * step, and having two made it possible to satisfy one and not the other.
 */
function registerPersistence(): Promise<void> {
  return persist(coreStore, [
    persisted<SettingsState>('settings', PERSISTED_KEYS, settingsActions.hydrate),
    persisted<SavedArticlesState>('savedArticles', ['items'], savedArticlesActions.hydrate),
    persisted<MembershipState>(
      'membership',
      ['isMember', 'name', 'memberSince', 'amountEur', 'interval', 'paused'],
      membershipActions.hydrate,
    ),
    persisted<InterestsState>('interests', ['selected'], interestsActions.hydrate),
    persisted<ParticipationState>('participation', ['submissions'], participationActions.hydrate),
  ]);
}

/**
 * Anchor: a pushed route keeps the tabs underneath it, even when it is the entry
 * point. Without this, `correctiv://backstage` — or the shared address
 * `/backstage`, its own page in the static export — builds a stack of exactly one
 * screen, and back has nowhere to go. `lib/navigation/goBack.ts` is the floor
 * under this, for the cases where even an anchor cannot help.
 */
export const unstable_settings = { anchor: '(tabs)' };

export default function RootLayout() {
  return (
    <Provider store={coreStore}>
      <AppShell />
    </Provider>
  );
}

/**
 * Everything that reads state lives below the Provider.
 *
 * `useAppearance()` selects the appearance setting, so it cannot run in the
 * component that renders the Provider — a `useSelector` above its own store finds
 * no context and throws at startup. Splitting the shell out is the whole fix.
 */
function AppShell() {
  const [fontsLoaded] = useFonts(fontAssets);
  const [storeReady, setStoreReady] = useState(false);
  useAppearance();
  const palette = useColors();
  const isDark = useIsDark();

  useEffect(() => {
    let active = true;
    const start = async () => {
      await registerPersistence();
      if (!active) return;
      setStoreReady(true);
    };
    // persist() swallows a failed read per slice; this only stops an unexpected
    // throw from leaving the app stuck on a blank splash screen for ever.
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
   * `replace`, not `push`: the onboarding is not a place one returns to. The ref
   * keeps a later render from repeating the same jump — a ref rather than the
   * module flag this used to be, because module state survives Fast Refresh
   * unpredictably and made the redirect impossible to test: the first mount in a
   * suite consumed the flag for every mount after it, so a green test proved only
   * that it had run second.
   *
   * The state is read through the Provider's store rather than the imported
   * singleton — the same seam `useCoreActions` closes — and with `getState()`
   * rather than a selector, because this must not subscribe: it is a decision taken
   * once, not a value the shell renders.
   */
  const pathname = usePathname();
  const store = useAppStore();
  const gated = useRef(false);
  useEffect(() => {
    if (!storeReady || gated.current) return;
    gated.current = true;
    if (pathname !== '/') return;
    if (!store.getState().settings.onboardingDone) router.replace('/onboarding');
  }, [pathname, store, storeReady]);

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
        {/* The full player is a view onto the running singleton, not state of its
            own — a modal, because it replaces nothing. */}
        <Stack.Screen name="player" options={{ presentation: 'modal' }} />
        {/* Both are flows over the app, not places in it. */}
        <Stack.Screen name="onboarding" options={{ presentation: 'modal' }} />
        <Stack.Screen name="beitreten" options={{ presentation: 'modal' }} />
      </Stack>
    </GestureHandlerRootView>
  );
}
