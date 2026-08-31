// `expo-splash-screen`, whose job this platform already does by another mechanism.
//
// Both functions are no-ops, and the reason they are not SILENT no-ops is that the
// desktop equivalent is real and automatic. `@gjsify/react-native/router` refuses
// expo-router's own `SplashScreen` export with the same sentence: a native splash
// screen belongs to a phone launcher, while a GTK application maps its window when
// it is ready, which is `Gio.Application`'s job.
//
// Concretely, in `src/entry.tsx`: the window is constructed, React renders into it
// synchronously, and only then is `present()` called. There is no frame in which a
// blank window is on screen waiting to be covered, so there is nothing for
// `preventAutoHideAsync` to prevent and nothing for `hideAsync` to reveal.
//
// The app's two call sites (`app/_layout.tsx`) therefore keep working unchanged, and
// the gate they guard — do not render until fonts and the persisted store are
// ready — is still honoured by the app's own `if (!fontsLoaded || !storeReady)`.

export function preventAutoHideAsync(): Promise<boolean> {
  return Promise.resolve(true);
}

export function hideAsync(): Promise<boolean> {
  return Promise.resolve(true);
}

export function setOptions(_options: unknown): void {
  // See the header: this platform has no splash surface to configure.
}
