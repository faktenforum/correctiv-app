import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/services/spotlight.service', () => ({ fetchSpotlightIssues: vi.fn() }));

import { spotlightIssues as seed, type SpotlightIssue } from '../src/data/spotlight';
import { configurePlatform, createMemoryPlatform } from '../src/ports';
import { clearMemoryCache, setCached } from '../src/services/cache.service';
import { fetchSpotlightIssues } from '../src/services/spotlight.service';
import { fetchIssues, latestIssue, recentIssues } from '../src/stores/spotlight';
import { createAppStore, type AppStore } from '../src/stores/store';

/**
 * The Spotlight archive: fresh cache → network → stale cache → the bundled seed.
 *
 * The rung worth testing is the last one. This screen carried a printed
 * disclaimer ("Beispielausgaben") for as long as the data was invented, and the
 * replacement for that disclaimer is `status === 'offline'` — so if the status
 * ever came back `'ready'` over seeded issues, the app would present four issues
 * from August 2026 as this morning's newsletter.
 */
const fetchMock = vi.mocked(fetchSpotlightIssues);
let store: AppStore;

function issue(id: string, date = '2026-08-31T06:00:00.000Z'): SpotlightIssue {
  return {
    id,
    date,
    subject: `Ausgabe ${id}`,
    teaser: 'Der Anreißer.',
    url: `https://correctiv.org/spotlight-newsletter/${id}/`,
    imageUrl: null,
  };
}

beforeEach(() => {
  store = createAppStore();
  fetchMock.mockReset();
  // Both layers, or a cache one test wrote is a stale hit in the next:
  // `clearMemoryCache` empties the in-memory layer, a fresh platform the blob store
  // behind it.
  clearMemoryCache();
  configurePlatform(createMemoryPlatform());
});

describe('loading the archive', () => {
  it('shows what the archive returns and caches it', async () => {
    fetchMock.mockResolvedValue([issue('a'), issue('b')]);

    await store.dispatch(fetchIssues());

    const state = store.getState().spotlight;
    expect(state.issues.map((i) => i.id)).toEqual(['a', 'b']);
    expect(state.status).toBe('ready');
  });

  it('does not hit the network while the cache is fresh', async () => {
    fetchMock.mockResolvedValue([issue('a')]);
    await store.dispatch(fetchIssues());
    fetchMock.mockClear();

    await store.dispatch(fetchIssues());

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('force refetches even with a fresh cache', async () => {
    fetchMock.mockResolvedValue([issue('a')]);
    await store.dispatch(fetchIssues());
    fetchMock.mockClear();

    await store.dispatch(fetchIssues({ force: true }));

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('when the archive is unreachable', () => {
  it('falls back to the seeded issues and says they are seeded', async () => {
    fetchMock.mockRejectedValue(new Error('Network request failed'));
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});

    await store.dispatch(fetchIssues());

    const state = store.getState().spotlight;
    expect(state.issues).toEqual(seed);
    // The line on screen depends on this exact value, not on `issues.length`.
    expect(state.status).toBe('offline');
    error.mockRestore();
  });

  it('prefers a stale cache over the seed, and calls that ready', async () => {
    await setCached('spotlight', 'all', [issue('yesterday')]);
    clearMemoryCache();
    const clock = vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 60 * 60 * 1000);
    fetchMock.mockRejectedValue(new Error('Network request failed'));
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});

    await store.dispatch(fetchIssues());

    const state = store.getState().spotlight;
    expect(state.issues.map((i) => i.id)).toEqual(['yesterday']);
    expect(state.status).toBe('ready');
    clock.mockRestore();
    error.mockRestore();
  });

  /** An empty archive is a failure, not an empty screen. */
  it('treats an empty response as a failure', async () => {
    fetchMock.mockResolvedValue([]);
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});

    await store.dispatch(fetchIssues());

    expect(store.getState().spotlight.status).toBe('offline');
    error.mockRestore();
  });
});

describe('the selectors Home reads', () => {
  const state = {
    issues: [issue('a'), issue('b'), issue('c'), issue('d')],
    status: 'ready' as const,
  };

  it('hands out the newest issue and the newest few', () => {
    expect(latestIssue(state)?.id).toBe('a');
    expect(recentIssues(state, 3).map((i) => i.id)).toEqual(['a', 'b', 'c']);
  });

  it('answers null rather than undefined for an empty archive', () => {
    expect(latestIssue({ issues: [], status: 'idle' })).toBeNull();
  });
});

describe('the seed', () => {
  /**
   * The seed is real content, so it has to stay usable: a screen renders every one
   * of these fields and an issue opens by its URL in a browser.
   */
  it('carries four real issues with everything a screen needs', () => {
    expect(seed).toHaveLength(4);
    for (const item of seed) {
      expect(item.subject.length).toBeGreaterThan(3);
      expect(item.teaser.length).toBeGreaterThan(10);
      expect(item.url).toMatch(/^https:\/\/correctiv\.org\/spotlight-newsletter\//);
      expect(() => new Date(item.date).toISOString()).not.toThrow();
    }
  });
});
