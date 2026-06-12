import { defineStore } from 'pinia';
import type { Video } from '../types/models';
import { YOUTUBE_FEEDS } from '../data/feeds.config';
import { fetchYoutubeFeed } from '../services/rss.service';
import { getCached, getStale, setCached } from '../services/cache.service';

const CACHE_NS = 'youtube';
const TTL_MS = 30 * 60 * 1000;

export type YoutubeKey = keyof typeof YOUTUBE_FEEDS;

interface VideoState {
  videos: Video[];
  status: 'idle' | 'loading' | 'ready' | 'error';
}

export const useMediaStore = defineStore('media', {
  state: () => ({
    byKey: {
      gespraech: { videos: [], status: 'idle' },
      funfacts: { videos: [], status: 'idle' },
      hauptkanal: { videos: [], status: 'idle' },
    } as Record<YoutubeKey, VideoState>,
  }),
  actions: {
    async fetch(key: YoutubeKey) {
      const state = this.byKey[key];
      const cached = getCached<Video[]>(CACHE_NS, key, TTL_MS);
      if (cached) {
        state.videos = cached;
        state.status = 'ready';
        return;
      }
      if (state.videos.length === 0) state.status = 'loading';
      try {
        const videos = await fetchYoutubeFeed(YOUTUBE_FEEDS[key]);
        state.videos = videos;
        state.status = 'ready';
        setCached(CACHE_NS, key, videos);
      } catch (err) {
        console.error(`YouTube-Feed '${key}' fehlgeschlagen:`, err instanceof Error ? err.message : err);
        const stale = getStale<Video[]>(CACHE_NS, key);
        if (stale) {
          state.videos = stale;
          state.status = 'ready';
        } else {
          state.status = 'error';
        }
      }
    },
  },
});
