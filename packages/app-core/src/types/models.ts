export type FeedKey =
  | 'recherchen'
  | 'faktencheck'
  | 'klima'
  | 'schweiz'
  | 'lokal'
  | 'salon5'
  /** Category feed is currently empty upstream — usable as a teaser only. */
  | 'europe';

export interface FeedItem {
  /** guid from the feed */
  id: string;
  feed: FeedKey;
  title: string;
  url: string;
  teaser: string;
  /**
   * From <dc:creator>, singular on purpose. The Expo app modelled this as
   * `authors: string[]` on the assumption that co-bylines produce several
   * elements. Checked against 200 live items (main feed + faktencheck): all 200
   * carry exactly one <dc:creator>, and none of those values is a composite
   * ("A und B", "A, B"). The array was speculative, so this stays a string —
   * see the note in lib/rss-parse.ts before changing it back.
   */
  author?: string;
  /** ISO-8601 */
  publishedAt: string;
  categories: string[];
  /** og:image — the feed provides no images, loaded lazily */
  imageUrl?: string | null;
}

/**
 * The article model lives in `articles/types.ts` — it used to be a second,
 * differently-cut `ArticleDetail` here. Re-exported so `types/models` stays the
 * one place to look for "what shape is a thing in this app".
 */
export type { Article, FactcheckRating } from '../articles/types';

/** The media library's channels. See MEDIA_SOURCE for which platform each streams from. */
export type MediaChannel = 'gespraech' | 'funfacts' | 'hauptkanal';

export interface Video {
  id: string;
  title: string;
  url: string;
  thumbnailUrl: string;
  publishedAt: string;
  description?: string;
  /** Which channel this came from — the feed itself does not say. */
  channel?: MediaChannel;
  /** Source platform — drives playback (native PeerTube player vs YouTube WebView). */
  source?: 'youtube' | 'peertube';
  /** Duration in seconds (PeerTube only — YouTube Atom feed has none). */
  durationSec?: number;
  /** View count (PeerTube only). */
  views?: number;
  /** HLS master playlist for the native player (PeerTube; set on detail fetch). */
  hlsMasterUrl?: string;
}

export interface AudioTrack {
  kind: 'radio' | 'episode';
  title: string;
  subtitle?: string;
  artworkUrl?: string;
  url: string;
  episodeId?: string;
}
