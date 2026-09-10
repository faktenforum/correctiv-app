import { View } from 'react-native';

import { Button, Overline, Screen, Typo } from '@/components/ui';

/**
 * Everything a person reads on the recovery screen, in one place.
 *
 * The technical line is part of the copy on purpose: until an error report actually
 * leaves the app, quoting it is the only way anyone can tell us what broke. See
 * `app/_layout.tsx`, where the report is sent and where issue #95 will change.
 */
const COPY = {
  overline: 'Fehler',
  headline: 'Die App ist stehen geblieben',
  lead: 'Die App konnte diesen Bildschirm nicht anzeigen. Bitte versuchen Sie es noch einmal. Bleibt der Fehler, schließen Sie die App und öffnen Sie sie neu.',
  retry: 'Erneut versuchen',
  detailHeading: 'Technische Meldung',
};

export interface RecoveryScreenProps {
  /** The technical message, already reduced to a string by whoever caught it. */
  detail: string;
  onRetry: () => void;
}

/**
 * What the app shows when a render failed, as a component rather than as part of a
 * route.
 *
 * **It is here, and not in `app/_layout.tsx`, for two reasons.** A second host can
 * render it: on this app expo-router supplies the catching, the root route exports
 * an `ErrorBoundary` and `Try` wraps the tree in it, but a host with a different
 * router has to catch for itself, and what it then needs is this screen and its
 * German, not a copy of either. And in `src/components` it is catalogued, so the
 * gallery draws it in both appearance settings — which is the only way anybody
 * looks at this screen on purpose, since the app only shows it when something
 * has already gone wrong.
 *
 * A full screen rather than a part of one, like `gate/LoginGate` beside it, and
 * boxed in the gallery the same way.
 *
 * **What it is allowed to depend on**, which is the constraint that shapes it. A
 * boundary catches by unmounting the tree below itself, and on this app that tree
 * is `RootLayout` — so when this renders, the Redux Provider is gone,
 * `GestureHandlerRootView` is gone, and `useAppearance()` is no longer feeding
 * Uniwind. Anything reading the store would throw inside the boundary, which is
 * unrecoverable. What it does use, and why each is safe:
 *
 *  - `Screen`, `Typo`, `Overline`, `Button` from the design system. Their only
 *    dependency is `useColors()`, which reads `useUniwind()` and not the store, so
 *    no provider is involved. Uniwind holds the appearance as module state, not as
 *    context, so whatever `useAppearance()` last set survives its own unmount, and
 *    a fault before it ever ran leaves Uniwind on its own default, which follows
 *    the device. Either way the screen is painted in the right scheme.
 *  - `Screen`'s `SafeAreaView`, because expo-router mounts `SafeAreaProvider` in
 *    `ExpoRoot` ABOVE the root route, so its context outlives the unmount. WHERE
 *    those insets come from is the host's business and not this screen's, and the
 *    three answers differ: the web target's `SafeAreaView` reads them through that
 *    context and throws without it, native computes them in the view itself, and
 *    the GTK host on the `desktop` branch answers zero from a shim, because a
 *    window is not behind a notch.
 *  - Their `fontFamily`, which on the font-failure path names a face that is not
 *    installed. Checked rather than assumed: React Native substitutes the system
 *    font and logs at info level (`RCTLogInfo(@"Unrecognized font family '%@'")`,
 *    react-native/React/Views/RCTFont.mm), and a browser falls back by CSS. So this
 *    screen renders in the platform font at the design system's sizes, which is
 *    exactly what it should do when the fonts are the thing that broke.
 */
export function RecoveryScreen({ detail, onRetry }: RecoveryScreenProps) {
  return (
    <Screen scroll={false}>
      <View className="flex-1 items-center justify-center">
        <Overline label={COPY.overline} color="accent" />
        <Typo variant="headline-l" className="mt-2xs text-center">
          {COPY.headline}
        </Typo>
        <Typo variant="text-m" color="on-canvas-muted" className="mt-s text-center">
          {COPY.lead}
        </Typo>
        <Button title={COPY.retry} className="mt-l self-center" onPress={onRetry} />
        <View className="mt-l self-stretch rounded-md border border-stroke bg-surface p-s">
          <Overline label={COPY.detailHeading} />
          {/* Bounded: the screen is centred and does not scroll, so an unbounded
              message would push the retry button off the top. */}
          <Typo variant="text-s" color="on-canvas-muted" className="mt-2xs" numberOfLines={4}>
            {detail}
          </Typo>
        </View>
      </View>
    </Screen>
  );
}
