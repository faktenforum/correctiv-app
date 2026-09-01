import type { ThemeSetting } from '../state';
import type { Scheme } from './tokens';

/**
 * The shell's half of the contract with the app.
 *
 * Structural on purpose: importing the real types would drag `apps/mobile`'s
 * React Native TypeScript project into this package, and this package is meant
 * to know nothing about React Native. What it needs is three verbs, and the
 * app's own doc comment (`apps/mobile/src/lib/store/core.ts`, `DevHandle`) is
 * the other side of this declaration.
 */
export interface DevHandle {
  store: {
    getState(): { settings?: { theme?: ThemeSetting } } & Record<string, unknown>;
    dispatch(action: unknown): unknown;
    subscribe(listener: () => void): () => void;
  };
  actions: {
    settings: { setTheme(theme: ThemeSetting): unknown };
  } & Record<string, unknown>;
  resetStore: () => unknown;
}

/**
 * The app is served from this page's own directory: `""` locally,
 * `/correctiv-app` on Pages, where `app.config.js` has given the export a
 * matching `baseUrl`. Deriving it beats hard-coding either one, which would be
 * wrong in the other place.
 */
export const BASE = location.pathname.replace(/\/[^/]*$/, '');

/**
 * The handle the app leaves on its own global in a dev build, or `null`.
 *
 * `null` is the normal state of the published demo, not a fault: `expo export`
 * sets `__DEV__` false, so the static export carries no handle. Every caller
 * has to render that difference rather than appear to work — see `ThemeControl`.
 */
export function handleOf(win: Window | null): DevHandle | null {
  try {
    const handle = (win as (Window & { __correctiv?: DevHandle }) | null)?.__correctiv;
    return handle && typeof handle.store?.getState === 'function' ? handle : null;
  } catch {
    return null; // only reachable if the frame ever left this origin
  }
}

/**
 * What the *device* reports, measured inside the frame where it counts.
 *
 * `null` for a frame there is nothing to ask yet, rather than a cheerful
 * "light": the appearance readout counts `'system'` against a light device as
 * combination 3, and guessing that before the frame exists would name a
 * combination nobody is in.
 */
export function frameScheme(win: Window | null): Scheme | null {
  if (!win) return null;
  try {
    return win.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } catch {
    return null;
  }
}

/**
 * Which palette the app is painting with, which is not the same question.
 *
 * On web Uniwind puts exactly one of `light` / `dark` on `<html>`, and that
 * class is the setting after `'system'` has been resolved. `frameScheme()` above
 * is what the device asked for; the two differ on every screen where the setting
 * is explicit, and keeping them apart is the whole of the appearance readout.
 */
export function activeScheme(win: Window | null): Scheme {
  return win?.document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

/** The app's appearance setting, as the store currently holds it. */
export function appTheme(win: Window | null): ThemeSetting | null {
  return handleOf(win)?.store.getState().settings?.theme ?? null;
}

/** Sets the appearance setting through the app's own action. No reload. */
export function applyTheme(win: Window | null, theme: ThemeSetting): boolean {
  const handle = handleOf(win);
  if (!handle) return false;
  handle.actions.settings.setTheme(theme);
  return true;
}

/** The route the frame is showing, with the Pages prefix removed. */
export function frameRoute(win: Window | null): string | undefined {
  try {
    const path = win?.location.pathname;
    if (path === undefined) return undefined;
    const stripped = BASE && path.startsWith(BASE) ? path.slice(BASE.length) : path;
    return (stripped || '/').replace(/\.html$/, '').replace(/\/index$/, '/');
  } catch {
    return undefined;
  }
}

export function navigate(frame: HTMLIFrameElement, route: string): void {
  const target = BASE + (route.startsWith('/') ? route : `/${route}`);
  try {
    // replace(), so stepping through the app does not bury the shell in history.
    frame.contentWindow?.location.replace(target);
  } catch {
    frame.src = target;
  }
}
