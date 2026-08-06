import { loadPageMeta } from '../articles/load';
import { FEEDS } from '../data/feeds.config';
import { platform } from '../ports';
import { getCached, getStale, setCached } from '../services/cache.service';
import { fetchFeed } from '../services/rss.service';
import type { FeedItem, FeedKey } from '../types/models';
import { createStore } from './create-store';

/**
 * The article feeds.
 *
 * The last store that existed twice: a Pinia store in the NativeScript app and a
 * `client.ts` + `useFeed.ts` pair in the Expo app. Same feeds, same cache, but
 * only one of them did stale-while-revalidate and only one of them borrowed
 * bundled cover images when the network was gone — so the two apps failed
 * differently offline, which is the one thing a demo cannot afford.
 *
 * This is both, and the host contributes only its bundle (via the `ContentBundle`
 * port) and its own reactivity binding.
 */

const CACHE_NS = 'feeds';
const TTL_MS = 15 * 60 * 1000;

/**
 * How much of a feed is real.
 *
 * `offline` is not an error: it means the list on screen came out of the app
 * bundle. A user should be able to tell that from "we have nothing for you".
 */
export type FeedStatus = 'idle' | 'loading' | 'ready' | 'offline' | 'error';

export interface FeedSlice {
  items: FeedItem[];
  status: FeedStatus;
  /** Epoch ms of the last successful network read; 0 if there was none. */
  lastFetched: number;
}

export interface FeedsState {
  byKey: Record<FeedKey, FeedSlice>;
  fetch: (key: FeedKey, options?: { force?: boolean }) => Promise<void>;
  /** Several feeds at once; failures are skipped, not fatal. */
  fetchMany: (keys: FeedKey[]) => Promise<void>;
  /** Load one item's lead image and patch it in place. */
  enrichImage: (key: FeedKey, itemId: string) => Promise<void>;
}

const ALL_KEYS = Object.keys(FEEDS) as FeedKey[];

/** One slice per configured feed, so the store cannot drift from the catalogue. */
function emptySlices(): Record<FeedKey, FeedSlice> {
  const slices = {} as Record<FeedKey, FeedSlice>;
  for (const key of ALL_KEYS) slices[key] = { items: [], status: 'idle', lastFetched: 0 };
  return slices;
}

// --- pure selectors (see stores/interests.ts for why not methods) -------------

export function feedItems(state: Pick<FeedsState, 'byKey'>, key: FeedKey): FeedItem[] {
  return state.byKey[key].items;
}

/** Several feeds as one stream: newest first, one entry per article. */
export function mergedFeedItems(state: Pick<FeedsState, 'byKey'>, keys: FeedKey[]): FeedItem[] {
  const seen = new Set<string>();
  const items: FeedItem[] = [];
  for (const key of keys) {
    for (const item of state.byKey[key].items) {
      if (seen.has(item.url)) continue;
      seen.add(item.url);
      items.push(item);
    }
  }
  return items.sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1));
}

/** The worst status among `keys` — what a merged list should show. */
export function mergedFeedStatus(state: Pick<FeedsState, 'byKey'>, keys: FeedKey[]): FeedStatus {
  const statuses = keys.map((key) => state.byKey[key].status);
  if (statuses.some((s) => s === 'ready')) return 'ready';
  if (statuses.some((s) => s === 'offline')) return 'offline';
  if (statuses.some((s) => s === 'loading')) return 'loading';
  if (statuses.every((s) => s === 'error')) return 'error';
  return 'idle';
}

/**
 * Swap remote image URLs for bundled covers where the host has one.
 *
 * Offline this is the difference between a list of articles and a list of grey
 * rectangles: stale items still carry the remote URLs they were fetched with, and
 * none of those can load.
 */
function adoptBundledImages(items: FeedItem[]): FeedItem[] {
  const { content } = platform();
  return items.map((item) => {
    const local = content.image(item.url);
    return local ? { ...item, imageUrl: local } : item;
  });
}

export const feedsStore = createStore<FeedsState>((set, get) => {
  /** Replaces one feed's slice immutably — `set` is a shallow merge. */
  const patch = (key: FeedKey, slice: Partial<FeedSlice>) =>
    set((state) => ({
      byKey: { ...state.byKey, [key]: { ...state.byKey[key], ...slice } },
    }));

  return {
    byKey: emptySlices(),

    fetch: async (key, options = {}) => {
      const cached = options.force ? null : await getCached<FeedItem[]>(CACHE_NS, key, TTL_MS);
      if (cached) {
        patch(key, { items: cached, status: 'ready' });
        return;
      }

      // Stale-while-revalidate: show what we have, then go to the network.
      const current = get().byKey[key];
      if (current.items.length === 0) {
        const stale = await getStale<FeedItem[]>(CACHE_NS, key);
        patch(key, stale?.length ? { items: stale, status: 'ready' } : { status: 'loading' });
      }

      try {
        const items = await fetchFeed(key, FEEDS[key].url);
        // Carry over images an earlier enrichment already resolved, so a refresh
        // does not blank every thumbnail for one more round of requests.
        const known = new Map(get().byKey[key].items.map((i) => [i.id, i.imageUrl]));
        const merged = items.map((item) => {
          const image = item.imageUrl ?? known.get(item.id);
          return image ? { ...item, imageUrl: image } : item;
        });
        patch(key, { items: merged, status: 'ready', lastFetched: Date.now() });
        await setCached(CACHE_NS, key, merged);
      } catch (err) {
        console.error(`Feed '${key}' failed:`, err instanceof Error ? err.message : err);
        const shown = get().byKey[key].items;
        if (shown.length > 0) {
          patch(key, { items: adoptBundledImages(shown) });
          return;
        }
        const snapshot = platform().content.feed(key);
        patch(
          key,
          snapshot?.length
            ? { items: adoptBundledImages(snapshot), status: 'offline' }
            : { status: 'error' },
        );
      }
    },

    fetchMany: async (keys) => {
      await Promise.all(keys.map((key) => get().fetch(key)));
    },

    enrichImage: async (key, itemId) => {
      const item = get().byKey[key].items.find((i) => i.id === itemId);
      if (!item || item.imageUrl) return;
      const { heroImageUrl } = await loadPageMeta(item.url);
      if (!heroImageUrl) return;
      const items = get().byKey[key].items.map((i) =>
        i.id === itemId ? { ...i, imageUrl: heroImageUrl } : i,
      );
      patch(key, { items });
      await setCached(CACHE_NS, key, items);
    },
  };
});
