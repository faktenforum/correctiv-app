import { createStore } from 'zustand/vanilla';
import type { Video } from '../types/models';
import { YOUTUBE_FEEDS, MEDIA_SOURCE, PEERTUBE_CHANNELS } from '../data/feeds.config';
import { fetchYoutubeFeed } from '../services/rss.service';
import { fetchPeertubeChannelAsVideos } from '../services/peertube.service';
import { getCached, getStale, setCached } from '../services/cache.service';

const TTL_MS = 30 * 60 * 1000;

export type YoutubeKey = keyof typeof YOUTUBE_FEEDS;

export interface VideoListState {
  videos: Video[];
  status: 'idle' | 'loading' | 'ready' | 'error';
}

export interface MediaState {
  byKey: Record<YoutubeKey, VideoListState>;
  fetch: (key: YoutubeKey) => Promise<void>;
}

export const mediaStore = createStore<MediaState>()((set, get) => {
  /** Replaces one channel's slice immutably — zustand's set is a shallow merge. */
  const patch = (key: YoutubeKey, slice: Partial<VideoListState>) =>
    set((state) => ({
      byKey: { ...state.byKey, [key]: { ...state.byKey[key], ...slice } },
    }));

  return {
    byKey: {
      gespraech: { videos: [], status: 'idle' },
      funfacts: { videos: [], status: 'idle' },
      hauptkanal: { videos: [], status: 'idle' },
    },

    fetch: async (key) => {
      const source = MEDIA_SOURCE[key];
      const cached = getCached<Video[]>(source, key, TTL_MS);
      if (cached) {
        patch(key, { videos: cached, status: 'ready' });
        return;
      }
      if (get().byKey[key].videos.length === 0) patch(key, { status: 'loading' });
      try {
        const videos =
          source === 'peertube'
            ? await fetchPeertubeChannelAsVideos(
                PEERTUBE_CHANNELS[key as keyof typeof PEERTUBE_CHANNELS],
              )
            : await fetchYoutubeFeed(YOUTUBE_FEEDS[key]);
        patch(key, { videos, status: 'ready' });
        setCached(source, key, videos);
      } catch (err) {
        console.error(
          `Media feed '${key}' (${source}) failed:`,
          err instanceof Error ? err.message : err,
        );
        const stale = getStale<Video[]>(source, key);
        if (stale) patch(key, { videos: stale, status: 'ready' });
        else patch(key, { status: 'error' });
      }
    },
  };
});
