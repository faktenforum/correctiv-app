import { useEffect, useMemo } from 'react';
import { useStore } from 'zustand';

import {
  feedsStore,
  mergedFeedItems,
  mergedFeedStatus,
  type FeedStatus,
} from '@correctiv/app-core/stores/feeds';
import type { FeedItem, FeedKey } from '@correctiv/app-core/types/models';

/**
 * React bindings for the core's feed store.
 *
 * This used to be a `useAsyncData` hook over a `client.ts` of its own — one
 * request per mounting component, no shared state, and a second offline cascade
 * next to the NativeScript app's. The cascade is the core's now
 * (`stores/feeds.ts`), so Home and a project page reading the same feed share one
 * load, one cache entry and one status.
 *
 * The shape below is unchanged on purpose: every call site already destructures
 * `{ data, loading, error }`.
 */

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  reload: () => void;
}

/** `error` is derived rather than stored: the store's failure state IS `'error'`. */
function toAsyncState<T>(items: T | null, status: FeedStatus, reload: () => void): AsyncState<T> {
  return {
    data: items,
    loading: status === 'loading' || status === 'idle',
    error: status === 'error' ? new Error('Feed konnte nicht geladen werden') : null,
    reload,
  };
}

/**
 * One RSS feed, loaded on first use.
 *
 * `byKey[feed]` is a stable reference between updates (the store patches
 * immutably), so it is safe to select directly — unlike a selector that builds a
 * fresh object, which zustand v5 would hand to `useSyncExternalStore` and React
 * would reject with "the result of getSnapshot should be cached".
 */
export function useFeed(feed: FeedKey): AsyncState<FeedItem[]> {
  const slice = useStore(feedsStore, (s) => s.byKey[feed]);

  useEffect(() => {
    if (slice.status === 'idle') void feedsStore.getState().fetch(feed);
  }, [feed, slice.status]);

  return toAsyncState(
    slice.items.length > 0 ? slice.items : null,
    slice.status,
    () => void feedsStore.getState().fetch(feed, { force: true }),
  );
}

/**
 * Several feeds merged, newest first and deduplicated by URL.
 *
 * Pass a stable array (a module constant or a `useMemo` result) — a fresh literal
 * on every render would re-run the effect on every render.
 */
export function useMergedFeeds(feeds: FeedKey[]): AsyncState<FeedItem[]> {
  const byKey = useStore(feedsStore, (s) => s.byKey);

  useEffect(() => {
    void feedsStore.getState().fetchMany(feeds.filter((key) => byKey[key].status === 'idle'));
    // `byKey` is intentionally not a dependency: this only has to fire for feeds
    // that have never been asked for, and re-running it on every store update
    // would restart the fetch each time one of them lands.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feeds]);

  const items = useMemo(() => mergedFeedItems({ byKey }, feeds), [byKey, feeds]);
  const status = useMemo(() => mergedFeedStatus({ byKey }, feeds), [byKey, feeds]);

  return toAsyncState(
    items.length > 0 ? items : null,
    status,
    () => void Promise.all(feeds.map((key) => feedsStore.getState().fetch(key, { force: true }))),
  );
}
