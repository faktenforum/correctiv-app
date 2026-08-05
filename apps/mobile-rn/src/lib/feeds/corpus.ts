import { CONTENT_FEEDS } from '@correctiv/app-core/data/feeds.config';
import type { FeedItem } from '@correctiv/app-core/types/models';

import { getFeeds } from './client';

/**
 * The search's offline fallback: everything this device knows about correctiv.org
 * without a network.
 *
 * Full-text search runs server-side (WordPress REST). When that is unreachable — or
 * simply not allowed, as in a browser: see the CORS note in ADR 0004 — the app
 * searches the feeds it has already loaded. `getFeeds` falls back to the
 * AsyncStorage cache per feed, so the fallback holds in airplane mode too.
 *
 * The NativeScript build kicked off all six feeds when the search screen opened.
 * Here that happens only when the fallback is actually needed: the normal case
 * (server answers) then costs no six requests.
 */
let pending: Promise<FeedItem[]> | null = null;

async function feedCorpus(): Promise<FeedItem[]> {
  const items = await (pending ??= getFeeds(CONTENT_FEEDS));
  // Do not cement an empty result: it means "all six feeds failed and nothing was
  // cached", and the next attempt may have a network again. `getFeeds` itself never
  // throws (allSettled).
  if (items.length === 0) pending = null;
  return items;
}

/** Title and teaser search over the local corpus, newest first. */
export async function searchFeedCorpus(query: string, limit = 12): Promise<FeedItem[]> {
  const needle = query.trim().toLowerCase();
  if (needle.length < 2) return [];
  const items = await feedCorpus();
  return items
    .filter(
      (item) =>
        item.title.toLowerCase().includes(needle) || item.teaser.toLowerCase().includes(needle),
    )
    .slice(0, limit);
}

/** Tests only: forces a fresh load on the next call. */
export function resetFeedCorpus(): void {
  pending = null;
}
