import { ApplicationSettings } from '@nativescript/core';
import type { Store } from 'pinia';

/**
 * Minimaler Persistenz-Adapter: hydratisiert den Store aus ApplicationSettings
 * und schreibt die angegebenen State-Keys (debounced) zurück.
 * Kein pinia-plugin-persistedstate — das erwartet localStorage.
 */
export function persist(store: Store, keys: string[]) {
  const storageKey = `store.${store.$id}`;

  const raw = ApplicationSettings.getString(storageKey, '');
  if (raw) {
    try {
      store.$patch(JSON.parse(raw));
    } catch {
      // korrupte Persistenz verwerfen statt Crash beim Start
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
