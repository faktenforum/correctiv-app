import { CONTENT_FEEDS } from '@correctiv/app-core/data/feeds.config';
import { mergedFeedItems } from '@correctiv/app-core/stores/feeds';
import type { FeedItem } from '@correctiv/app-core/types/models';

import { coreActions, coreStore } from '@/lib/store/core';

/**
 * The search's offline fallback: everything this device knows about correctiv.org
 * without a network.
 *
 * Full-text search runs server-side (WordPress REST). When that is unreachable — or
 * simply not allowed, as in a browser: see the CORS note in ADR 0004 — the app
 * searches the feeds instead. The core's feed slice falls back to its cache per
 * feed, so this holds in airplane mode too.
 *
 * Loaded lazily, and only when the fallback is actually needed: the normal case
 * (the server answers) then costs no six extra requests. An earlier version kicked
 * off all six the moment the search screen opened.
 */
let pending: Promise<void> | null = null;

async function corpus(): Promise<FeedItem[]> {
  await (pending ??= coreActions.feeds.fetchMany([...CONTENT_FEEDS]));
  const items = mergedFeedItems(coreStore.getState().feeds, [...CONTENT_FEEDS]);
  // Do not cement an empty result: it means every feed failed with nothing cached,
  // and the next attempt may have a network again.
  if (items.length === 0) pending = null;
  return items;
}

/** Title and teaser search over the local corpus, newest first. */
export async function searchFeedCorpus(query: string, limit = 12): Promise<FeedItem[]> {
  const needle = query.trim().toLowerCase();
  if (needle.length < 2) return [];
  const items = await corpus();
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
