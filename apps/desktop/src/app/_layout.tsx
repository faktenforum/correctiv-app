// The desktop root layout.
//
// A variant of `apps/mobile/src/app/_layout.tsx`, and the diff against it is the
// honest measure of what a third host costs: this file hands the core a different
// platform object and drops one CSS import. Everything else — the extractor choice,
// the exclusive-playback wiring, the persistence descriptors, the onboarding gate,
// the modal presentations — is the phone's, unchanged, because none of it is
// platform-specific. That is ADR 0006's split paying out for the third time.
//
// THE THREE DIFFERENCES, all of them here rather than spread out:
//
//   1. No `import '@/global.css'`. That import is the CSS entry Uniwind's Metro
//      transform reads, and there is no Metro here. The class vocabulary reaches GTK
//      through `configureStyle` in `../entry.tsx` instead (ADR 0032 section 3).
//   2. `gtkPlatform` + `gstAudio` instead of `expoPlatform` + `expoAudio`.
//   3. Nothing else. Kept in the same order as the phone's file on purpose, so a
//      `diff` between the two is short enough to read.

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

import { stop as stopAudio } from '@/lib/audio/player';
import { coreStore, useAppStore } from '@/lib/store/core';
import { fontAssets, useAppearance, useIsDark } from '@/lib/theme';

import { applyDebugRoute } from '../debug/route.js';
import { gstAudio } from '../audio/backend.js';
import { gtkPlatform } from '../platform/index.js';

// Hand the core its platform capabilities before anything reads a store. Storage and
// bundled content come from the adapter; the audio backend is composed in here, so
// this one line is the whole answer to "what does this host give the core".
configurePlatform({ ...gtkPlatform, audio: gstAudio });

/**
 * This host carries an HTML parser, so it uses the core's DOM extraction backend
 * rather than the string one that is the default — the same choice the phone makes,
 * and for the same reason: a tag allowlist instead of a denylist, which is measurably
 * cleaner markup in the reader.
 */
configureArticleExtractor(extractArticleFromDom);

/** Starting audio stops video and vice versa. Registered here so neither store imports the other. */
registerExclusiveMedium('audio', stopAudio);
registerExclusiveMedium('video', () => coreStore.dispatch(closeVideo()));

// A no-op on this host, kept because the app's own readiness gate is written around
// it. `src/shims/expo-splash-screen.ts` says what the desktop equivalent is and why
// it needs no call: the window is presented only after React has rendered into it.
SplashScreen.preventAutoHideAsync();

/** Hydrates the persisted slices, then keeps them written. The phone's list, verbatim. */
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

/** A pushed route keeps the tabs underneath it, even when it is the entry point. */
export const unstable_settings = { anchor: '(tabs)' };

export default function RootLayout() {
  return (
    <Provider store={coreStore}>
      <AppShell />
    </Provider>
  );
}

/**
 * Everything that reads state lives below the Provider — `useAppearance()` selects
 * the appearance setting, so it cannot run in the component that renders the
 * Provider.
 */
function AppShell() {
  const [fontsLoaded] = useFonts(fontAssets);
  const [storeReady, setStoreReady] = useState(false);
  useAppearance();
  const isDark = useIsDark();

  useEffect(() => {
    let active = true;
    const start = async () => {
      await registerPersistence();
      if (!active) return;
      setStoreReady(true);
    };
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

  const pathname = usePathname();
  const store = useAppStore();
  const gated = useRef(false);
  useEffect(() => {
    if (!storeReady || gated.current) return;
    gated.current = true;
    // A development aid, checked before the onboarding gate so that asking for a
    // screen actually gets that screen. See src/debug/route.ts; it is a no-op unless
    // CORRECTIV_DESKTOP_ROUTE is set.
    applyDebugRoute((href) => router.replace(href));
    if (pathname !== '/') return;
    if (!store.getState().settings.onboardingDone) router.replace('/onboarding');
  }, [pathname, store, storeReady]);

  if (!fontsLoaded || !storeReady) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      {/*
        `screenOptions` is deliberately absent, where the phone passes
        `headerShown: false` and a `contentStyle` background.

        Both are answers to problems this host does not have. There is no header to
        hide: `Stack` renders an `Adw.NavigationView`, whose chrome is the
        application window's own header bar, and the brief for this port is to leave
        Adwaita's chrome alone. And `contentStyle` existed to stop a white flash
        during a push animation — an `Adw.NavigationView` transition paints the
        pages themselves, so there is no stack surface behind them to see.
      */}
      <Stack>
        <Stack.Screen name="(tabs)" />
        {/*
          `presentation: 'modal'` is dropped on all three, and this is the one
          route-level divergence worth knowing about.

          On the phone these are flows over the app rather than places in it. GTK's
          counterpart is `Adw.Dialog`, which is PRESENTED against a parent and never
          parented by it — `box.append(dialog)` calls `g_error()`, which is SIGABRT
          and a core dump rather than a catchable exception (measured on libadwaita
          1.9.3, and the reason `Modal` is still a refusing export in
          @gjsify/react-native). Presenting one needs a portal seam in the host that
          does not exist yet.

          So player, onboarding and beitreten are ordinary pushed pages here. They
          work — the player is reachable, the onboarding runs, joining runs — and
          they arrive as a page rather than as a sheet. Named, not silent.
        */}
        <Stack.Screen name="player" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="beitreten" />
      </Stack>
    </GestureHandlerRootView>
  );
}
