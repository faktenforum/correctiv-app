import type { FeedKey } from '../types/models';

/**
 * Verifizierte Live-Feeds (siehe DATENQUELLEN.md).
 *
 * ACHTUNG, Falle: URLs wie correctiv.org/faktencheck/feed/ (ohne /category/)
 * liefern nur die statische Landingpage als 1 Item. Echte Artikel-Streams
 * gibt es ausschließlich unter /category/<slug>/feed/ — Ausnahme ist der
 * Haupt-Feed correctiv.org/feed/.
 */
export const FEEDS: Record<FeedKey, { label: string; url: string }> = {
  recherchen: { label: 'Recherchen', url: 'https://correctiv.org/feed/' },
  faktencheck: { label: 'Faktencheck', url: 'https://correctiv.org/category/faktencheck/feed/' },
  klima: { label: 'Klima', url: 'https://correctiv.org/category/klimawandel/feed/' },
  schweiz: { label: 'CORRECTIV.Schweiz', url: 'https://correctiv.org/category/schweiz/feed/' },
  lokal: { label: 'CORRECTIV.Lokal', url: 'https://correctiv.org/category/lokal/feed/' },
  salon5: { label: 'Salon5', url: 'https://correctiv.org/category/salon5/feed/' },
};

export const YOUTUBE_FEEDS = {
  /** CORRECTIV im Gespräch (Playlist) */
  gespraech:
    'https://www.youtube.com/feeds/videos.xml?playlist_id=PL2IVZYzgpfPrwo2K0jXXNyH_hO9oOucXT',
  /** FunFacts (Kanal) */
  funfacts: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCA0KeaGDjNAJs0ihc_rAiGA',
  /** CORRECTIV-Hauptkanal */
  hauptkanal: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCZ-tUoJJV-18Xtcij_tOgGQ',
} as const;

/**
 * Salon5-Radio (Icecast, 64 kbit/s MP3).
 * Niemals per HEAD-Request prüfen — Icecast antwortet darauf mit 400.
 * Verfügbarkeit ergibt sich nur aus dem Play-Versuch.
 */
export const RADIO_STREAM_URL = 'https://icecast.correctiv.net/salon5low';
