import type { UnknownAction } from '@reduxjs/toolkit';

import { platform } from '../ports';
import type { AppStore, RootState } from './store';

/**
 * Minimal persistence: hydrates slices through the KeyValueStore port at startup
 * and writes the declared keys back, debounced.
 *
 * Deliberately not `redux-persist`: this core already declares exactly what it
 * needs from a host as a port, so going through the port keeps one storage seam
 * instead of two — the Expo host maps it to AsyncStorage or localStorage, and
 * tests to memory. It also keeps the storage layout, `store.<id>` holding only the
 * declared keys, which is what lets an installed app keep its state across this
 * migration.
 *
 * Each slice owns its own storage key, so one corrupt payload cannot take the
 * others down with it.
 */
export interface PersistedSlice {
  /**
   * The slice's key in the root reducer AND its storage key.
   *
   * Typed against `RootState` rather than left as a string: the writer looks the
   * slice up by this name, so a typo would hydrate correctly and then never write
   * again — `undefined === undefined` reads as "unchanged" forever. No throw, no
   * log, just settings that quietly stop surviving a restart.
   */
  id: keyof RootState & string;
  keys: string[];
  hydrate: (partial: Record<string, unknown>) => UnknownAction;
}

/**
 * Declares one slice as persisted, tying its id to its own key list and hydrate
 * action. The generic is what makes `keys` check against the slice's real state —
 * a typo there would otherwise persist nothing and say nothing.
 */
export function persisted<S extends object>(
  id: keyof RootState & string,
  keys: Array<keyof S & string>,
  hydrate: (partial: Partial<S>) => UnknownAction,
): PersistedSlice {
  return { id, keys, hydrate: hydrate as PersistedSlice['hydrate'] };
}

const DEBOUNCE_MS = 250;

function pick(source: Record<string, unknown>, keys: string[]): Record<string, unknown> {
  const slice: Record<string, unknown> = {};
  for (const key of keys) slice[key] = source[key];
  return slice;
}

export function persist(store: AppStore, slices: PersistedSlice[]): void {
  const kv = platform().keyValue;
  const state = () => store.getState() as unknown as Record<string, Record<string, unknown>>;

  for (const slice of slices) {
    const storageKey = `store.${slice.id}`;
    const raw = kv.getString(storageKey);
    if (!raw) continue;
    try {
      const saved = JSON.parse(raw) as Record<string, unknown>;
      // Only the declared keys, so a stale payload cannot inject unknown state
      // or clobber a field with data from an older app version.
      const restored: Record<string, unknown> = {};
      for (const key of slice.keys) {
        if (key in saved) restored[key] = saved[key];
      }
      store.dispatch(slice.hydrate(restored));
    } catch {
      // discard corrupt persistence instead of crashing at startup
      kv.remove(storageKey);
    }
  }

  /**
   * One subscription for all of them, with two guards before any timer is armed.
   *
   * Redux hands every subscriber every action, so both guards earn their keep:
   *
   * - **Nothing persisted changed → do nothing.** Immer gives a slice a new
   *   identity only when it actually changed, so the comparison is exact and
   *   costs one pointer per slice. Without it, an audio position tick — twice a
   *   second — would re-serialise the saved articles and the membership.
   *
   * - **An armed timer is never postponed.** This is a trailing-edge throttle,
   *   not a debounce, and the difference is the whole point: a debounce resets on
   *   every dispatch, so a burst of unrelated traffic (a pull-to-refresh patches
   *   six feeds, then media, then podcasts) would hold a bookmark the user just
   *   tapped out of storage until the burst ended. Arming on the FIRST change
   *   instead means the write lands 250 ms later no matter what else the app is
   *   doing.
   */
  let written = Object.fromEntries(slices.map((slice) => [slice.id, state()[slice.id]]));
  let timer: ReturnType<typeof setTimeout> | null = null;

  const dirty = (current: Record<string, Record<string, unknown>>) =>
    slices.some((slice) => current[slice.id] !== written[slice.id]);

  store.subscribe(() => {
    if (timer || !dirty(state())) return;
    timer = setTimeout(() => {
      timer = null;
      const current = state();
      for (const slice of slices) {
        if (current[slice.id] === written[slice.id]) continue;
        kv.setString(`store.${slice.id}`, JSON.stringify(pick(current[slice.id], slice.keys)));
      }
      written = Object.fromEntries(slices.map((slice) => [slice.id, current[slice.id]]));
    }, DEBOUNCE_MS);
  });
}
