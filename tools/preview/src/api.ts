import { DEVICES } from './devices';
import { waitReady } from './frame/ready';
import { appTheme, frameScheme, handleOf } from './frame/handle';
import { FIXTURES } from './frame/seed';
import { getLogs } from './logs';
import { audit } from './frame/measure';
import { ROUTES } from './routes';
import { getState, set } from './store';
import type { PreviewState, ThemeSetting } from './state';

/**
 * `window.preview` — the shell, as something other than a person can drive it.
 *
 * Everything here goes through the same `store.set()` the toolbar uses, which is
 * the point: an automated walk and a human walk cannot end up looking at
 * different things. A caller outside this page (a browser automation session,
 * say) needs exactly three verbs — say what you want, wait until it is on
 * screen, ask what is actually there — so those are what this exposes.
 *
 * `set()` resolving only after `waitReady()` is the part worth keeping. It turns
 * "navigate, then sleep 2000, then screenshot" into one await, and it is the
 * difference between a screenshot of the app and a screenshot of its first
 * paint.
 */
export interface Status extends PreviewState {
  /** Whether the app left a dev handle behind; false in the static export. */
  handle: boolean;
  /** What the app's own setting says, read back out of its store. */
  appTheme: ThemeSetting | null;
  /** What the device reports, measured inside the frame. */
  scheme: 'light' | 'dark' | null;
  /** Which of the four appearance combinations is on screen. */
  combination: number | null;
  frameRoute: string | undefined;
  warnings: number;
  errors: number;
}

export interface PreviewApi {
  get(): Status;
  set(patch: Partial<PreviewState>): Promise<Status>;
  ready(): Promise<void>;
  devices(): typeof DEVICES;
  routes(): typeof ROUTES;
  fixtures(): { id: string; label: string; hint: string }[];
  logs(): ReturnType<typeof getLogs>;
  /** Runs the measure checks now and returns them, without touching the panel. */
  audit(): ReturnType<typeof audit>;
}

let frame: HTMLIFrameElement | null = null;
let statusOf: () => Status = () => ({ ...getState() }) as Status;

/** Called once by the App, which owns the element and the derived status. */
export function registerFrame(el: HTMLIFrameElement | null, status: () => Status): void {
  frame = el;
  statusOf = status;
}

/**
 * The four combinations `TROUBLESHOOTING.md` insists on, numbered as it numbers
 * them: the two explicit settings, then `system` against each device scheme.
 * Four is the one that has already shipped broken, and it is also the default.
 */
export function combinationOf(
  setting: ThemeSetting | null,
  scheme: 'light' | 'dark' | null,
): number | null {
  if (setting === 'light') return 1;
  if (setting === 'dark') return 2;
  if (setting === 'system') return scheme === 'dark' ? 4 : scheme === 'light' ? 3 : null;
  return null;
}

export function readFrame(win: Window | null): {
  handle: boolean;
  appTheme: ThemeSetting | null;
  scheme: 'light' | 'dark' | null;
} {
  return {
    handle: handleOf(win) !== null,
    appTheme: appTheme(win),
    scheme: frameScheme(win),
  };
}

export function install(): void {
  const api: PreviewApi = {
    get: () => statusOf(),
    async set(patch) {
      set(patch);
      await this.ready();
      return statusOf();
    },
    ready: async () => {
      if (frame) await waitReady(frame);
    },
    devices: () => DEVICES,
    routes: () => ROUTES,
    fixtures: () => FIXTURES.map(({ id, label, hint }) => ({ id, label, hint })),
    logs: () => getLogs(),
    audit: () => audit(frame?.contentWindow ?? null),
  };
  (window as Window & { preview?: PreviewApi }).preview = api;
}
