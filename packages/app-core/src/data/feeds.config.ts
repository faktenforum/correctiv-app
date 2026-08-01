import type { FeedKey } from '../types/models';

/**
 * Verified live feeds (see DATENQUELLEN.md).
 *
 * BEWARE, pitfall: URLs like correctiv.org/faktencheck/feed/ (without /category/)
 * only return the static landing page as 1 item. Real article streams
 * exist exclusively under /category/<slug>/feed/ — the exception is the
 * main feed correctiv.org/feed/.
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
  /** CORRECTIV im Gespräch (playlist) */
  gespraech:
    'https://www.youtube.com/feeds/videos.xml?playlist_id=PL2IVZYzgpfPrwo2K0jXXNyH_hO9oOucXT',
  /** FunFacts (channel) — legacy; FunFacts now streams from PeerTube (see MEDIA_SOURCE). */
  funfacts: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCA0KeaGDjNAJs0ihc_rAiGA',
  /** CORRECTIV main channel */
  hauptkanal: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCZ-tUoJJV-18Xtcij_tOgGQ',
} as const;

/**
 * Source platform per media channel. FunFacts moved to CORRECTIV's own PeerTube
 * instance (native player, duration/views, no Google); the other channels stay
 * on YouTube for now (hybrid).
 */
export const MEDIA_SOURCE = {
  gespraech: 'youtube',
  funfacts: 'peertube',
  hauptkanal: 'youtube',
} as const;

/** PeerTube channel handles for peertube-sourced media keys. */
export const PEERTUBE_CHANNELS = {
  funfacts: 'funfacts.de',
} as const;

/**
 * Salon5 radio (Icecast, 64 kbit/s MP3).
 * Never probe with a HEAD request — Icecast responds to it with 400.
 * Availability can only be determined by attempting to play.
 */
export const RADIO_STREAM_URL = 'https://icecast.correctiv.net/salon5low';

/**
 * Salon5 podcasts run on CORRECTIV's own Castopod instance — standard podcast
 * RSS per show at `${PODCAST_HOST}/@<handle>/feed.xml`, each episode carrying a
 * real MP3 <enclosure>. (Note: salon5.de is an unrelated site; the youth
 * newsroom lives here and on salon5.org / correctiv.org/projekte/salon5.)
 */
export const PODCAST_HOST = 'https://salon5.correctiv.net';

/** Curated Salon5 shows for the media library, in display order (Castopod handles). */
export const PODCAST_CHANNELS = [
  'pausenbrot',
  'klima',
  'salon5_erklart',
  'politik',
  'europa_was_geht',
  'sport',
  'pyjama_party',
] as const;
