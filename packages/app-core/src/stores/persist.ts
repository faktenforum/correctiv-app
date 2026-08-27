import type { UnknownAction } from '@reduxjs/toolkit';

import { platform } from '../ports';
import type { AppStore } from './store';

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
  id: string;
  keys: string[];
  hydrate: (partial: Record<string, unknown>) => UnknownAction;
}

/**
 * Declares one slice as persisted, tying its id to its own key list and hydrate
 * action. The generic is what makes `keys` check against the slice's real state —
 * a typo there would otherwise persist nothing and say nothing.
 */
export function persisted<S extends object>(
  id: string,
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
   * One subscription for all of them, and a reference check per slice before
   * writing.
   *
   * Redux hands every subscriber every action, so without the check a position
   * tick from the audio player — twice a second — would re-serialise the saved
   * articles and the membership. Immer gives a slice a new identity only when it
   * actually changed, so the comparison is exact and costs one pointer per slice.
   */
  let written = Object.fromEntries(slices.map((slice) => [slice.id, state()[slice.id]]));
  let timer: ReturnType<typeof setTimeout> | null = null;

  store.subscribe(() => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      const current = state();
      for (const slice of slices) {
        if (current[slice.id] === written[slice.id]) continue;
        kv.setString(`store.${slice.id}`, JSON.stringify(pick(current[slice.id], slice.keys)));
      }
      written = Object.fromEntries(slices.map((slice) => [slice.id, current[slice.id]]));
    }, DEBOUNCE_MS);
  });
}
