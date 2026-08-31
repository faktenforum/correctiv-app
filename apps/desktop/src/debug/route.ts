// A start-on-this-route hook, for looking at a screen without clicking to it.
//
// The desktop host has no way to drive its own UI from outside: `installDevtools` —
// which does have `ActivateWidget` and would click a card for us — needs the
// `Adw.Application` instance from `vfunc_startup`, and `AppRegistry.runApplication`
// owns that object here. Until that seam exists, reaching the reader means either a
// human with a mouse or this.
//
// It is the same shape the other GJS apps in this workspace use for the same reason
// (`BH_APP_*`, `BP_APP_*`): one environment variable, read once, that replaces the
// initial route. Deliberately `replace` and not `push`, so the screen under
// inspection is the whole stack and a capture cannot photograph a half-finished
// transition.
//
// A DEBUG FACILITY, not a feature: it is gated on an environment variable that
// nothing sets in normal use, and it is the reason the screenshots in README.md exist
// at all.

import GLib from 'gi://GLib?version=2.0';

let navigated = false;

/**
 * If `CORRECTIV_DESKTOP_ROUTE` is set, replace the initial route with it.
 *
 * Takes `router` as an argument rather than importing it, so this module stays free of
 * the routing layer and can be read as what it is: an environment read.
 *
 * Guarded once, like the screenshot hook, because the call site is a component body
 * that React renders more than once — and a `replace` per render would fight the
 * router for as long as the app is open.
 */
export function applyDebugRoute(replace: (href: string) => void): void {
  if (navigated) return;
  const route = GLib.getenv('CORRECTIV_DESKTOP_ROUTE');
  if (route === null || route === '') return;
  navigated = true;
  console.log(`[desktop] CORRECTIV_DESKTOP_ROUTE: replacing the initial route with "${route}".`);
  replace(route);
}
