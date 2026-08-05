import AsyncStorage from '@react-native-async-storage/async-storage';

import type { CorePlatform, FileStore, KeyValueStore } from '@correctiv/app-core';

/**
 * The Expo host's implementation of the core's platform ports — the only place in
 * this app that decides where persisted state physically lives. Works unchanged
 * on iOS, Android and web, because AsyncStorage ships a web build backed by
 * localStorage.
 *
 * ## Why there is a cache instead of a direct pass-through
 *
 * The core's KeyValueStore port is SYNCHRONOUS: `getString(key): string | null`.
 * That shape came from NativeScript's ApplicationSettings, which is synchronous.
 * AsyncStorage is not. Rather than make every core consumer async — the port is
 * read on the hot path by `persist()` at startup and by services on every cache
 * lookup — this adapter keeps an in-memory mirror:
 *
 *   - `hydrate()` loads everything once, before the app renders.
 *   - Reads are served from memory, so they stay synchronous.
 *   - Writes update memory immediately and flush to AsyncStorage in the
 *     background.
 *
 * The cost is explicit and bounded: state written in the same tick is readable
 * immediately, but a write is not yet durable when the call returns. Both
 * consumers of these ports already treat persistence as best-effort — the file
 * cache is a nicety, and losing the last few hundred milliseconds of settings on
 * a hard kill is acceptable. What is NOT acceptable is reading before hydration,
 * which is why `hydrate()` must be awaited before the first render; skip it and
 * the app starts with empty state and then overwrites the real state on first
 * write.
 */

const KV_PREFIX = 'kv:';
const FILE_PREFIX = 'file:';

/** Everything this adapter owns, mirrored in memory so reads can be sync. */
const memory = new Map<string, string>();

let hydrated = false;

function flush(key: string, value: string | null): void {
  const write = value === null ? AsyncStorage.removeItem(key) : AsyncStorage.setItem(key, value);
  // Best-effort: a failed write must not take the app down, but it must not be
  // silent either, or a broken storage backend looks like state that just resets.
  write.catch((err: unknown) => {
    console.warn(`[platform] persisting ${key} failed:`, err);
  });
}

/**
 * Loads persisted state into memory. Await this before rendering — see the note
 * above about why reading first is a correctness problem, not a performance one.
 */
export async function hydratePlatform(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const ours = keys.filter((k) => k.startsWith(KV_PREFIX) || k.startsWith(FILE_PREFIX));
    if (ours.length > 0) {
      for (const [key, value] of await AsyncStorage.multiGet(ours)) {
        if (value !== null) memory.set(key, value);
      }
    }
  } catch (err) {
    // Start with empty state rather than blocking launch on a storage fault.
    console.warn('[platform] hydration failed, continuing with empty state:', err);
  } finally {
    hydrated = true;
  }
}

/** True once hydratePlatform() has settled. Exposed for tests and diagnostics. */
export function isPlatformHydrated(): boolean {
  return hydrated;
}

const keyValue: KeyValueStore = {
  getString: (key) => memory.get(KV_PREFIX + key) ?? null,
  setString: (key, value) => {
    memory.set(KV_PREFIX + key, value);
    flush(KV_PREFIX + key, value);
  },
  remove: (key) => {
    memory.delete(KV_PREFIX + key);
    flush(KV_PREFIX + key, null);
  },
};

/**
 * The core's FileStore is a namespaced text-blob store, not a filesystem — so
 * key/value storage satisfies it directly and the same code works on web, where
 * there is no filesystem to speak of.
 */
const files: FileStore = {
  read: (namespace, name) => memory.get(`${FILE_PREFIX}${namespace}/${name}`) ?? null,
  write: (namespace, name, contents) => {
    const key = `${FILE_PREFIX}${namespace}/${name}`;
    memory.set(key, contents);
    flush(key, contents);
  },
};

export const expoPlatform: CorePlatform = { keyValue, files };

/** Test helper — drops the in-memory mirror without touching AsyncStorage. */
export function resetPlatformCache(): void {
  memory.clear();
  hydrated = false;
}
