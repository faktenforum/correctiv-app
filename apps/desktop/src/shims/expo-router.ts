// `expo-router`, over `@gjsify/react-native/router`.
//
// The `--dialect react-native` build aliases the bare `react-native` specifier and
// nothing else, so this one is ours to point somewhere. The router package already IS
// the expo-router surface over `@react-navigation/core`, and the app uses exactly the
// four names it supports — `router` (19 calls), `useLocalSearchParams` (7),
// `usePathname` (1) and `Stack` (1) — plus `Tabs`, which this host's own tab layout uses.
//
// Everything else expo-router exports is deliberately absent rather than stubbed. An
// import of `Link` or `Redirect` should fail at the build, where the support table can
// say what the plan for it is; a stub would make it fail in the window.
//
// ## The one thing that is an adapter rather than a re-export
//
// `router.push` in `@gjsify/react-native/router` takes `(href: string)`. expo-router's
// takes a `Href`, which is EITHER a string OR `{ pathname, params }` — and this app uses
// both forms, at ten call sites across seven pathnames:
//
//   router.push({ pathname: '/artikel', params: { url } })          a query parameter
//   router.push({ pathname: '/projekt/[id]', params: { id } })      a path parameter
//
// Handing the object straight through would not fail the build (nothing typechecks the
// bundle) and would not throw at runtime either — it would be interpolated into a URL as
// `[object Object]`, so every parameterised navigation in the app would quietly land on
// the not-found route. That is exactly the silent-failure shape this port exists to
// refuse, so the two forms are converted here.
//
// fixed upstream in gjsify: `router.push`/`replace`/`navigate` should accept
// expo-router's object `Href` — remove `hrefOf` and the wrapper below on the next bump.

import {
  router as gjsifyRouter,
  Stack,
  Tabs,
  useLocalSearchParams,
  usePathname,
} from '@gjsify/react-native/router';

export { Stack, Tabs, useLocalSearchParams, usePathname };

type Params = Record<string, string | number | undefined | null>;

/** expo-router's `Href`, in the two shapes this app writes. */
export type Href = string | { pathname: string; params?: Params };

/**
 * `Href` -> the path string the router takes.
 *
 * A param named in the pathname (`[id]`, `[slug]`) is substituted into that segment; a
 * param that is not becomes a query parameter. That is expo-router's own rule, and it is
 * why one function covers both call shapes.
 *
 * Values are percent-encoded. The app pushes whole article URLs as a param
 * (`params: { url }`), so a value containing `/`, `?` and `:` is the ordinary case here
 * rather than an edge one.
 */
export function hrefOf(href: Href): string {
  if (typeof href === 'string') return href;

  const params: Params = { ...href.params };
  let pathname = href.pathname;

  for (const [key, value] of Object.entries(params)) {
    const placeholder = `[${key}]`;
    if (!pathname.includes(placeholder)) continue;
    pathname = pathname.replace(placeholder, encodeURIComponent(String(value ?? '')));
    delete params[key];
  }

  const query = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&');

  return query === '' ? pathname : `${pathname}?${query}`;
}

/**
 * How many screens this shim has pushed since the last `replace`.
 *
 * The state behind `canGoBack()`, which `@gjsify/react-native/router` does not expose —
 * and NOT a nicety: `lib/navigation/goBack.ts` calls it unconditionally, so without it
 * the reader's back button dies with `router.canGoBack is not a function`. That is a
 * latent crash on the vertical slice, invisible until someone presses the one control
 * every pushed screen has.
 *
 * A COUNTER IS AN APPROXIMATION, and here is exactly how good it is. Every navigation
 * the application makes goes through this object, so the count is right for all of them.
 * What it cannot see is a pop from the GTK side — Escape, Alt+Left, the mouse back
 * button — which `Adw.NavigationView` performs and the router bridges to React Navigation
 * without telling this module. After one of those the count is too high by one, so
 * `canGoBack()` can answer true when the stack is already at its root; `back()` then
 * pops nothing and the screen simply does not change.
 *
 * fixed upstream in gjsify: the router should expose `canGoBack`, which React
 * Navigation's own navigation object already answers — remove the counter with it.
 */
let pushed = 0;

/**
 * The methods the app calls, each accepting expo-router's `Href`.
 *
 * Six rather than four: `canGoBack` and `dismissTo` are the two the app uses that the
 * router does not have.
 */
export const router = {
  push: (href: Href): void => {
    pushed++;
    gjsifyRouter.push(hrefOf(href));
  },
  replace: (href: Href): void => {
    // `replace` swaps the current screen rather than stacking one, so the depth is
    // whatever it was — except from the root, where the app uses it to enter the
    // onboarding and there is still nothing behind.
    gjsifyRouter.replace(hrefOf(href));
  },
  navigate: (href: Href): void => gjsifyRouter.navigate(hrefOf(href)),
  back: (): void => {
    if (pushed > 0) pushed--;
    gjsifyRouter.back();
  },
  canGoBack: (): boolean => pushed > 0,
  /**
   * expo-router's `dismissTo`, mapped to `replace`.
   *
   * It means "pop back to this route, dismissing what is above it". `Adw.NavigationView`
   * can do that (`pop_to_tag`), but the router exposes no such call, and `replace` gets
   * the user to the right SCREEN — which is what the one call site
   * (`app/formular.tsx`, after a form is submitted) is for. The difference is the
   * history left behind, so it is named rather than passed off as equivalent.
   */
  dismissTo: (href: Href): void => {
    pushed = 0;
    gjsifyRouter.replace(hrefOf(href));
  },
};
