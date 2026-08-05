import { PODCAST_CHANNELS } from '../data/feeds.config';
import { podcastSeries as sampleSeries, type PodcastSeries } from '../data/podcasts';
import { getCached, getStale, setCached } from '../services/cache.service';
import { fetchPodcastSeries } from '../services/podcast.service';
import { createStore } from './create-store';

const CACHE_NS = 'podcasts';
const TTL_MS = 60 * 60 * 1000;

/**
 * How much of the list is real.
 *
 * - `ready`   — every curated show came back live.
 * - `partial` — some shows failed; the list mixes live and cached entries.
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
 * Cascade, deliberately explicit: fresh cache → the seven curated shows live →
 * stale cache → typed sample seed. The list is never empty, online or off —
 * same promise the feed cache makes.
 *
 * One layer of the NativeScript version is gone: it could also read a bundled
 * per-show snapshot from `assets/data/podcasts/<id>.json`, using NativeScript's
 * `File`. That is a platform API the core must not touch, and the Expo app ships
 * no such snapshots. The stale cache and the seed cover the same ground.
 */
export const podcastsStore = createStore<PodcastsState>((set, get) => ({
  series: [],
  status: 'idle',

  fetchAll: async (options = {}) => {
    const cached = options.force ? null : getCached<PodcastSeries[]>(CACHE_NS, 'all', TTL_MS);
    if (cached?.length) {
      set({ series: cached, status: 'ready' });
      return;
    }
    if (get().series.length === 0) set({ status: 'loading' });

    const results = await Promise.all(
      PODCAST_CHANNELS.map(async (handle) => {
        try {
          return await fetchPodcastSeries(handle);
        } catch {
          return null;
        }
      }),
    );
    const live = results.filter((s): s is PodcastSeries => s !== null && s.episodes.length > 0);

    if (live.length > 0) {
      set({
        series: live,
        status: live.length === PODCAST_CHANNELS.length ? 'ready' : 'partial',
      });
      setCached(CACHE_NS, 'all', live);
      return;
    }

    // Nothing reachable. Stale beats nothing, and the seed beats an empty screen.
    const stale = getStale<PodcastSeries[]>(CACHE_NS, 'all');
    set({
      series: stale?.length ? stale : sampleSeries,
      status: stale?.length ? 'partial' : 'offline',
    });
  },
}));
