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

export function parseWpFeed(xml: string, feed: string): ParsedFeedItem[];
export function parseYoutubeFeed(xml: string): ParsedVideo[];
