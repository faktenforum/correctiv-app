import { act } from 'react-test-renderer';

/**
 * What the lead item on Home is allowed to ask the network for.
 *
 * `useArticleMeta` says the guard "is the point of this file now", and until now
 * nothing pinned it. The hero used to call it unconditionally, which fetched the
 * whole article page — about 115 KB — for a reading time the RSS feed did not
 * carry, once per render of Home. In a browser that request is not merely wasteful:
 * correctiv.org's article pages send no `Access-Control-Allow-Origin`, so it is
 * blocked outright, the byline silently loses its reading time and the console
 * fills with CORS errors. Everything else was green when that shipped; it was found
 * by opening the export in a browser (TROUBLESHOOTING.md → The web target).
 *
 * Since the move to the REST API a feed item normally arrives complete, so the
 * interesting case is both: that a complete item asks for nothing, and that an
 * RSS-shaped one still does — the fetch is a fallback, not a leftover.
 */

// The `@/components/ui` barrel reaches expo-router through ScreenHeader, so every
// suite that renders a component from it needs this whether it navigates or not.
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
  useLocalSearchParams: jest.fn(() => ({})),
  usePathname: jest.fn(() => '/'),
}));

jest.mock('@correctiv/app-core/articles/load', () => ({
  loadPageMeta: jest.fn(() => Promise.resolve({})),
}));

import { loadPageMeta } from '@correctiv/app-core/articles/load';
import type { FeedItem } from '@correctiv/app-core/types/models';

import { render, renderedText } from './support/rendering';

import { ArticleHero } from '@/components/feed/ArticleHero';

const loadPageMetaMock = loadPageMeta as jest.Mock;

const BASE: FeedItem = {
  id: 'guid-1',
  feed: 'recherchen',
  title: 'Wem gehört die Stadt',
  url: 'https://correctiv.org/aktuelles/wem-gehoert-die-stadt/',
  teaser: 'Worum es in der Recherche geht.',
  author: 'Alex Beispiel',
  publishedAt: '2026-08-01T09:00:00.000Z',
  categories: [],
};

/** What the REST path delivers: image and reading time already on the item. */
const COMPLETE: FeedItem = {
  ...BASE,
  imageUrl: 'https://correctiv.org/lead.jpg',
  readingMinutes: 4,
};

/** What the RSS fallback delivers: neither. */
const SPARSE: FeedItem = { ...BASE, imageUrl: null };

/** Lets the effect's promise settle without leaving an update outside `act`. */
async function settle(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
  });
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('ArticleHero', () => {
  it('asks for nothing when the item already carries image and reading time', async () => {
    const tree = render(<ArticleHero item={COMPLETE} onPress={jest.fn()} />);
    await settle();

    expect(loadPageMetaMock).not.toHaveBeenCalled();
    expect(renderedText(tree)).toContain('4 Min. Lesezeit');
  });

  it('still fetches for an RSS-shaped item, which carries neither', async () => {
    loadPageMetaMock.mockResolvedValueOnce({
      heroImageUrl: 'https://correctiv.org/spaet.jpg',
      readingMinutes: 7,
    });

    const tree = render(<ArticleHero item={SPARSE} onPress={jest.fn()} />);
    await settle();

    expect(loadPageMetaMock).toHaveBeenCalledTimes(1);
    expect(loadPageMetaMock).toHaveBeenCalledWith(SPARSE.url);
    expect(renderedText(tree)).toContain('7 Min. Lesezeit');
  });
});
