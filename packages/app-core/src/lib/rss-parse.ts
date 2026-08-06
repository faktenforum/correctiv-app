/**
 * WordPress RSS 2.0, YouTube Atom and iTunes podcast feeds → typed items.
 *
 * Regex-based rather than an XML library: `fast-xml-parser` and its peers collide
 * with the CommonJS resolver in `@nativescript/vite`, and these three formats are
 * stable enough that the trade is worth it. Runs identically in Node scripts and
 * in both apps.
 *
 * This used to be a `.mjs` file with a hand-written `.d.mts` twin, so that a plain
 * `node` script could import it. The scripts run through `tsx` now, and the twin —
 * which nothing checked against its implementation — is gone with it.
 */
import { decodeEntities } from './html';

function clean(raw: string): string {
  return decodeEntities(raw.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/<[^>]*>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

function blockTag(block: string, name: string): string {
  const m = new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`).exec(block);
  return m ? clean(m[1]) : '';
}

/**
 * `feed` and `channel` stay generic rather than widening to `string`: the caller
 * knows which key it asked for, so parsed items carry that literal type and
 * satisfy `FeedItem`/`Video` with no cast. A widened `string` forced an assertion
 * at every call site — and an assertion is exactly where a real mismatch hides.
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

/**
 * WordPress RSS → items.
 *
 * `author` is a single string, not a list. The Expo prototype assumed co-bylines
 * arrive as repeated `<dc:creator>` elements; measured against 200 live items
 * (correctiv.org/feed/ and /category/faktencheck/feed/) every single one has
 * exactly one, and none is a composite value. If CORRECTIV ever adds a
 * co-authors plugin this takes the first — that is the known limit, and it is
 * cheaper to fix then than to carry an always-length-1 array everywhere now.
 */
export function parseWpFeed<K extends string>(xml: string, feed: K): ParsedFeedItem<K>[] {
  const items: ParsedFeedItem<K>[] = [];
  const itemRe = /<item>([\s\S]*?)<\/item>/g;
  let m: RegExpExecArray | null;
  while ((m = itemRe.exec(xml))) {
    const block = m[1];
    const url = blockTag(block, 'link');
    if (!url) continue;
    const categories = [...block.matchAll(/<category>([\s\S]*?)<\/category>/g)]
      .map((c) => decodeEntities(c[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')).trim())
      .filter(Boolean);
    const pub = blockTag(block, 'pubDate');
    items.push({
      id: blockTag(block, 'guid') || url,
      feed,
      title: blockTag(block, 'title'),
      url,
      teaser: blockTag(block, 'description'),
      author: blockTag(block, 'dc:creator') || undefined,
      publishedAt: pub ? new Date(pub).toISOString() : new Date(0).toISOString(),
      categories,
      imageUrl: null,
    });
  }
  return items;
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

/**
 * YouTube Atom → videos (channel or playlist feed).
 *
 * `channel` is passed in because the feed does not identify which of the app's
 * media channels it is — the caller knows, the XML does not.
 */
export function parseYoutubeFeed<C extends string>(xml: string, channel?: C): ParsedVideo<C>[] {
  const videos: ParsedVideo<C>[] = [];
  const entryRe = /<entry>([\s\S]*?)<\/entry>/g;
  let m: RegExpExecArray | null;
  while ((m = entryRe.exec(xml))) {
    const block = m[1];
    const id = blockTag(block, 'yt:videoId');
    if (!id) continue;
    const thumb = /<media:thumbnail[^>]+url="([^"]+)"/.exec(block);
    videos.push({
      id,
      title: blockTag(block, 'title'),
      url: `https://www.youtube.com/watch?v=${id}`,
      thumbnailUrl: thumb ? thumb[1] : `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      publishedAt: blockTag(block, 'published'),
      description: blockTag(block, 'media:description').slice(0, 300) || undefined,
      channel,
      source: 'youtube',
    });
  }
  return videos;
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

/** `<itunes:duration>` is either seconds ("1478") or HH:MM:SS / MM:SS. */
function parseDuration(value: string): number {
  if (!value) return 0;
  if (/^\d+$/.test(value)) return parseInt(value, 10);
  return value.split(':').reduce((acc, p) => acc * 60 + (parseInt(p, 10) || 0), 0);
}

/**
 * Podcast RSS 2.0 (iTunes namespace) → one series with its episodes.
 *
 * Used for the Salon5 Castopod feeds (`salon5.correctiv.net/@<handle>/feed.xml`):
 * every episode carries a real MP3 `<enclosure>` and an `<itunes:duration>`.
 */
export function parsePodcastFeed(xml: string): ParsedPodcast {
  // The channel header is everything before the first <item>.
  const channel = xml.split('<item>')[0];
  const image =
    /<itunes:image[^>]+href="([^"]+)"/.exec(channel) ??
    /<image>[\s\S]*?<url>([\s\S]*?)<\/url>/.exec(channel);

  const episodes: ParsedPodcastEpisode[] = [];
  const itemRe = /<item>([\s\S]*?)<\/item>/g;
  let m: RegExpExecArray | null;
  while ((m = itemRe.exec(xml))) {
    const block = m[1];
    const enclosure = /<enclosure[^>]+url="([^"]+)"/.exec(block);
    if (!enclosure) continue; // no audio → not a playable episode
    const pub = blockTag(block, 'pubDate');
    episodes.push({
      id: blockTag(block, 'guid') || enclosure[1],
      title: blockTag(block, 'title'),
      date: pub ? new Date(pub).toISOString() : new Date(0).toISOString(),
      durationSec: parseDuration(blockTag(block, 'itunes:duration')),
      audioUrl: enclosure[1],
    });
  }

  return {
    title: blockTag(channel, 'title'),
    description: blockTag(channel, 'description'),
    imageUrl: image ? image[1].trim() : null,
    episodes,
  };
}
