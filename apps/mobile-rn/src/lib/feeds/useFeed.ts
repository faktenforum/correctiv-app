import { useCallback, useEffect, useState } from 'react';

import type { FeedItem, FeedSourceId, Video } from '@/lib/models';

import { getFeed, getVideos } from './client';
import type { YoutubeChannel } from './sources';

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
 * Lädt asynchrone Daten neu, wenn sich `run` (memoisiert pro Schlüssel) ändert
 * oder reload() aufgerufen wird. Die setState-Aufrufe leben in der inneren
 * async-Funktion, nicht synchron im Effekt-Body (React-Compiler-konform).
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

/** Ein RSS-Feed. */
export function useFeed(sourceId: FeedSourceId): AsyncState<FeedItem[]> {
  const run = useCallback(() => getFeed(sourceId), [sourceId]);
  return useAsyncData(run);
}

/** YouTube-Videos eines Kanals/einer Playlist. */
export function useVideos(channel: YoutubeChannel): AsyncState<Video[]> {
  const run = useCallback(() => getVideos(channel), [channel]);
  return useAsyncData(run);
}
