/**
 * The minimal observable store the core's state is built on.
 *
 * ## Why this is not `zustand/vanilla`
 *
 * It was, briefly. zustand's package exports list a `react-native` condition
 * BEFORE `import`:
 *
 *   "./*": {
 *     "react-native": { "default": "./*.js" },   // CommonJS
 *     "import":       { "default": "./esm/*.mjs" },
 *     "default":      { "default": "./*.js" }    // CommonJS
 *   }
 *
 * `@nativescript/vite` does not set the `import` condition, so it resolved the
 * CommonJS build — and that app carries no CommonJS plugin, so Rollup failed with
 * `"createStore" is not exported by node_modules/zustand/vanilla.js`. Typecheck
 * and the Expo build both passed; only the NativeScript bundle broke.
 *
 * Adding bundler configuration to an app that is being retired, in order to keep a
 * dependency the core does not need, is the wrong trade. The API below is
 * deliberately shaped like zustand's, so:
 *   - the store files read the same as before,
 *   - React hosts can still bind with zustand's `useStore`, which only needs
 *     `subscribe`, `getState` and `getInitialState` (covered by a test in
 *     apps/mobile-rn),
 *   - swapping back later is a one-line import change.
 *
 * Keeping it here also restores the core's zero-runtime-dependency property, which
 * is what lets it run unchanged on a NativeScript runtime, in Expo, and in a browser.
 */

export type StoreListener<T> = (state: T, previousState: T) => void;

export type StateUpdater<T> = Partial<T> | ((state: T) => Partial<T>);

export interface Store<T> {
  getState: () => T;
  /** The state as first constructed — used by React's useSyncExternalStore. */
  getInitialState: () => T;
  setState: (partial: StateUpdater<T>, replace?: boolean) => void;
  subscribe: (listener: StoreListener<T>) => () => void;
}

/** What the initialiser receives, mirroring zustand's (set, get) signature. */
export type StoreInitialiser<T> = (set: Store<T>['setState'], get: Store<T>['getState']) => T;

export function createStore<T extends object>(initialiser: StoreInitialiser<T>): Store<T> {
  let state: T;
  const listeners = new Set<StoreListener<T>>();

  const getState = () => state;

  const setState: Store<T>['setState'] = (partial, replace) => {
    const next = typeof partial === 'function' ? partial(state) : partial;
    // Reference equality is the signal every binding relies on to decide whether
    // to re-render, so skip the notification when nothing actually changed.
    if (Object.is(next, state)) return;

    const previous = state;
    state = replace ? (next as T) : Object.assign({}, state, next);
    // Snapshot the listener set. A listener may subscribe or unsubscribe while
    // being notified, and JavaScript's Set iteration visits entries added during
    // iteration — so without this copy a listener registered inside a listener
    // would be called for the very update it was added during.
    // The copy IS the point — removing it fails the test
    // "survives a listener subscribing during notification".
    // oxlint-disable-next-line unicorn/no-useless-spread
    for (const listener of [...listeners]) listener(state, previous);
  };

  const subscribe: Store<T>['subscribe'] = (listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };

  state = initialiser(setState, getState);
  const initialState = state;

  return { getState, getInitialState: () => initialState, setState, subscribe };
}
