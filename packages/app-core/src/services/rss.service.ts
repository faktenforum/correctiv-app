import type { FeedItem, FeedKey, MediaChannel, Video } from '../types/models';
import { fetchText } from './http';
import { parseWpFeed, parseYoutubeFeed } from '../lib/rss-parse.mjs';

/** WordPress RSS 2.0 feed → FeedItem[] */
export async function fetchFeed(feed: FeedKey, url: string): Promise<FeedItem[]> {
  const xml = await fetchText(url);
  return parseWpFeed(xml, feed);
}

/**
 * YouTube Atom feed → Video[]. `channel` is passed through because the feed does
 * not identify which of the app's channels it is — the caller knows, the XML does not.
 */
export async function fetchYoutubeFeed(url: string, channel?: MediaChannel): Promise<Video[]> {
  const xml = await fetchText(url);
  return parseYoutubeFeed(xml, channel);
}
