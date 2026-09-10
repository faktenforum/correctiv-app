import { useEffect, useRef, useState } from 'react';

import { BASE, driveRoute, keepFramePath, navigate } from './frame/handle';
import { holdTheDoorOpen } from './frame/seed';

/** Between attempts to hand the route to the app's router, in milliseconds. */
const RETRY = 200;

/** How long to keep trying. A cold Metro bundle is slow, and this is after it. */
const GIVE_UP = 6_000;

/**
 * Whether the route has to be handed to the app's router, or the address will do.
 *
 * The one build-time question this file asks, and it is the honest form of it. A
 * development bundle matches routes without stripping its base path, so
 * `/app/gallery` is a page the app does not have and it draws its own 404 (ADR
 * 0025, measured); the dev handle is the way round that. The published export has
 * no handle and needs none, because there the address *is* the route.
 *
 * Read off this site's build rather than probed in the frame, because probing it
 * is a race. Measured on 2026-09-10 with a warm bundle: the frame's document
 * reports `readyState` "complete" at 1,240 ms and the handle appears at 1,399 ms,
 * so "no handle yet" and "no handle at all" look identical for 159 ms and for
 * however long a cold bundle takes. The two halves are one deployment: the dev
 * server proxies `/app` to Metro, and the Pages artifact carries an export.
 */
const DRIVES = import.meta.env.DEV;

/**
 * Whether the app's own router has taken the route.
 *
 * Not "is the address right", which is what got this wrong twice. The address is
 * right the moment the frame is pointed at it and stays right while the app draws
 * its 404 behind it. What cannot happen without the router is the *base path
 * going away*: `appendBaseUrl` skips a development build, so the first thing the
 * app writes after a navigation is a path with no `/app` in front of it. That is
 * an observable the address alone cannot fake, and `keepFramePath` puts the base
 * back afterwards.
 */
export function tookTheRoute(win: Window | null): boolean {
  try {
    return (
      !!win && /^https?:$/.test(win.location.protocol) && !win.location.pathname.startsWith(BASE)
    );
  } catch {
    return false;
  }
}

/**
 * Whether the document at the address the frame was pointed at has finished.
 *
 * In the published export that is the whole job, the address being the route
 * there. In a development build it is only what the poll falls back to showing
 * when the handover never happens, which beats an overlay over a working page.
 * Kept apart from `tookTheRoute` because the two are opposite readings of the
 * same path, and merging them is how a frame that is still loading gets called
 * done.
 *
 * `document.URL` and not `location`, which is the whole of this function. A frame
 * pointed at a new address reports that address from `location` **immediately**,
 * while the document it is still showing is the empty one it started with — and an
 * empty document has `readyState` "complete". Measured: the first tick called a
 * frame that had loaded nothing finished, the poll stopped, and what stayed on
 * screen was the app's 404. `document.URL` is the document's own address, so the
 * two cannot disagree.
 */
export function loadedTheAddress(win: Window | null): boolean {
  try {
    return !!win && win.document.readyState === 'complete' && win.document.URL.includes(BASE);
  } catch {
    return false;
  }
}

/**
 * The app on one route, in a box, without the workbench around it.
 *
 * `Workbench.tsx` is the tool: device sizes, appearance, storage fixtures, the
 * console, the measure checks, all carried in its address. This is the other
 * thing a frame is for, which is to draw one screen where the text about it
 * stands, and `/components` is the reader it was written for. It shares the
 * three parts of the mechanism that are hard to get right rather than copying
 * them: where the app answers, how to reach a route in a development build, and
 * how to get past the door.
 *
 * Why a frame and not a component rendered in place: the components are React
 * Native, and this package compiles none of it. The app's own bundle is the only
 * thing that can draw them, and an iframe is how this page borrows it.
 *
 * Mounted by the caller, only when something has asked for it. One frame boots
 * the whole app bundle, so a page with 44 rows on it must not hold 44.
 */
export function AppFrame({
  route,
  title,
  height = 520,
}: {
  /** An app route, with its query if it takes one: `/gallery?c=ui/Button`. */
  route: string;
  /** Names the frame for a screen reader, which cannot see what is in it. */
  title: string;
  /** In pixels. The width is a phone's, or the container's if that is narrower. */
  height?: number;
}) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [state, setState] = useState<'booting' | 'drawn' | 'stuck'>('booting');

  /**
   * Points the frame at the route, then hands the route to the app's router until
   * the app takes it.
   *
   * One poll rather than a `load` handler, and that is the second attempt. The
   * first drove the route once, on `load`, and the frame stayed on the app's 404:
   * a frame with no `src` fires `about:blank`'s load event as well as the app's,
   * and even on the right one the handle can be there while the router is not
   * mounted yet. Measured, that first `navigate` is dropped in silence and the
   * same call by hand twelve seconds later worked. A poll has to know none of
   * that, because every tick asks the frame what is true now.
   *
   * It ends when the app's router has written the address; when the document is
   * loaded and nothing is going to drive it, which is the published export; or
   * when the time is up, and then it shows whatever did load rather than leaving
   * a box that says it is still booting.
   */
  useEffect(() => {
    const frame = ref.current;
    if (!frame) return;
    setState('booting');
    // Before the frame is pointed anywhere, because the app reads the session on
    // its first render and the gate replaces the whole router.
    holdTheDoorOpen(window.localStorage);
    navigate(frame, route);

    const started = Date.now();
    let taken = 0;
    const timer = window.setInterval(() => {
      const win = frame.contentWindow;
      const loaded = loadedTheAddress(win);

      /*
       * Done, and then twice more.
       *
       * The app writes a path with no `/app` in front of it, so a frame left that
       * way is one reload away from leaving the app and rendering this site inside
       * itself; `keepFramePath` puts the base back and `frame/handle.ts` carries
       * the measurement. Doing it once was not enough: more than one `navigate`
       * reaches the router before a tick can see the first one arrive, and the
       * later one writes the address again afterwards. Measured, one frame in
       * three kept a base-less path. So the base goes back on three ticks, and
       * `taken` is what stops the route being driven again in between — the base
       * being back is exactly what `tookTheRoute` reads as "not yet".
       */
      if (taken > 0 || tookTheRoute(win)) {
        taken += 1;
        keepFramePath(win);
        setState('drawn');
        if (taken > 2) window.clearInterval(timer);
        return;
      }

      if (DRIVES) driveRoute(win, route);

      if ((!DRIVES && loaded) || Date.now() - started > GIVE_UP) {
        window.clearInterval(timer);
        setState(loaded ? 'drawn' : 'stuck');
      }
    }, RETRY);

    return () => window.clearInterval(timer);
  }, [route]);

  return (
    <div
      className="relative mt-s w-[393px] max-w-full overflow-hidden rounded-md border border-stroke bg-canvas"
      style={{ height }}
    >
      {state !== 'drawn' && (
        <p className="absolute inset-0 grid place-items-center px-s text-center text-s text-on-canvas-muted">
          {state === 'booting'
            ? 'Booting the app…'
            : 'The app did not load. The workbench has its console.'}
        </p>
      )}
      {/* eslint-disable-next-line react/iframe-missing-sandbox */}
      <iframe
        ref={ref}
        title={title}
        /* No `sandbox`: `allow-same-origin` would have to be in it for the two
           lines below to work at all, and with `allow-scripts` beside it on a
           same-origin document the attribute grants what it appears to withhold.
           `ui/Stage.tsx` carries the long version of this argument. */
        className="block h-full w-full border-0"
      />
    </div>
  );
}
