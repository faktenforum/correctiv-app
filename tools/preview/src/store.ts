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
  const hash = writeHash(state);
  if (location.hash !== hash) history.replaceState(null, '', hash);
  for (const listener of listeners) listener();
  return state;
}

export function start(): void {
  state = parseHash(location.hash);
  history.replaceState(null, '', writeHash(state));

  // Only a person editing the address bar, or a step through history, gets here:
  // `set()` writes with `replaceState`, which fires no `hashchange`. So whatever
  // is in the URL wins, exactly as it does at load.
  window.addEventListener('hashchange', () => {
    state = parseHash(location.hash);
    for (const listener of listeners) listener();
  });
}
