import AsyncStorage from '@react-native-async-storage/async-storage';

import type { BlobStore, ContentBundle, CorePlatform, KeyValueStore } from '@correctiv/app-core';
import type { Article } from '@correctiv/app-core/articles/types';

import { OFFLINE_ARTICLES, OFFLINE_FEEDS } from '@/lib/articles/offlineBundle.generated';
import { OFFLINE_COVERS } from '@/lib/articles/covers';
import { OFFLINE_PODCASTS } from '@/lib/podcasts/offlineBundle.generated';

/**
 * The Expo host's half of `@correctiv/app-core`'s platform ports — the only place
 * in this app that decides where persisted state physically lives. Works unchanged
 * on iOS, Android and web, because AsyncStorage ships a web build backed by
 * localStorage.
 *
 * Both ports are asynchronous by contract, so both are a thin passthrough. That is
 * new: `KeyValueStore` used to be synchronous, which forced this file to keep an
 * in-memory mirror of those keys, hydrate it at startup and flush writes behind
 * the caller's back — and to warn, twice, that reading before hydration starts the
 * app on empty state and then overwrites the real state on the first write. The
 * port went async when the premise behind its sync-ness expired (see the note on
 * `KeyValueStore` in the core's ports), and the mirror, the hydration step and
 * that whole failure mode went with it.
 *
 * What remains of the old arrangement, deliberately: `persist()` still debounces,
 * so a burst of writes still collapses into one — that throttle lives with the
 * caller that knows what changed, not here.
 */

const KV_PREFIX = 'kv:';
const BLOB_PREFIX = 'blob:';

/**
 * A read that fails and a key that is absent are the same thing to `persist()`:
 * it starts that slice from its initial state. Logged, because a broken storage
 * backend otherwise looks exactly like state that resets on its own.
 */
const keyValue: KeyValueStore = {
  async getString(key) {
    try {
      return await AsyncStorage.getItem(KV_PREFIX + key);
    } catch (err) {
      console.warn(`[platform] reading ${key} failed:`, err);
      return null;
    }
  },
  async setString(key, value) {
    await AsyncStorage.setItem(KV_PREFIX + key, value);
  },
  async remove(key) {
    await AsyncStorage.removeItem(KV_PREFIX + key);
  },
};

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
 * What this app ships in its bundle: the feed snapshots, pre-extracted articles and
 * inlined covers from `npm run offline-articles`, plus the podcast snapshots from
 * `npm run offline-podcasts`.
 *
 * On native these are what the first round of this port was for — the demo must not
 * depend on Wi-Fi. On **web** they used to be the only way content ever appeared;
 * since [ADR 0015](../../../../../adr/0015-reading-correctiv-org-through-its-rest-api.md)
 * articles come live from correctiv.org's REST API, which reflects the Origin. The
 * Castopod instance still sends no `Access-Control-Allow-Origin`, so the podcast
 * snapshot is what a browser gets, and every bundle here remains the floor when a
 * request fails.
 *
 * `image` answers with an inlined data URI rather than the remote URL it used to
 * echo back. Echoing it was a no-op: `adoptBundledImages` in the core swaps a feed
 * item's image for the bundled one precisely because the remote URL cannot load
 * when there is no network, and handing back the same URL left the offline lists
 * grey. It is the one entry that stays empty on web — `covers.web.ts` says why.
 */
const content: ContentBundle = {
  feed: (key) => OFFLINE_FEEDS[key] ?? null,
  article: (url) => (OFFLINE_ARTICLES[url] as Article | undefined) ?? null,
  image: (url) => OFFLINE_COVERS[url] ?? null,
  podcastSeries: (id) => OFFLINE_PODCASTS[id] ?? null,
};

/**
 * Storage and bundled content. The audio backend is the fourth port and is added
 * at the boot site (`app/_layout.tsx`) rather than here, so that reasoning about
 * where state is stored does not drag in an audio SDK — and so these three ports
 * stay testable without one.
 */
export const expoPlatform: CorePlatform = { keyValue, blobs, content };
