// A start-on-this-route hook, for looking at a screen without clicking to it.
//
// THE SEAM THIS SAID DID NOT EXIST NOW DOES, and this module is kept anyway. It used
// to read: `installDevtools` — which has `ActivateWidget` and would click a card for
// us — needs the `Adw.Application` from `vfunc_startup`, and `AppRegistry` owns that
// object here, so reaching the reader means a human with a mouse or this. gjsify #1455
// closed it in 0.48: `RunApplicationOptions` extends the shell's whole option set, so
// `GJSIFY_DEVTOOLS=1` exports `org.gjsify.Devtools` with no wiring at all (README,
// *Driving it from outside*).
//
// What that does NOT replace is starting ON a route. Driving the UI means finding a
// card and activating it: a click path per screen, over whatever the feeds happened to
// return. This names the screen outright and depends on nothing.
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
/** Callbacks parked until the requested route has actually been applied. */
const waiting: (() => void)[] = [];

/** Whether a start-on-this-route was asked for at all. */
export function debugRouteRequested(): boolean {
  const route = GLib.getenv('CORRECTIV_DESKTOP_ROUTE');
  return route !== null && route !== '';
}

/** The screen the router is on, for whoever needs to say what they are looking at. */
let currentPath = '(unknown)';

/** Record the live pathname. Called from the root layout on every navigation. */
export function noteCurrentPath(path: string): void {
  currentPath = path;
}

/** The last pathname the router reported, or `(unknown)` before the first render. */
export function debugCurrentPath(): string {
  return currentPath;
}

/**
 * How long to wait for a requested route before giving up on it and running the parked
 * callbacks anyway. Generous, because it is a backstop and not a schedule.
 */
const ROUTE_DEADLINE_MS = 15_000;

/**
 * Run `callback` once the requested route has been applied — immediately when none was
 * requested, or when it has already happened.
 *
 * The route is applied from a component body while the capture counts from a wall
 * clock, so without this the two race and the capture can photograph whatever screen
 * happened to be up.
 *
 * The deadline is the important half. Whether `applyDebugRoute` is ever reached is
 * decided in another module, and a park with no deadline turns "the route never
 * arrived" into a process that hangs producing nothing at all — strictly worse than
 * capturing early, which at least leaves a file and a log line to look at.
 */
export function onDebugRouteApplied(callback: () => void): void {
  if (!debugRouteRequested() || navigated) {
    callback();
    return;
  }
  waiting.push(callback);
  if (deadlineArmed) return;
  deadlineArmed = true;
  GLib.timeout_add(GLib.PRIORITY_DEFAULT, ROUTE_DEADLINE_MS, () => {
    if (!navigated && waiting.length > 0) {
      console.error(
        `[desktop] CORRECTIV_DESKTOP_ROUTE was never applied within ${ROUTE_DEADLINE_MS} ms. ` +
          'Continuing anyway; whatever is captured is NOT the route that was asked for.',
      );
      release();
    }
    return GLib.SOURCE_REMOVE;
  });
}

let deadlineArmed = false;

/** Run every parked callback exactly once. */
function release(): void {
  for (const callback of waiting.splice(0)) callback();
}

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
  try {
    replace(route);
  } finally {
    // In `finally`, because a throw from the router would otherwise strand every parked
    // callback forever while `navigated` stays true — so the run hangs, and any LATER
    // registration fires immediately while the first one never does. The router does
    // throw: `RouterError` is one of the failures route-sweep watches for.
    release();
  }
}
