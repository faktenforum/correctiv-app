import { beforeEach, describe, expect, it, vi } from 'vitest';

// The store's only network call. Mocked so the cascade can be driven per test.
vi.mock('../src/services/podcast.service', () => ({ fetchPodcastSeries: vi.fn() }));

import { PODCAST_CHANNELS } from '../src/data/feeds.config';
import { podcastSeries as sampleSeries, type PodcastSeries } from '../src/data/podcasts';
import { resetPlatform } from '../src/ports';
import { clearMemoryCache, setCached } from '../src/services/cache.service';
import { fetchPodcastSeries } from '../src/services/podcast.service';
import { fetchAll, findSeries } from '../src/stores/podcasts';
import { createAppStore, type AppStore } from '../src/stores/store';

/**
 * The podcast library's whole job is to never be empty: fresh cache → live shows
 * → stale cache → typed seed. Each rung is a promise to the demo ("never depends
 * on Wi-Fi"), and each is invisible until the network is actually down — which is
 * precisely when nobody is looking at a test run.
 */
const fetchMock = vi.mocked(fetchPodcastSeries);
let store: AppStore;

function series(id: string, episodes = 1): PodcastSeries {
  return {
    id,
    title: `Show ${id}`,
    publisher: 'Salon5',
    description: '…',
    imageUrl: null,
    episodes: Array.from({ length: episodes }, (_, i) => ({
      id: `${id}-e${i}`,
      title: `Folge ${i}`,
      date: '2026-06-12T10:00:00.000Z',
      durationLabel: '12 Min.',
      audio: `https://salon5.correctiv.net/${id}/${i}.mp3`,
    })),
  };
}

beforeEach(() => {
  store = createAppStore();
  fetchMock.mockReset();
  clearMemoryCache();
  // A fresh in-memory BlobStore, so no blob cache survives into the next test.
  resetPlatform();
});

describe('podcasts store', () => {
  it('reports ready when every curated show comes back', async () => {
    fetchMock.mockImplementation((handle: string) => Promise.resolve(series(handle)));

    await store.dispatch(fetchAll());

    expect(fetchMock).toHaveBeenCalledTimes(PODCAST_CHANNELS.length);
    expect(store.getState().podcasts.series).toHaveLength(PODCAST_CHANNELS.length);
    expect(store.getState().podcasts.status).toBe('ready');
  });

  it('reports partial when a single show fails, and keeps the rest', async () => {
    fetchMock.mockImplementation((handle: string) =>
      handle === PODCAST_CHANNELS[0]
        ? Promise.reject(new Error('HTTP 502'))
        : Promise.resolve(series(handle)),
    );

    await store.dispatch(fetchAll());

    const state = store.getState().podcasts;
    expect(state.series).toHaveLength(PODCAST_CHANNELS.length - 1);
    expect(state.status).toBe('partial');
    // One broken show must not take the library down with it.
    expect(findSeries(state, PODCAST_CHANNELS[0])).toBeNull();
    expect(findSeries(state, PODCAST_CHANNELS[1])?.title).toBe(`Show ${PODCAST_CHANNELS[1]}`);
  });

  it('drops a show that answers with no episodes', async () => {
    // A feed that parses but carries nothing renders as an empty tile — worse
    // than not being offered at all.
    fetchMock.mockImplementation((handle: string) =>
      Promise.resolve(series(handle, handle === PODCAST_CHANNELS[0] ? 0 : 2)),
    );

    await store.dispatch(fetchAll());

    expect(store.getState().podcasts.series.map((s) => s.id)).not.toContain(PODCAST_CHANNELS[0]);
    expect(store.getState().podcasts.status).toBe('partial');
  });

  it('serves the typed seed when nothing is reachable', async () => {
    fetchMock.mockRejectedValue(new Error('Network request failed'));

    await store.dispatch(fetchAll());

    expect(store.getState().podcasts.series).toEqual(sampleSeries);
    expect(store.getState().podcasts.status).toBe('offline');
    // The seed must stay playable, or the offline demo has a dead play button.
    expect(sampleSeries.every((s) => s.episodes.every((e) => e.audio.length > 0))).toBe(true);
  });

  it('prefers a stale cache over the seed', async () => {
    await setCached('podcasts', 'all', [series('pausenbrot')]);
    clearMemoryCache(); // force the read to go through the blob layer
    // Past the one-hour TTL: fresh cache and stale cache are the same bytes, and
    // only the clock tells the two code paths apart.
    const later = Date.now() + 2 * 60 * 60 * 1000;
    const clock = vi.spyOn(Date, 'now').mockReturnValue(later);
    fetchMock.mockRejectedValue(new Error('Network request failed'));

    await store.dispatch(fetchAll());

    expect(fetchMock).toHaveBeenCalled(); // i.e. the fresh-cache path was NOT taken
    expect(store.getState().podcasts.series.map((s) => s.id)).toEqual(['pausenbrot']);
    expect(store.getState().podcasts.status).toBe('partial');
    clock.mockRestore();
  });

  it('does not hit the network while the cache is fresh', async () => {
    fetchMock.mockImplementation((handle: string) => Promise.resolve(series(handle)));
    await store.dispatch(fetchAll());
    fetchMock.mockClear();

    await store.dispatch(fetchAll());

    expect(fetchMock).not.toHaveBeenCalled();
    expect(store.getState().podcasts.status).toBe('ready');
  });

  it('force refetches even with a fresh cache', async () => {
    fetchMock.mockImplementation((handle: string) => Promise.resolve(series(handle)));
    await store.dispatch(fetchAll());
    fetchMock.mockClear();

    await store.dispatch(fetchAll({ force: true }));

    expect(fetchMock).toHaveBeenCalledTimes(PODCAST_CHANNELS.length);
  });
});
