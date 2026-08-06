import { router } from 'expo-router';

/**
 * Go back, or go home when there is no back.
 *
 * `router.back()` on its own assumes this screen was pushed. It was not, whenever
 * a route is entered directly: a shared web URL (`/backstage` is its own HTML page
 * in the static export), a deep link (`correctiv://gespeichert`), or a notification.
 * The history is then empty and the back control does nothing — the same dead end
 * the reader's failed-load state used to be. On native it can be worse: during a
 * screenshot tour an unguarded `back()` walked the app out to the launcher.
 *
 * The root layout also declares an anchor, so a pushed route normally has the tabs
 * beneath it. This is the floor under that, for the cases where it cannot.
 */
export function goBack(): void {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}
