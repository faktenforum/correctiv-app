import AsyncStorage from '@react-native-async-storage/async-storage';

import type { BlobStore, ContentBundle, CorePlatform, KeyValueStore } from '@correctiv/app-core';
import type { Article } from '@correctiv/app-core/articles/types';

import { OFFLINE_ARTICLES, OFFLINE_FEEDS } from '@/lib/articles/offlineBundle.generated';

/**
 * The Expo host's half of `@correctiv/app-core`'s platform ports — the only place
 * in this app that decides where persisted state physically lives. Works unchanged
 * on iOS, Android and web, because AsyncStorage ships a web build backed by
 * localStorage.
 *
 * ## Why one port is mirrored in memory and the other is not
 *
 * `KeyValueStore` is SYNCHRONOUS by contract: `persist()` reads it while a store
 * is being constructed, before anything can await. So this adapter hydrates those
 * keys once at startup and answers reads from memory, flushing writes in the
 * background. The cost is bounded and explicit: state written in the same tick is
 * readable immediately, but a write is not yet durable when the call returns.
 * Losing the last few hundred milliseconds of settings on a hard kill is
 * acceptable. Reading BEFORE hydration is not — `hydratePlatform()` must be
 * awaited before the first render, or the app starts with empty state and then
 * overwrites the real state on the first write.
 *
 * `BlobStore` needs none of that, because it is asynchronous by contract. It used
 * to be sync too, which forced this adapter to pull every cached feed — a megabyte
 * of them — into memory before the first frame just to be able to answer a read.
 * Those go straight to AsyncStorage now.
 */

const KV_PREFIX = 'kv:';
const BLOB_PREFIX = 'blob:';

/** The KeyValueStore's keys, mirrored so reads can stay synchronous. */
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
 * Loads the synchronous half of storage into memory. Await this before rendering —
 * see the note above about why reading first is a correctness problem, not a
 * performance one.
 */
export async function hydratePlatform(): Promise<void> {
  try {
    const keys = (await AsyncStorage.getAllKeys()).filter((k) => k.startsWith(KV_PREFIX));
    if (keys.length > 0) {
      for (const [key, value] of await AsyncStorage.multiGet(keys)) {
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
 * The core's BlobStore is a namespaced text-blob store, not a filesystem, so
 * key/value storage satisfies it directly — and the same code works on web, where
 * there is no filesystem to speak of.
 */
const blobs: BlobStore = {
  async read(namespace, name) {
    try {
      return await AsyncStorage.getItem(`${BLOB_PREFIX}${namespace}/${name}`);
    } catch {
      return null; // a cache miss and a broken cache are the same thing to a caller
    }
  },
  async write(namespace, name, contents) {
    try {
      await AsyncStorage.setItem(`${BLOB_PREFIX}${namespace}/${name}`, contents);
    } catch (err) {
      console.warn('[platform] caching a blob failed:', err);
    }
  },
};

/**
 * What this app ships in its bundle: the feed snapshots and pre-extracted articles
 * from `npm run offline-articles`.
 *
 * On native the snapshots are what the first round of this port was for — the demo
 * must not depend on Wi-Fi. On **web** they are not a fallback at all but the only
 * way an article ever appears: correctiv.org sends no `Access-Control-Allow-Origin`,
 * so a browser blocks every feed request, the store's cascade lands here, and Home
 * shows the snapshot instead of an error. That is why this host bundles them now
 * where it used to answer null — the fix was a generator output, not a core change.
 *
 * Still no podcast snapshots. The NativeScript app bundles those (JSON in its app
 * folder) and this one does not, which is exactly the asymmetry the port absorbs.
 */
const content: ContentBundle = {
  feed: (key) => OFFLINE_FEEDS[key] ?? null,
  article: (url) => (OFFLINE_ARTICLES[url] as Article | undefined) ?? null,
  image: (url) => OFFLINE_ARTICLES[url]?.heroImageUrl ?? null,
  podcastSeries: () => null,
};

/**
 * Storage and bundled content. The audio backend is the fourth port and is added
 * at the boot site (`app/_layout.tsx`) rather than here, so that reasoning about
 * where state is stored does not drag in an audio SDK — and so these three ports
 * stay testable without one.
 */
export const expoPlatform: CorePlatform = { keyValue, blobs, content };

/** Test helper — drops the in-memory mirror without touching AsyncStorage. */
export function resetPlatformCache(): void {
  memory.clear();
  hydrated = false;
}
