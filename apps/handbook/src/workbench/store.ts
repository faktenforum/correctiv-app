import { INITIAL, parseHash, writeHash, type PreviewState } from './state';

/**
 * The shell's own state, in one place, with the URL as its only persistence.
 *
 * There is deliberately no second path: the toolbar, the keyboard and
 * `window.preview` (see `api.ts`) all go through `set()`. A control that wrote
 * its own DOM and a script that wrote the state would drift apart within a week,
 * and the drift would show up as "the automation and the person disagree about
 * what is on screen", which is the one thing this tool exists to prevent.
 */
type Listener = () => void;

let state: PreviewState = INITIAL;
const listeners = new Set<Listener>();

/**
 * Whether the app view is on screen, and therefore whether the hash is ours.
 *
 * The shell has other views, and the hash belongs to them while they are open: a
 * document's contents list navigates by fragment, and a store that kept writing
 * `#/?d=iphone-15-pro` over it would break every heading link on the site. The
 * state itself stays here while the app view is away, so coming back is where
 * you left rather than the defaults.
 */
let owning = false;

function notify(): void {
  for (const listener of listeners) listener();
}

export function getState(): PreviewState {
  return state;
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function set(patch: Partial<PreviewState>): PreviewState {
  const next = { ...state, ...patch };
  if (
    Object.keys(patch).every((k) =>
      Object.is(state[k as keyof PreviewState], next[k as keyof PreviewState]),
    )
  ) {
    return state;
  }
  state = next;
  if (owning) {
    const hash = writeHash(state);
    if (location.hash !== hash) history.replaceState(null, '', hash);
  }
  notify();
  return state;
}

/**
 * Take the hash, and hand it back on the way out.
 *
 * A hash on arrival is an instruction, which is the whole point of the link. An
 * empty one means this is a return visit within the session, so what the state
 * already holds is written back instead of being reset to the defaults.
 */
export function start(): () => void {
  owning = true;
  if (location.hash) state = parseHash(location.hash);
  history.replaceState(null, '', writeHash(state));
  notify();

  // Only a person editing the address bar, or a step through history, gets here:
  // `set()` writes with `replaceState`, which fires no `hashchange`. So whatever
  // is in the URL wins, exactly as it does at load.
  const onHash = () => {
    if (!owning) return;
    state = parseHash(location.hash);
    notify();
  };
  window.addEventListener('hashchange', onHash);

  return () => {
    owning = false;
    window.removeEventListener('hashchange', onHash);
    history.replaceState(null, '', location.pathname + location.search);
  };
}
