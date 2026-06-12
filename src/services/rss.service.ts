import type { FeedItem, FeedKey, Video } from '../types/models';
import { fetchText } from './http';
import { parseWpFeed, parseYoutubeFeed } from '../lib/rss-parse.mjs';

/** WordPress RSS 2.0 feed → FeedItem[] */
export async function fetchFeed(feed: FeedKey, url: string): Promise<FeedItem[]> {
  const xml = await fetchText(url);
  return parseWpFeed(xml, feed) as FeedItem[];
}

/** YouTube Atom feed → Video[] */
export async function fetchYoutubeFeed(url: string): Promise<Video[]> {
  const xml = await fetchText(url);
  return parseYoutubeFeed(xml);
}
