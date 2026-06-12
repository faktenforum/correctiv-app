export type FeedKey = 'recherchen' | 'faktencheck' | 'klima' | 'schweiz' | 'lokal' | 'salon5';

export interface FeedItem {
  /** guid aus dem Feed */
  id: string;
  feed: FeedKey;
  title: string;
  url: string;
  teaser: string;
  author?: string;
  /** ISO-8601 */
  publishedAt: string;
  categories: string[];
  /** og:image — der Feed liefert keine Bilder, wird lazy nachgeladen */
  imageUrl?: string | null;
}

export interface ArticleDetail {
  url: string;
  topline?: string | null;
  headline: string;
  excerpt?: string | null;
  authors?: string | null;
  dateIso?: string | null;
  dateText?: string | null;
  /** Faktencheck-Bewertung: false | mostly-false | missing-context | unproven | true … */
  rating?: string | null;
  ratingText?: string | null;
  bodyHtml: string;
  ogImage?: string | null;
  readingMinutes: number;
  /** true, wenn aus dem gebündelten Offline-Bestand geladen */
  offline?: boolean;
}

export interface Video {
  id: string;
  title: string;
  url: string;
  thumbnailUrl: string;
  publishedAt: string;
  description?: string;
}

export interface AudioTrack {
  kind: 'radio' | 'episode' | 'preview';
  title: string;
  subtitle?: string;
  artworkUrl?: string;
  url: string;
  episodeId?: string;
}
