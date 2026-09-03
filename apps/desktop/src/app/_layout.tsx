// The desktop root layout.
//
// A variant of `apps/mobile/src/app/_layout.tsx`, and the diff against it is the
// honest measure of what a third host costs: this file hands the core a different
// platform object and drops one CSS import. Everything else — the extractor choice,
// the exclusive-playback wiring, the persistence descriptors, the door, the onboarding
// gate, the modal presentations — is the phone's, unchanged, because none of it is
// platform-specific. That is ADR 0006's split paying out for the third time.
//
// THE TWO DIFFERENCES, both of them here rather than spread out:
//
//   1. No `import '@/global.css'`. That import is the CSS entry Uniwind's Metro
//      transform reads, and there is no Metro here. The class vocabulary reaches GTK
//      through `configureStyle` in `../entry.tsx` instead (ADR 0032 section 3).
//   2. `gtkPlatform` + `gstAudio` instead of `expoPlatform` + `expoAudio`.
//   3. Nothing else. Kept in the same order as the phone's file on purpose, so a
//      `diff` between the two is short enough to read.
//
// The door used to be a third difference, and it was the one that was NOT
// platform-specific: this host mounted the navigator unconditionally and so showed
// the app to a session the phone stops. It is gone as of the render branch below.
// `test/root-layout.test.ts` is what keeps it from coming back, because a missing
// branch here looks exactly like a working app on the machine of whoever is already
// admitted.

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
import {
  savedArticlesActions,
  type SavedArticlesState,
} from '@correctiv/app-core/stores/savedArticles';
import {
  PERSISTED_KEYS as SESSION_KEYS,
  sessionActions,
  type SessionState,
} from '@correctiv/app-core/stores/session';
import { interestsActions, type InterestsState } from '@correctiv/app-core/stores/interests';
import {
  participationActions,
  type ParticipationState,
} from '@correctiv/app-core/stores/participation';
import { close as closeVideo } from '@correctiv/app-core/stores/video';

import { LoginGate } from '@/components/gate/LoginGate';
import { stop as stopAudio } from '@/lib/audio/player';
import { coreStore, useAppStore, useIsAdmitted } from '@/lib/store/core';
import { fontAssets, useAppearance, useIsDark } from '@/lib/theme';

import { applyDebugRoute, debugRouteRequested, noteCurrentPath } from '../debug/route.js';
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
    // What the door reads. Hydrated before the first render like everything else, and
    // for the reason the phone's copy of this line gives: late, a returning member is
    // shown the sign-in form for a frame.
    persisted<SessionState>('session', SESSION_KEYS, sessionActions.hydrate),
    persisted<SavedArticlesState>('savedArticles', ['items'], savedArticlesActions.hydrate),
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

  /**
   * The door, and the phone's own words for it: the whole route tree hangs on this
   * one value, so while the session is not admitted there is no route to reach by
   * deep link or by back. A redirect could not do that, and on this host it could do
   * even less — `CORRECTIV_DESKTOP_ROUTE` below replaces the initial route, so a
   * redirect-shaped door would be one the development aid walks straight through.
   *
   * A selector rather than `getState()`, because unlike the onboarding decision this
   * one is a value the shell renders: signing in has to open the app in the same
   * tick. It reads the entitlement and never the contribution (ADR 0016).
   */
  const admitted = useIsAdmitted();

  const pathname = usePathname();
  const store = useAppStore();
  // So the capture can name the screen it photographed. Without it a screenshot is a
  // picture with no claim attached, and a picture of the WRONG screen is
  // indistinguishable from a picture of the right one.
  useEffect(() => noteCurrentPath(pathname), [pathname]);
  const gated = useRef(false);
  useEffect(() => {
    if (!storeReady || !admitted || gated.current) return;
    gated.current = true;
    // BOTH DECISIONS WAIT FOR ADMISSION, and the debug aid for the same reason as the
    // onboarding jump: each of them replaces a route, and there is no navigator to
    // replace one in until the door opens. On a profile that is not admitted the aid
    // therefore never fires, `onDebugRouteApplied` reaches its deadline, and the log
    // says `was never applied within` — which `route-sweep` reads as a failure. That
    // is the intended answer: a sweep run behind the door has nothing to say about
    // the route it was asked for. README, "How to run it", says how to get past it.
    //
    // See src/debug/route.ts; a no-op unless CORRECTIV_DESKTOP_ROUTE is set.
    applyDebugRoute((href) => router.replace(href));
    // The aid has chosen a screen, so the gate below must not overrule it. Ordering
    // alone did NOT achieve that, which is what the comment here used to claim:
    // `pathname` is the render-time value and is still '/' at this point, so the
    // guard never returned and the gate replaced the requested route two lines later.
    // Every capture on a profile that has not finished onboarding was therefore the
    // onboarding screen, whatever route was asked for — measured across four
    // different routes, including one that does not exist, all byte-identical.
    if (debugRouteRequested()) return;
    if (pathname !== '/') return;
    if (!store.getState().settings.onboardingDone) router.replace('/onboarding');
  }, [admitted, pathname, store, storeReady]);

  if (!fontsLoaded || !storeReady) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      {admitted ? (
        /*
          `screenOptions` is deliberately absent, where the phone passes
          `headerShown: false` and a `contentStyle` background.

          Both are answers to problems this host does not have. There is no header to
          hide: `Stack` renders an `Adw.NavigationView`, whose chrome is the
          application window's own header bar, and the brief for this port is to leave
          Adwaita's chrome alone. And `contentStyle` existed to stop a white flash
          during a push animation — an `Adw.NavigationView` transition paints the
          pages themselves, so there is no stack surface behind them to see.
        */
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

            So player and onboarding are ordinary pushed pages here. They work — the
            player is reachable, the onboarding runs — and they arrive as a page rather
            than as a sheet. Named, not silent.

            `beitreten` was the third of these until ADR 0020 took the contribution out
            of the app entirely; the route is gone from the phone and therefore from
            here, which is what re-exporting the screens is for.
          */}
          <Stack.Screen name="player" />
          <Stack.Screen name="onboarding" />
        </Stack>
      ) : (
        /*
          The phone's own gate component, imported rather than varied. It reaches
          this host through the `@/*` alias, the same way every other re-exported
          screen does, and it needs nothing this host does not already answer:
          `ActivityIndicator`, `Pressable`, `ScrollView`, `TextInput` and `View` are
          all importable per @gjsify/react-native's support table, which
          `test/support-gate.test.ts` checks against the phone's whole source tree.
        */
        <LoginGate />
      )}
    </GestureHandlerRootView>
  );
}
