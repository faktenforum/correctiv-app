import type { Video } from '@/lib/models';

import type { YoutubeChannel } from './sources';
import { textOf, toArray, toIso, xmlParser } from './xml';

/**
 * Parst einen YouTube-Atom-Feed (Kanal oder Playlist) zu Videos. Titel, Video-ID,
 * Thumbnail (media:group) und Beschreibung — ausreichend für Mediathek-Listen;
 * Wiedergabe über eingebetteten Player.
 */
export function parseYoutubeFeed(xml: string, channel: YoutubeChannel): Video[] {
  const doc = xmlParser.parse(xml) as AtomDoc;
  const feed = doc?.feed;
  if (!feed) return [];

  return toArray(feed.entry)
    .map((entry): Video => {
      const group = (entry['media:group'] ?? {}) as Record<string, unknown>;
      const thumb = toArray(group['media:thumbnail'])[0] as { '@_url'?: string } | undefined;
      return {
        id: textOf(entry['yt:videoId']),
        title: textOf(entry.title),
        thumbnailUrl: thumb?.['@_url'] ?? '',
        publishedAt: toIso(entry.published),
        channel,
        description: textOf(group['media:description']),
      };
    })
    .filter((v) => v.id);
}

type AtomNode = Record<string, unknown>;
interface AtomDoc {
  feed?: { entry?: AtomNode | AtomNode[] };
}
