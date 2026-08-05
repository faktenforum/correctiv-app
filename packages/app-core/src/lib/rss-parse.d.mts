/**
 * Types for the hand-written .mjs parsers.
 *
 * `feed` and `channel` are generic rather than `string`: the caller knows which
 * key it asked for, so the parsed items can carry that exact literal type and
 * satisfy `FeedItem`/`Video` with no cast at the call site. A widened `string`
 * forced every consumer to assert, and an assertion is exactly the place where a
 * real mismatch would have been silenced.
 */
export interface ParsedFeedItem<K extends string = string> {
  id: string;
  feed: K;
  title: string;
  url: string;
  teaser: string;
  author?: string;
  publishedAt: string;
  categories: string[];
  imageUrl: null;
}

export interface ParsedVideo<C extends string = string> {
  id: string;
  title: string;
  url: string;
  thumbnailUrl: string;
  publishedAt: string;
  description?: string;
  channel?: C;
  source: 'youtube';
}

export interface ParsedPodcastEpisode {
  id: string;
  title: string;
  /** ISO-8601 */
  date: string;
  durationSec: number;
  audioUrl: string;
}

export interface ParsedPodcast {
  title: string;
  description: string;
  imageUrl: string | null;
  episodes: ParsedPodcastEpisode[];
}

export function parseWpFeed<K extends string>(xml: string, feed: K): ParsedFeedItem<K>[];
export function parseYoutubeFeed<C extends string>(xml: string, channel?: C): ParsedVideo<C>[];
export function parsePodcastFeed(xml: string): ParsedPodcast;
