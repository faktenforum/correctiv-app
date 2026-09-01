import { FEED_PRIORITY } from '../data/feeds.config';
import type { FeedItem } from '../types/models';
import { getCached, setCached } from './cache.service';
import { searchWpPosts } from './wp.service';

/**
 * Full-text search across correctiv.org.
 *
 * The request and the mapping both live in `services/wp.service.ts` now, because
 * the search and the feeds ask the same API for the same shape and used to do it
 * with two copies of the field list. What is left here is the part that is only
 * the search's: a short cache, a minimum query length, and the promise that a
 * failure throws so the screen can fall back to searching what it already has.
 *
 * One behaviour changed with the move. The section badge on a hit used to be
 * guessed from the article's URL (`link.includes('/faktencheck/')`), which saw
 * only the first matching path segment and nothing at all for an article whose
 * permalink is not category-shaped. `cvui_categories` names every category on the
 * post, so `FEED_PRIORITY` now decides from the data.
 *
 * The SearchPage keeps a local search over already-loaded feed items as the
 * offline/error fallback — the demo must never depend on Wi-Fi.
 */
const CACHE_NS = 'search';
const TTL_MS = 10 * 60 * 1000;

/** Search published correctiv.org posts. Throws on network error (caller falls back). */
export async function searchArticles(query: string, count = 15): Promise<FeedItem[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const cacheKey = q.toLowerCase();
  const cached = await getCached<FeedItem[]>(CACHE_NS, cacheKey, TTL_MS);
  if (cached) return cached;

  const items = await searchWpPosts(q, count, FEED_PRIORITY);
  await setCached(CACHE_NS, cacheKey, items);
  return items;
}
