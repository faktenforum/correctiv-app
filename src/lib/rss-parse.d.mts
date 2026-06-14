export interface ParsedFeedItem {
  id: string;
  feed: string;
  title: string;
  url: string;
  teaser: string;
  author?: string;
  publishedAt: string;
  categories: string[];
  imageUrl: null;
}

export interface ParsedVideo {
  id: string;
  title: string;
  url: string;
  thumbnailUrl: string;
  publishedAt: string;
  description?: string;
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

export function parseWpFeed(xml: string, feed: string): ParsedFeedItem[];
export function parseYoutubeFeed(xml: string): ParsedVideo[];
export function parsePodcastFeed(xml: string): ParsedPodcast;
