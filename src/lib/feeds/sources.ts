import type { FeedSourceId } from '@/lib/models';

/**
 * Verifizierte Feed-Quellen (Stand laut DATENQUELLEN.md). WICHTIG: Artikel-Feeds
 * NUR über `/category/<slug>/feed/` — die naheliegenden `/<slug>/feed/`-URLs
 * liefern nur den 1-Item-Feed der statischen Landingpage ("Statische-Seite-Falle").
 */
export interface FeedSource {
  id: FeedSourceId;
  label: string;
  url: string;
  /** Default-Badge für Artikel aus diesem Feed. */
  badge?: string;
}

export const FEED_SOURCES: Record<FeedSourceId, FeedSource> = {
  haupt: { id: 'haupt', label: 'Recherchen', url: 'https://correctiv.org/feed/' },
  faktencheck: {
    id: 'faktencheck',
    label: 'Faktencheck',
    url: 'https://correctiv.org/category/faktencheck/feed/',
    badge: 'Faktencheck',
  },
  schweiz: {
    id: 'schweiz',
    label: 'CORRECTIV.Schweiz',
    url: 'https://correctiv.org/category/schweiz/feed/',
    badge: 'Schweiz',
  },
  salon5: {
    id: 'salon5',
    label: 'Salon5',
    url: 'https://correctiv.org/category/salon5/feed/',
    badge: 'Salon5',
  },
  klima: {
    id: 'klima',
    label: 'Klima',
    url: 'https://correctiv.org/category/klimawandel/feed/',
    badge: 'Klima',
  },
  lokal: {
    id: 'lokal',
    label: 'CORRECTIV.Lokal',
    url: 'https://correctiv.org/category/lokal/feed/',
    badge: 'Lokal',
  },
  // Kategorie-Feed derzeit leer → nur als Teaser verwenden.
  europe: {
    id: 'europe',
    label: 'CORRECTIV.Europe',
    url: 'https://correctiv.org/category/europe/feed/',
    badge: 'Europe',
  },
};

export type YoutubeChannel = 'gespraech' | 'funfacts' | 'hauptkanal';

/** YouTube-Atom-Feeds (kein API-Key nötig). */
export const YOUTUBE_FEEDS: Record<YoutubeChannel, { label: string; url: string }> = {
  gespraech: {
    label: 'CORRECTIV im Gespräch',
    url: 'https://www.youtube.com/feeds/videos.xml?playlist_id=PL2IVZYzgpfPrwo2K0jXXNyH_hO9oOucXT',
  },
  funfacts: {
    label: 'FunFacts',
    url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCA0KeaGDjNAJs0ihc_rAiGA',
  },
  hauptkanal: {
    label: 'CORRECTIV',
    url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCZ-tUoJJV-18Xtcij_tOgGQ',
  },
};

/** Salon5-Radio (Icecast). Nie per HEAD prüfen — Icecast antwortet darauf 400. */
export const SALON5_STREAM_URL = 'https://icecast.correctiv.net/salon5low';
