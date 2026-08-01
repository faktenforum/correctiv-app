import type { Store } from 'pinia';
import { platform } from '../ports';

/**
 * Minimal persistence adapter: hydrates the store through the KeyValueStore port
 * and writes the given state keys back (debounced).
 * No pinia-plugin-persistedstate — that expects localStorage, which does not
 * exist in the NativeScript runtime.
 */
export function persist(store: Store, keys: string[]) {
  const storageKey = `store.${store.$id}`;
  const kv = platform().keyValue;

  const raw = kv.getString(storageKey);
  if (raw) {
    try {
      store.$patch(JSON.parse(raw));
    } catch {
      // discard corrupt persistence instead of crashing at startup
      kv.remove(storageKey);
    }
  }

  let timer: ReturnType<typeof setTimeout> | null = null;
  store.$subscribe(() => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      const slice: Record<string, unknown> = {};
      for (const key of keys) slice[key] = (store.$state as Record<string, unknown>)[key];
      kv.setString(storageKey, JSON.stringify(slice));
    }, 250);
  });
}
