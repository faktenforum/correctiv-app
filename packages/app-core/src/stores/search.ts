import { CONTENT_FEEDS } from '../data/feeds.config';
import { searchArticles } from '../services/search.service';
import type { FeedItem } from '../types/models';
import { fetchMany, type FeedsState, mergedFeedItems } from './feeds';
import type { AppThunk } from './store';

/** Below two characters nobody is searching meaningfully, and nor is the server. */
export const MIN_SEARCH_QUERY = 2;

/** How many hits to ask correctiv.org for. */
const LIVE_COUNT = 15;

/**
 * Title and teaser over everything this device already knows about correctiv.org,
 * newest first.
 *
 * A selector, so it takes state rather than reaching for a store, and composes with
 * `useAppSelector` like the rest of them. It lived in the app as
 * `lib/feeds/corpus.ts`, which is where a pure query over `FeedsState` does not
 * belong: nothing in it is a screen, and nothing in it is platform.
 */
export function searchLocalFeeds(state: FeedsState, query: string, limit = 12): FeedItem[] {
  const needle = query.trim().toLowerCase();
  if (needle.length < MIN_SEARCH_QUERY) return [];
  return mergedFeedItems(state, CONTENT_FEEDS)
    .filter(
      (item) =>
        item.title.toLowerCase().includes(needle) || item.teaser.toLowerCase().includes(needle),
    )
    .slice(0, limit);
}

/**
 * The search: correctiv.org first, then what the device already has.
 *
 * The order is WordPress REST (`searchArticles`) and, on an error **or an empty
 * result**, the loaded feeds. The fallback is not a stopgap but the promise the
 * cache design makes: the demo must never hang on Wi-Fi. It stays the exception
 * rather than the rule even on the web target, because this search has always run
 * on `wp/v2`, which sends a CORS header
 * ([ADR 0015](../../../../adr/0015-reading-correctiv-org-through-its-rest-api.md)).
 *
 * The corpus is loaded lazily and only when the fallback is actually needed, so the
 * normal case costs no six extra requests. That laziness used to be a module-level
 * promise in the app, which put it outside both React and the store — `resetStore`
 * could not clear it and the preview shell's fixtures could not seed around it.
 * Here the same question is asked of state: an empty corpus means nothing is loaded
 * yet, and an empty corpus after a fetch means every feed failed with nothing
 * cached, which the next attempt is free to try again.
 */
export const searchWithFallback =
  (query: string, limit = 12): AppThunk<Promise<FeedItem[]>> =>
  async (dispatch, getState) => {
    const q = query.trim();
    if (q.length < MIN_SEARCH_QUERY) return [];

    try {
      const live = await searchArticles(q, LIVE_COUNT);
      if (live.length > 0) return live;
    } catch {
      // Offline or an API error — both take the same path as an empty result.
    }

    if (mergedFeedItems(getState().feeds, CONTENT_FEEDS).length === 0) {
      await dispatch(fetchMany(CONTENT_FEEDS));
    }
    return searchLocalFeeds(getState().feeds, q, limit);
  };
