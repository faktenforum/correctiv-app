import { defineStore } from 'pinia';
import { knownFolders, path, File } from '@nativescript/core';
import type { PodcastSeries } from '../data/podcasts';
import { podcastSeries as samplePodcastSeries } from '../data/podcasts';
import { PODCAST_CHANNELS } from '../data/feeds.config';
import { fetchPodcastSeries } from '../services/podcast.service';
import { getCached, getStale, setCached } from '../services/cache.service';

const CACHE_NS = 'podcasts';
const TTL_MS = 60 * 60 * 1000;

export type PodcastStatus = 'idle' | 'loading' | 'ready' | 'offline' | 'error';

/** Bundled offline snapshot from assets/data/podcasts/<id>.json (per show). */
function loadBundled(id: string): PodcastSeries | null {
  try {
    const file = path.join(
      knownFolders.currentApp().path,
      'assets',
      'data',
      'podcasts',
      `${id}.json`,
    );
    if (!File.exists(file)) return null;
    return JSON.parse(File.fromPath(file).readTextSync()) as PodcastSeries;
  } catch {
    return null;
  }
}

/**
 * Live Salon5 podcasts (Castopod). Cascade: fresh cache → live feeds (each show
 * falling back to its bundled snapshot on error) → stale cache → typed sample
 * seed. The list is always populated, online or off.
 */
export const usePodcastsStore = defineStore('podcasts', {
  state: () => ({
    series: [] as PodcastSeries[],
    status: 'idle' as PodcastStatus,
  }),
  actions: {
    async fetchAll(options: { force?: boolean } = {}) {
      const cached = options.force ? null : getCached<PodcastSeries[]>(CACHE_NS, 'all', TTL_MS);
      if (cached?.length) {
        this.series = cached;
        this.status = 'ready';
        return;
      }
      if (this.series.length === 0) this.status = 'loading';

      let liveCount = 0;
      const results = await Promise.all(
        PODCAST_CHANNELS.map(async (handle) => {
          try {
            const series = await fetchPodcastSeries(handle);
            liveCount += 1;
            return series;
          } catch {
            return loadBundled(handle);
          }
        }),
      );
      const series = results.filter(
        (s): s is PodcastSeries => !!s && s.episodes.length > 0,
      );

      if (series.length) {
        this.series = series;
        this.status = liveCount === PODCAST_CHANNELS.length ? 'ready' : 'offline';
        if (liveCount > 0) setCached(CACHE_NS, 'all', series);
        return;
      }

      // Nothing reachable — last-resort stale cache, then the typed sample seed.
      const stale = getStale<PodcastSeries[]>(CACHE_NS, 'all');
      this.series = stale?.length ? stale : samplePodcastSeries;
      this.status = 'offline';
    },
  },
});
