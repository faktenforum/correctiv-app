import { XMLParser } from 'fast-xml-parser';
import type { FeedItem, FeedKey, Video } from '../types/models';
import { fetchText } from './http';
import { decodeEntities } from '../lib/extract.mjs';

// WordPress packt Titel/Creator/Kategorien in CDATA; ohne diese Optionen
// landen Roh-Strings wie <![CDATA[...]]> in der UI.
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  cdataPropName: '__cdata',
  processEntities: true,
});

/** CDATA-Wrapper und Arrays auf einen Textwert reduzieren. */
function text(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string' || typeof value === 'number') return String(value).trim();
  if (Array.isArray(value)) return text(value[0]);
  const obj = value as Record<string, unknown>;
  if ('__cdata' in obj) return text(obj['__cdata']);
  if ('#text' in obj) return text(obj['#text']);
  return '';
}

function asArray<T>(value: T | T[] | undefined): T[] {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function stripHtml(html: string): string {
  return decodeEntities(html.replace(/<[^>]*>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

/** WordPress-RSS-2.0-Feed → FeedItem[] */
export async function fetchFeed(feed: FeedKey, url: string): Promise<FeedItem[]> {
  const xml = await fetchText(url);
  return parseFeedXml(feed, xml);
}

export function parseFeedXml(feed: FeedKey, xml: string): FeedItem[] {
  const doc = parser.parse(xml);
  const items = asArray(doc?.rss?.channel?.item);
  return items
    .map((item: Record<string, unknown>): FeedItem | null => {
      const link = text(item.link);
      if (!link) return null;
      const pub = text(item.pubDate);
      return {
        id: text(item.guid) || link,
        feed,
        title: decodeEntities(text(item.title)),
        url: link,
        teaser: stripHtml(text(item.description)),
        author: decodeEntities(text(item['dc:creator'])) || undefined,
        publishedAt: pub ? new Date(pub).toISOString() : new Date(0).toISOString(),
        categories: asArray(item.category).map((c) => decodeEntities(text(c))).filter(Boolean),
        imageUrl: null,
      };
    })
    .filter((item): item is FeedItem => item !== null);
}

/** YouTube-Atom-Feed → Video[] */
export async function fetchYoutubeFeed(url: string): Promise<Video[]> {
  const xml = await fetchText(url);
  return parseYoutubeXml(xml);
}

export function parseYoutubeXml(xml: string): Video[] {
  const doc = parser.parse(xml);
  const entries = asArray(doc?.feed?.entry);
  return entries
    .map((entry: Record<string, unknown>): Video | null => {
      const id = text(entry['yt:videoId']);
      if (!id) return null;
      const media = entry['media:group'] as Record<string, unknown> | undefined;
      const thumb = media?.['media:thumbnail'] as Record<string, string> | undefined;
      return {
        id,
        title: decodeEntities(text(entry.title)),
        url: `https://www.youtube.com/watch?v=${id}`,
        thumbnailUrl: thumb?.['@_url'] ?? `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
        publishedAt: text(entry.published),
        description: decodeEntities(text(media?.['media:description'])).slice(0, 300) || undefined,
      };
    })
    .filter((video): video is Video => video !== null);
}
