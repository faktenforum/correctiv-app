import type { FeedItem, FeedSourceId, Video } from '@/lib/models';

import { cachedFetch } from '@/lib/net/cachedFetch';
import { parseRssFeed } from './rss';
import { FEED_SOURCES, YOUTUBE_FEEDS, type YoutubeChannel } from './sources';
import { parseYoutubeFeed } from './youtubeAtom';

/**
 * Lädt und parst einen RSS-Feed (network-first, AsyncStorage-Fallback). In M2
 * kommt zusätzlich ein gebündelter Snapshot als letzte Offline-Stufe dazu.
 * Items sind nach Datum absteigend sortiert.
 */
export async function getFeed(sourceId: FeedSourceId): Promise<FeedItem[]> {
  const source = FEED_SOURCES[sourceId];
  const xml = await cachedFetch(`feed:${sourceId}`, source.url, {
    policy: 'network-first',
    timeoutMs: 5000,
  });
  return sortByDateDesc(parseRssFeed(xml, sourceId));
}

/** Lädt mehrere Feeds parallel und liefert nur die erfolgreichen. */
export async function getFeeds(sourceIds: FeedSourceId[]): Promise<FeedItem[]> {
  const results = await Promise.allSettled(sourceIds.map(getFeed));
  const items = results.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));
  return sortByDateDesc(dedupeByLink(items));
}

export async function getVideos(channel: YoutubeChannel): Promise<Video[]> {
  const feed = YOUTUBE_FEEDS[channel];
  const xml = await cachedFetch(`yt:${channel}`, feed.url, {
    policy: 'network-first',
    timeoutMs: 5000,
  });
  return parseYoutubeFeed(xml, channel);
}

function sortByDateDesc<T extends { publishedAt: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1));
}

function dedupeByLink(items: FeedItem[]): FeedItem[] {
  const seen = new Set<string>();
  return items.filter((i) => (seen.has(i.link) ? false : (seen.add(i.link), true)));
}
