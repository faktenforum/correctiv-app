import type { Store } from './create-store';
import { platform } from '../ports';

/**
 * Minimal persistence adapter: hydrates a store through the KeyValueStore port
 * and writes the given state keys back, debounced.
 *
 * Deliberately not a storage middleware with its own codec: this core already
 * declares exactly what it needs from a host as a port, so going through the port
 * keeps one storage seam instead of two
 * — the NativeScript host maps it to ApplicationSettings, the Expo host to
 * AsyncStorage or localStorage, and tests to memory.
 *
 * `id` is explicit because a vanilla store, unlike a Pinia store, has no identity
 * of its own — the caller owns the storage key.
 */
export function persist<T extends object>(id: string, store: Store<T>, keys: string[]): void {
  const storageKey = `store.${id}`;
  const kv = platform().keyValue;

  const raw = kv.getString(storageKey);
  if (raw) {
    try {
      const saved = JSON.parse(raw) as Partial<T>;
      // Only the declared keys, so a stale payload cannot inject unknown state
      // or clobber an action with data from an older app version.
      const slice: Record<string, unknown> = {};
      for (const key of keys) {
        if (key in saved) slice[key] = (saved as Record<string, unknown>)[key];
      }
      store.setState(slice as Partial<T>);
    } catch {
      // discard corrupt persistence instead of crashing at startup
      kv.remove(storageKey);
    }
  }

  let timer: ReturnType<typeof setTimeout> | null = null;
  store.subscribe((state) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      const slice: Record<string, unknown> = {};
      for (const key of keys) slice[key] = (state as Record<string, unknown>)[key];
      kv.setString(storageKey, JSON.stringify(slice));
    }, 250);
  });
}
