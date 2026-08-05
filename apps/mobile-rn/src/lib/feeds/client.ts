import { FEEDS } from '@correctiv/app-core/data/feeds.config';
import { parseWpFeed } from '@correctiv/app-core/lib/rss-parse.mjs';
import type { FeedItem, FeedKey } from '@correctiv/app-core/types/models';

import { cachedFetch } from '@/lib/net/cachedFetch';

/**
 * Feed transport for this host.
 *
 * The MODEL, the feed catalogue and the PARSER all come from the core — that is
 * the whole point of the unification: one `FeedItem`, one set of regex parsers
 * pinned by the core's tests, no second definition to drift from.
 *
 * What stays here is the transport, because it is host-specific: `cachedFetch`
 * is network-first with an AsyncStorage fallback, deliberately explicit so the
 * demo never depends on Wi-Fi. The core's own blob cache sits behind a
 * *synchronous* FileStore port that the Expo adapter hydrates eagerly at
 * startup, which is fine for small settings but wrong for a megabyte of cached
 * feeds — see ADR 0004 "Offen".
 */
export async function getFeed(feed: FeedKey): Promise<FeedItem[]> {
  const xml = await cachedFetch(`feed:${feed}`, FEEDS[feed].url, {
    policy: 'network-first',
    timeoutMs: 5000,
  });
  return sortByDateDesc(parseWpFeed(xml, feed));
}

/** Loads several feeds in parallel and returns only the ones that succeeded. */
export async function getFeeds(feeds: FeedKey[]): Promise<FeedItem[]> {
  const results = await Promise.allSettled(feeds.map(getFeed));
  const items = results.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));
  return sortByDateDesc(dedupeByUrl(items));
}

function sortByDateDesc<T extends { publishedAt: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1));
}

function dedupeByUrl(items: FeedItem[]): FeedItem[] {
  const seen = new Set<string>();
  return items.filter((i) => (seen.has(i.url) ? false : (seen.add(i.url), true)));
}
