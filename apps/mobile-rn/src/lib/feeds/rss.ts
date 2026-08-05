import type { FeedItem, FeedSourceId } from '@/lib/models';

import { stripHtml, textOf, toArray, toIso, xmlParser } from './xml';

/**
 * Parst einen WordPress-RSS-2.0-Feed zu FeedItems. Der Feed liefert keinen
 * Volltext (`content:encoded` fehlt) und keine Bilder — `heroImageUrl` wird
 * später über die Artikelseite (og:image) nachgeladen.
 */
export function parseRssFeed(xml: string, sourceId: FeedSourceId): FeedItem[] {
  const doc = xmlParser.parse(xml) as RssDoc;
  const channel = doc?.rss?.channel;
  if (!channel) return [];

  return toArray(channel.item)
    .map((item): FeedItem => {
      const link = textOf(item.link);
      const guid = textOf(item.guid);
      const categories = toArray(item.category).map(textOf).filter(Boolean);
      const authors = toArray(item['dc:creator']).map(textOf).filter(Boolean);
      return {
        id: guid || link,
        sourceId,
        title: textOf(item.title),
        link,
        publishedAt: toIso(item.pubDate),
        authors,
        categories,
        teaser: stripHtml(textOf(item.description)),
      };
    })
    .filter((i) => i.link);
}

// Lose getypte Sicht auf die fast-xml-parser-Ausgabe.
type RssNode = Record<string, unknown>;
interface RssDoc {
  rss?: { channel?: { item?: RssNode | RssNode[] } };
}
