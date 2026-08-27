import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import { loadPageMeta } from '../articles/load';
import { FEEDS } from '../data/feeds.config';
import { platform } from '../ports';
import { getCached, getStale, setCached } from '../services/cache.service';
import { fetchFeed } from '../services/rss.service';
import type { FeedItem, FeedKey } from '../types/models';
import type { AppThunk } from './store';

/**
 * The article feeds.
 *
 * One cascade for every host: fresh cache → stale-while-revalidate → network →
 * the host's bundled snapshot. The host contributes only its bundle (via the
 * `ContentBundle` port) and its own reactivity binding.
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
}

const ALL_KEYS = Object.keys(FEEDS) as FeedKey[];

/** One slice per configured feed, so the state cannot drift from the catalogue. */
function emptySlices(): Record<FeedKey, FeedSlice> {
  const slices = {} as Record<FeedKey, FeedSlice>;
  for (const key of ALL_KEYS) slices[key] = { items: [], status: 'idle', lastFetched: 0 };
  return slices;
}

const initialState: FeedsState = { byKey: emptySlices() };

// --- pure selectors (see stores/interests.ts for why not part of the slice) ---

export function feedItems(state: FeedsState, key: FeedKey): FeedItem[] {
  return state.byKey[key].items;
}

/** Several feeds as one stream: newest first, one entry per article. */
export function mergedFeedItems(state: FeedsState, keys: FeedKey[]): FeedItem[] {
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
export function mergedFeedStatus(state: FeedsState, keys: FeedKey[]): FeedStatus {
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

const slice = createSlice({
  name: 'feeds',
  initialState,
  reducers: {
    /**
     * Replaces one feed's slice. Immer patches in place, so the other feeds keep
     * their object identity — see the same note in stores/media.ts for why that
     * matters to every component selecting `byKey[key]`.
     */
    patch: {
      reducer(state, action: PayloadAction<{ key: FeedKey; slice: Partial<FeedSlice> }>) {
        Object.assign(state.byKey[action.payload.key], action.payload.slice);
      },
      prepare: (key: FeedKey, slice: Partial<FeedSlice>) => ({ payload: { key, slice } }),
    },
  },
});

export const feedsReducer = slice.reducer;
export const { patch } = slice.actions;

/** One feed: cache-first, stale-while-revalidate, bundled snapshot as the floor. */
export const fetchFeedKey =
  (key: FeedKey, options: { force?: boolean } = {}): AppThunk<Promise<void>> =>
  async (dispatch, getState) => {
    const cached = options.force ? null : await getCached<FeedItem[]>(CACHE_NS, key, TTL_MS);
    if (cached) {
      dispatch(patch(key, { items: cached, status: 'ready' }));
      return;
    }

    // Stale-while-revalidate: show what we have, then go to the network.
    const current = getState().feeds.byKey[key];
    if (current.items.length === 0) {
      const stale = await getStale<FeedItem[]>(CACHE_NS, key);
      dispatch(
        patch(key, stale?.length ? { items: stale, status: 'ready' } : { status: 'loading' }),
      );
    }

    try {
      const items = await fetchFeed(key, FEEDS[key].url);
      // Carry over images an earlier enrichment already resolved, so a refresh
      // does not blank every thumbnail for one more round of requests.
      const known = new Map(getState().feeds.byKey[key].items.map((i) => [i.id, i.imageUrl]));
      const merged = items.map((item) => {
        const image = item.imageUrl ?? known.get(item.id);
        return image ? { ...item, imageUrl: image } : item;
      });
      dispatch(patch(key, { items: merged, status: 'ready', lastFetched: Date.now() }));
      await setCached(CACHE_NS, key, merged);
    } catch (err) {
      console.error(`Feed '${key}' failed:`, err instanceof Error ? err.message : err);
      const shown = getState().feeds.byKey[key].items;
      if (shown.length > 0) {
        dispatch(patch(key, { items: adoptBundledImages(shown) }));
        return;
      }
      const snapshot = platform().content.feed(key);
      dispatch(
        patch(
          key,
          snapshot?.length
            ? { items: adoptBundledImages(snapshot), status: 'offline' }
            : { status: 'error' },
        ),
      );
    }
  };

/** Several feeds at once; failures are skipped, not fatal. */
export const fetchMany =
  (keys: FeedKey[]): AppThunk<Promise<void>> =>
  async (dispatch) => {
    await Promise.all(keys.map((key) => dispatch(fetchFeedKey(key))));
  };

/** Load one item's lead image and patch it in place. */
export const enrichImage =
  (key: FeedKey, itemId: string): AppThunk<Promise<void>> =>
  async (dispatch, getState) => {
    const item = getState().feeds.byKey[key].items.find((i) => i.id === itemId);
    if (!item || item.imageUrl) return;
    const { heroImageUrl } = await loadPageMeta(item.url);
    if (!heroImageUrl) return;
    const items = getState().feeds.byKey[key].items.map((i) =>
      i.id === itemId ? { ...i, imageUrl: heroImageUrl } : i,
    );
    dispatch(patch(key, { items }));
    await setCached(CACHE_NS, key, items);
  };

export const feedsActions = { ...slice.actions, fetch: fetchFeedKey, fetchMany, enrichImage };
