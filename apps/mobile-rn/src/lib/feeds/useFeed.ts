import { useCallback, useEffect, useState } from 'react';

import type { FeedItem, FeedKey } from '@correctiv/app-core/types/models';

import { getFeed, getFeeds } from './client';

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  reload: () => void;
}

interface InternalState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

/**
 * Reloads when `run` (memoised per key) changes or reload() is called. The
 * setState calls live inside the inner async function rather than synchronously
 * in the effect body, which is what keeps this React-Compiler-safe.
 */
function useAsyncData<T>(run: () => Promise<T>): AsyncState<T> {
  const [state, setState] = useState<InternalState<T>>({ data: null, loading: true, error: null });
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setState((prev) => ({ data: prev.data, loading: true, error: null }));
      try {
        const result = await run();
        if (active) setState({ data: result, loading: false, error: null });
      } catch (err) {
        if (active) {
          setState({
            data: null,
            loading: false,
            error: err instanceof Error ? err : new Error(String(err)),
          });
        }
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [run, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  return { ...state, reload };
}

/** One RSS feed. */
export function useFeed(feed: FeedKey): AsyncState<FeedItem[]> {
  const run = useCallback(() => getFeed(feed), [feed]);
  return useAsyncData(run);
}

/**
 * Several feeds merged, newest first and deduplicated by URL. Pass a stable
 * array (a module constant or a useMemo result) — a fresh literal on every
 * render would refetch on every render.
 */
export function useMergedFeeds(feeds: FeedKey[]): AsyncState<FeedItem[]> {
  const run = useCallback(() => getFeeds(feeds), [feeds]);
  return useAsyncData(run);
}
