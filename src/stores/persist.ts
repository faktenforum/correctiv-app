import { ApplicationSettings } from '@nativescript/core';
import type { Store } from 'pinia';

/**
 * Minimal persistence adapter: hydrates the store from ApplicationSettings
 * and writes the given state keys back (debounced).
 * No pinia-plugin-persistedstate — that expects localStorage.
 */
export function persist(store: Store, keys: string[]) {
  const storageKey = `store.${store.$id}`;

  const raw = ApplicationSettings.getString(storageKey, '');
  if (raw) {
    try {
      store.$patch(JSON.parse(raw));
    } catch {
      // discard corrupt persistence instead of crashing at startup
      ApplicationSettings.remove(storageKey);
    }
  }

  let timer: ReturnType<typeof setTimeout> | null = null;
  store.$subscribe(() => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      const slice: Record<string, unknown> = {};
      for (const key of keys) slice[key] = (store.$state as Record<string, unknown>)[key];
      ApplicationSettings.setString(storageKey, JSON.stringify(slice));
    }, 250);
  });
}
