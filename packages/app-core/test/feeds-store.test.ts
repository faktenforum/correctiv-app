import { beforeEach, describe, expect, it, vi } from 'vitest';

// The store's only network call. Mocked so the cascade can be driven per test.
vi.mock('../src/services/rss.service', () => ({ fetchFeed: vi.fn() }));

import { configurePlatform, createEmptyContentBundle, createMemoryPlatform } from '../src/ports';
import { clearMemoryCache, setCached } from '../src/services/cache.service';
import { fetchFeed } from '../src/services/rss.service';
import { feedsStore, mergedFeedItems, mergedFeedStatus, type FeedSlice } from '../src/stores/feeds';
import type { FeedItem, FeedKey } from '../src/types/models';

/**
 * The feed cascade: fresh cache → stale cache while revalidating → network →
 * bundled snapshot → error. Every rung is a promise to the demo ("never depends on
 * Wi-Fi") and every one of them is invisible until the network is actually down —
 * which is exactly when nobody is watching a test run.
 *
 * The two apps used to implement this twice and disagree about two rungs, so these
 * assertions now cover both of them.
 */
const fetchMock = vi.mocked(fetchFeed);
const initial = feedsStore.getState();

function item(id: string, publishedAt = '2026-06-12T10:00:00.000Z'): FeedItem {
  return {
    id,
    feed: 'recherchen',
    title: `Artikel ${id}`,
    url: `https://correctiv.org/${id}/`,
    teaser: '…',
    publishedAt,
    categories: [],
    imageUrl: null,
  };
}

function slices(partial: Partial<Record<FeedKey, Partial<FeedSlice>>>) {
  const byKey = { ...feedsStore.getState().byKey };
  for (const [key, patch] of Object.entries(partial)) {
    byKey[key as FeedKey] = { ...byKey[key as FeedKey], ...patch };
  }
  return { byKey };
}

beforeEach(() => {
  feedsStore.setState(initial, true);
  fetchMock.mockReset();
  clearMemoryCache();
  configurePlatform(createMemoryPlatform());
});

describe('loading one feed', () => {
  it('shows what the network returns and caches it', async () => {
    fetchMock.mockResolvedValue([item('a'), item('b')]);

    await feedsStore.getState().fetch('recherchen');

    const slice = feedsStore.getState().byKey.recherchen;
    expect(slice.items.map((i) => i.id)).toEqual(['a', 'b']);
    expect(slice.status).toBe('ready');
    expect(slice.lastFetched).toBeGreaterThan(0);
  });

  it('does not hit the network while the cache is fresh', async () => {
    fetchMock.mockResolvedValue([item('a')]);
    await feedsStore.getState().fetch('recherchen');
    fetchMock.mockClear();

    await feedsStore.getState().fetch('recherchen');

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('force refetches even with a fresh cache', async () => {
    fetchMock.mockResolvedValue([item('a')]);
    await feedsStore.getState().fetch('recherchen');
    fetchMock.mockClear();

    await feedsStore.getState().fetch('recherchen', { force: true });

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  /**
   * Stale-while-revalidate is the difference between a spinner and a screen: an
   * expired cache is shown immediately, and the network result replaces it.
   */
  it('shows an expired cache at once and then the network result', async () => {
    await setCached('feeds', 'recherchen', [item('old')]);
    clearMemoryCache();
    const later = Date.now() + 60 * 60 * 1000;
    const clock = vi.spyOn(Date, 'now').mockReturnValue(later);

    let release: (items: FeedItem[]) => void = () => {};
    fetchMock.mockReturnValue(new Promise((resolve) => (release = resolve)));
    const pending = feedsStore.getState().fetch('recherchen');
    // A macrotask, so every pending microtask of the stale read has settled —
    // counting `await Promise.resolve()`s would break on the next refactor.
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(feedsStore.getState().byKey.recherchen.items.map((i) => i.id)).toEqual(['old']);
    expect(feedsStore.getState().byKey.recherchen.status).toBe('ready');

    release([item('fresh')]);
    await pending;
    expect(feedsStore.getState().byKey.recherchen.items.map((i) => i.id)).toEqual(['fresh']);
    clock.mockRestore();
  });

  it('keeps images an earlier enrichment resolved across a refresh', async () => {
    fetchMock.mockResolvedValue([item('a')]);
    await feedsStore.getState().fetch('recherchen');
    feedsStore.setState(
      slices({ recherchen: { items: [{ ...item('a'), imageUrl: 'https://x/cover.jpg' }] } }),
    );

    await feedsStore.getState().fetch('recherchen', { force: true });

    expect(feedsStore.getState().byKey.recherchen.items[0].imageUrl).toBe('https://x/cover.jpg');
  });
});

describe('when the network is gone', () => {
  it('falls back to the bundled snapshot and says so', async () => {
    fetchMock.mockRejectedValue(new Error('Network request failed'));
    configurePlatform({
      ...createMemoryPlatform(),
      content: { ...createEmptyContentBundle(), feed: () => [item('bundled')] },
    });
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});

    await feedsStore.getState().fetch('recherchen');

    const slice = feedsStore.getState().byKey.recherchen;
    expect(slice.items.map((i) => i.id)).toEqual(['bundled']);
    // Not 'error': the list on screen is real content, just not today's.
    expect(slice.status).toBe('offline');
    error.mockRestore();
  });

  /**
   * Stale items still carry the remote image URLs they were fetched with, and none
   * of those can load offline — so the bundle's local covers are borrowed. Without
   * this the offline demo is a list of grey rectangles.
   */
  it('borrows bundled cover images for items it is already showing', async () => {
    fetchMock.mockResolvedValueOnce([item('a')]);
    await feedsStore.getState().fetch('recherchen');

    configurePlatform({
      ...createMemoryPlatform(),
      content: { ...createEmptyContentBundle(), image: () => '~/assets/images/a.jpg' },
    });
    fetchMock.mockRejectedValue(new Error('Network request failed'));
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});

    await feedsStore.getState().fetch('recherchen', { force: true });

    expect(feedsStore.getState().byKey.recherchen.items[0].imageUrl).toBe('~/assets/images/a.jpg');
    error.mockRestore();
  });

  it('reports error only when there is nothing at all to show', async () => {
    fetchMock.mockRejectedValue(new Error('Network request failed'));
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});

    await feedsStore.getState().fetch('recherchen');

    expect(feedsStore.getState().byKey.recherchen.status).toBe('error');
    error.mockRestore();
  });

  it('does not let one failing feed take the others down', async () => {
    fetchMock.mockImplementation((key) =>
      key === 'klima' ? Promise.reject(new Error('HTTP 502')) : Promise.resolve([item(`${key}-1`)]),
    );
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});

    await feedsStore.getState().fetchMany(['recherchen', 'klima', 'faktencheck']);

    expect(feedsStore.getState().byKey.recherchen.status).toBe('ready');
    expect(feedsStore.getState().byKey.faktencheck.status).toBe('ready');
    expect(feedsStore.getState().byKey.klima.status).toBe('error');
    error.mockRestore();
  });
});

