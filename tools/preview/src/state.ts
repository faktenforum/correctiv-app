import { DEFAULT_DEVICE, DEVICES, preset } from './devices';
import { TOKENS, type Overrides, type Scheme } from './frame/tokens';

/** The app's own appearance setting. `null` means "leave the app alone". */
export type ThemeSetting = 'system' | 'light' | 'dark';

/** Everything the shell can be told to do, and everything it puts in the URL. */
export interface PreviewState {
  route: string;
  device: string;
  landscape: boolean;
  zoom: 'fit' | number;
  /** Only meaningful while `device === 'custom'`. */
  w: number;
  h: number;
  theme: ThemeSetting | null;
  /** A storage fixture applied before the frame boots; see `frame/seed.ts`. */
  seed: string | null;
  /** Whether the tool panels are shown at all. Off is the plain demo. */
  tools: boolean;
  /** Colour tokens overridden in the frame, per scheme. */
  overrides: Overrides;
  /** Run the measure checks as soon as the frame settles. */
  check: boolean;
}

export const INITIAL: PreviewState = {
  route: '/',
  device: DEFAULT_DEVICE,
  landscape: false,
  zoom: 'fit',
  w: preset(DEFAULT_DEVICE).w,
  h: preset(DEFAULT_DEVICE).h,
  theme: null,
  seed: null,
  tools: false,
  overrides: {},
  check: false,
};

const THEMES: ThemeSetting[] = ['system', 'light', 'dark'];

function isTheme(value: string | null): value is ThemeSetting {
  return value !== null && (THEMES as string[]).includes(value);
}

/**
 * `#/artikel?d=ipad-mini&o=l&t=dark` — route and everything about how it is being
 * looked at, in one link, so a finding can be handed over as a URL rather than as
 * a set of instructions.
 *
 * The five original parameters (`d`, `o`, `z`, `w`, `h`) keep their names and
 * their meaning: links written before this package existed still resolve.
 */
export function parseHash(hash: string): PreviewState {
  const raw = hash.replace(/^#/, '');
  if (!raw) return INITIAL;

  const cut = raw.indexOf('?');
  const route = (cut === -1 ? raw : raw.slice(0, cut)) || '/';
  const p = new URLSearchParams(cut === -1 ? '' : raw.slice(cut + 1));

  const device = DEVICES.some((d) => d.id === p.get('d')) ? p.get('d')! : INITIAL.device;
  const zoomRaw = p.get('z');
  const size = preset(device);

  return {
    route,
    device,
    landscape: p.get('o') === 'l',
    zoom: zoomRaw && zoomRaw !== 'fit' ? Number(zoomRaw) || 'fit' : 'fit',
    w: Number(p.get('w')) || size.w || INITIAL.w,
    h: Number(p.get('h')) || size.h || INITIAL.h,
    theme: isTheme(p.get('t')) ? (p.get('t') as ThemeSetting) : null,
    seed: p.get('s'),
    tools: p.has('tools'),
    overrides: parseOverrides(p.get('kl'), p.get('kd')),
    check: p.has('check'),
  };
}

/**
 * `kl=grey-100:ff0000,emphasis:00b0ff` — a proposed palette, per scheme, in the
 * link. A colour someone wants to argue for travels the same way a device and a
 * route do, which is the whole premise of this address bar. Unknown token names
 * and malformed values are dropped rather than rejected: a stale link should
 * still open.
 */
function parseOverrides(light: string | null, dark: string | null): Overrides {
  const out: Overrides = {};
  for (const [scheme, raw] of [
    ['light', light],
    ['dark', dark],
  ] as [Scheme, string | null][]) {
    for (const pair of raw?.split(',') ?? []) {
      const [token, hex] = pair.split(':');
      if (!token || !hex || !/^[\da-f]{6}$/i.test(hex)) continue;
      if (!(TOKENS as string[]).includes(token)) continue;
      const key = token as keyof Overrides;
      out[key] = { ...out[key], [scheme]: `#${hex.toLowerCase()}` };
    }
  }
  return out;
}

function writeOverrides(overrides: Overrides, scheme: Scheme): string {
  return TOKENS.filter((t) => overrides[t]?.[scheme])
    .map((t) => `${t}:${overrides[t]![scheme]!.replace('#', '')}`)
    .join(',');
}

export function writeHash(state: PreviewState): string {
  const p = new URLSearchParams();
  p.set('d', state.device);
  if (state.landscape) p.set('o', 'l');
  if (state.zoom !== 'fit') p.set('z', String(state.zoom));
  if (state.device === 'custom') {
    p.set('w', String(state.w));
    p.set('h', String(state.h));
  }
  if (state.theme) p.set('t', state.theme);
  if (state.seed) p.set('s', state.seed);
  if (state.tools) p.set('tools', '1');
  if (state.check) p.set('check', '1');
  const light = writeOverrides(state.overrides, 'light');
  const dark = writeOverrides(state.overrides, 'dark');
  if (light) p.set('kl', light);
  if (dark) p.set('kd', dark);
  return `#${state.route || '/'}?${p}`;
}

/** The frame's size in CSS pixels, orientation applied. */
export function frameSize(state: PreviewState): { w: number; h: number } {
  const { w, h } = state.device === 'custom' ? state : preset(state.device);
  return state.landscape ? { w: h, h: w } : { w, h };
}
