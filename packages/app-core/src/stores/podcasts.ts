import { PODCAST_CHANNELS } from '../data/feeds.config';
import { podcastSeries as sampleSeries, type PodcastSeries } from '../data/podcasts';
import { platform } from '../ports';
import { getCached, getStale, setCached } from '../services/cache.service';
import { fetchPodcastSeries } from '../services/podcast.service';
import { createStore } from './create-store';

const CACHE_NS = 'podcasts';
const TTL_MS = 60 * 60 * 1000;

/**
 * How much of the list is real.
 *
 * - `ready`   — every curated show came back live.
 * - `partial` — some shows failed; the list mixes live, cached and bundled entries.
 * - `offline` — nothing was reachable, this is the typed sample seed.
 *
 * The NativeScript store had one flag for the last two, which is exactly the
 * distinction a demo needs to be able to make: "a show is missing" is not the
 * same as "you are looking at sample data".
 */
export type PodcastsStatus = 'idle' | 'loading' | 'ready' | 'partial' | 'offline';

export interface PodcastsState {
  series: PodcastSeries[];
  status: PodcastsStatus;
  fetchAll: (options?: { force?: boolean }) => Promise<void>;
}

/** Pure selector — see the note in stores/interests.ts for why not a method. */
export function findSeries(state: Pick<PodcastsState, 'series'>, id: string): PodcastSeries | null {
  return state.series.find((s) => s.id === id) ?? null;
}

/**
 * The Salon5 podcast library (Castopod).
 *
 * Cascade, deliberately explicit: fresh cache → the seven curated shows live,
 * each falling back to the host's bundled snapshot → stale cache → typed sample
 * seed. The list is never empty, online or off — the same promise the feed cache
 * makes.
 *
 * The per-show bundled snapshot used to be NativeScript-only, read with its
 * `File` API from a Pinia copy of this store. It reaches the core through the
 * `ContentBundle` port instead, so both hosts can offer it and neither needs a
 * second store to do it.
 */
export const podcastsStore = createStore<PodcastsState>((set, get) => ({
  series: [],
  status: 'idle',

  fetchAll: async (options = {}) => {
    const cached = options.force ? null : await getCached<PodcastSeries[]>(CACHE_NS, 'all', TTL_MS);
    if (cached?.length) {
      set({ series: cached, status: 'ready' });
      return;
    }
    if (get().series.length === 0) set({ status: 'loading' });

    let liveCount = 0;
    const results = await Promise.all(
      PODCAST_CHANNELS.map(async (handle) => {
        try {
          const series = await fetchPodcastSeries(handle);
          liveCount += 1;
          return series;
        } catch {
          return platform().content.podcastSeries(handle);
        }
      }),
    );
    const series = results.filter((s): s is PodcastSeries => !!s && s.episodes.length > 0);

    if (series.length > 0) {
      // The status describes what is on screen, not how many requests succeeded:
      // a show whose feed parsed but carried no episodes is just as missing as one
      // that timed out, and an empty tile is worse than no tile.
      set({ series, status: series.length === PODCAST_CHANNELS.length ? 'ready' : 'partial' });
      // Only cache when at least one show is live: caching a bundle-only list
      // would freeze the offline state in for a whole hour after the network came back.
      if (liveCount > 0) await setCached(CACHE_NS, 'all', series);
      return;
    }

    // Nothing reachable. Stale beats nothing, and the seed beats an empty screen.
    const stale = await getStale<PodcastSeries[]>(CACHE_NS, 'all');
    set({
      series: stale?.length ? stale : sampleSeries,
      status: stale?.length ? 'partial' : 'offline',
    });
  },
}));