describe('merged reads', () => {
  const state = () =>
    slices({
      recherchen: { items: [item('a', '2026-06-10T00:00:00.000Z')], status: 'ready' },
      faktencheck: {
        items: [item('b', '2026-06-12T00:00:00.000Z'), item('a', '2026-06-10T00:00:00.000Z')],
        status: 'offline',
      },
    });

  it('sorts newest first and keeps one entry per article', () => {
    const merged = mergedFeedItems(state(), ['recherchen', 'faktencheck']);
    expect(merged.map((i) => i.id)).toEqual(['b', 'a']);
  });

  it('reports the most optimistic real status — some content beats none', () => {
    expect(mergedFeedStatus(state(), ['recherchen', 'faktencheck'])).toBe('ready');
    expect(mergedFeedStatus(state(), ['faktencheck'])).toBe('offline');
    expect(mergedFeedStatus(state(), ['klima'])).toBe('idle');
  });
});

describe('image enrichment', () => {
  it('patches one item in place and leaves the rest alone', async () => {
    feedsStore.setState(slices({ recherchen: { items: [item('a'), item('b')], status: 'ready' } }));
    configurePlatform({
      ...createMemoryPlatform(),
      content: {
        ...createEmptyContentBundle(),
        article: (url) =>
          url.includes('/a/')
            ? {
                url,
                title: 'A',
                authors: [],
                publishedAt: '',
                readingMinutes: 1,
                bodyHtml: '<p>x</p>',
                heroImageUrl: 'https://x/a.jpg',
              }
            : null,
      },
    });

    await feedsStore.getState().enrichImage('recherchen', 'a');

    const items = feedsStore.getState().byKey.recherchen.items;
    expect(items[0].imageUrl).toBe('https://x/a.jpg');
    expect(items[1].imageUrl).toBeNull();
  });

  it('does nothing for an item that already has an image', async () => {
    feedsStore.setState(
      slices({ recherchen: { items: [{ ...item('a'), imageUrl: 'https://x/keep.jpg' }] } }),
    );

    await feedsStore.getState().enrichImage('recherchen', 'a');

    expect(feedsStore.getState().byKey.recherchen.items[0].imageUrl).toBe('https://x/keep.jpg');
  });
});
