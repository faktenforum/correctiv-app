import type { FeedKey, MediaChannel } from '../types/models';

/**
 * The app's feeds, and the two ways to read each of them.
 *
 * `categoryId` is the path the app takes (`services/wp.service.ts`): the REST API
 * pages, carries images and answers with a CORS header. `url` is the RSS fallback
 * for the day a plugin turns the REST API off, and it is what
 * `npm run offline-articles` still reads.
 *
 * BEWARE, pitfall in the RSS half: URLs like correctiv.org/faktencheck/feed/
 * (without /category/) only return the static landing page as 1 item. Real
 * article streams exist exclusively under /category/<slug>/feed/ — the exception
 * is the main feed correctiv.org/feed/.
 *
 * A second pitfall, in the REST half: ids, not slugs. A slug is editable in
 * wp-admin and an id is not, so an id survives a rename. All ids below were read
 * off `wp/v2/categories?slug=<slug>` on 2026-09-01 and the counts are from the
 * same read.
 */
export interface FeedConfig {
  label: string;
  /**
   * WordPress category id. Absent on the site-wide feed, which is every post,
   * and on a feed whose category does not exist upstream.
   */
  categoryId?: number;
  /** The category slug behind `categoryId` — for a re-check against the CMS. */
  slug?: string;
  /** RSS feed, the fallback path and the offline generator's source. */
  url: string;
  /** Default badge for articles from this feed. The main feed carries none. */
  badge?: string;
  /**
   * Upstream returns no items today, so the feed must not be presented as a
   * content source — only as a teaser for the project. Guarded by a test.
   */
  empty?: true;
}

export const FEEDS: Record<FeedKey, FeedConfig> = {
  /** Every post, in one stream. No category, so no badge either. */
  recherchen: { label: 'Recherchen', url: 'https://correctiv.org/feed/' },
  faktencheck: {
    label: 'Faktencheck',
    categoryId: 5, // 2,951 posts
    slug: 'faktencheck',
    url: 'https://correctiv.org/category/faktencheck/feed/',
    badge: 'Faktencheck',
  },
  /**
   * `klimawandel` (161 posts) and NOT `klima` (254), although the second is
   * bigger. Checked on 2026-09-01: `klima` is a cross-cutting category whose
   * recent entries are almost all fact checks, which the app already shows in the
   * Faktencheck rail. `klimawandel` carries the climate reporting.
   */
  klima: {
    label: 'Klima',
    categoryId: 94,
    slug: 'klimawandel',
    url: 'https://correctiv.org/category/klimawandel/feed/',
    badge: 'Klima',
  },
  /** 10 posts upstream, current. `correctiv-schweiz` is a second, near-empty one. */
  schweiz: {
    label: 'CORRECTIV.Schweiz',
    categoryId: 2568,
    slug: 'schweiz',
    url: 'https://correctiv.org/category/schweiz/feed/',
    badge: 'Schweiz',
  },
  /** 10 posts, newest 2025-05-28. The project works; this category does not. */
  lokal: {
    label: 'CORRECTIV.Lokal',
    categoryId: 1017,
    slug: 'lokal',
    url: 'https://correctiv.org/category/lokal/feed/',
    badge: 'Lokal',
  },
  /** 7 posts, newest 2025-12-11. Salon5 publishes audio, not articles. */
  salon5: {
    label: 'Salon5',
    categoryId: 1241,
    slug: 'salon5',
    url: 'https://correctiv.org/category/salon5/feed/',
    badge: 'Salon5',
  },
  /**
   * `empty` here does not mean "a category with no posts". There is no `europe`
   * category on correctiv.org at all — `wp/v2/categories?slug=europe` answers
   * with an empty list, which is why this entry has no `categoryId`. There are
   * `europa` (44) and `europa-aktuelles` (43), and whether either of them is
   * CORRECTIV.Europe's output is an editorial question, not a technical one.
   */
  europe: {
    label: 'CORRECTIV.Europe',
    url: 'https://correctiv.org/category/europe/feed/',
    badge: 'Europe',
    empty: true,
  },
};

/** Category slugs in the order that decides a post's feed. See `FEED_PRIORITY`. */
export type FeedPriority = readonly { slug: string; feed: FeedKey }[];

/**
 * Which feed a post belongs to when it could belong to several.
 *
 * A post carries every category it was filed under — the sampled fact check is
 * in both `faktencheck` and `klima` — so a single answer needs an order. This is
 * the order the search's old URL sniffing implied, made explicit and moved off
 * the permalink: a fact check about the climate is a fact check.
 *
 * `recherchen` is the fallback and appears in no rule, because it is not a
 * category.
 */
export const FEED_PRIORITY = [
  { slug: 'faktencheck', feed: 'faktencheck' },
  { slug: 'klimawandel', feed: 'klima' },
  { slug: 'lokal', feed: 'lokal' },
  { slug: 'salon5', feed: 'salon5' },
  { slug: 'schweiz', feed: 'schweiz' },
] as const satisfies FeedPriority;

/** Feeds that actually carry articles — everything a list should offer to load. */
export const CONTENT_FEEDS = (Object.keys(FEEDS) as FeedKey[]).filter((k) => !FEEDS[k].empty);

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

/**
 * PeerTube channels per media key, as a list.
 *
 * A list rather than one handle, because `tube.funfacts.de` is not a one-channel
 * instance: it held 184 videos across 9 channels on 2026-09-01, and the app reads
 * 113 of them from `funfacts.de` alone. Beside it sit `marc_uwe_kling` (790
 * followers), `tommy_krappweis` (48), `lennart_funfacts` and four more.
 *
 * Adding one is a line here, not a change in a store. Which of them belongs in the
 * app, and under which heading, is an editorial question and deliberately not
 * answered in code.
 */
export const PEERTUBE_CHANNELS: Partial<Record<MediaChannel, readonly string[]>> = {
  funfacts: ['funfacts.de'],
};

/**
 * The mounts on CORRECTIV's Icecast server, measured 2026-09-01.
 *
 * Never probe one with a HEAD request — Icecast answers HEAD with 400. That is
 * why the note "availability means: try to play" exists, and it holds for the
 * stream itself. It does **not** hold for the server's status document:
 * `status-json.xsl` is a public GET and reports every mount with its bitrate,
 * listeners and current title. `services/radio.service.ts` reads it.
 */
export const RADIO_MOUNTS = {
  /** What the app plays. Cheap on mobile data, and the quieter of the two. */
  low: { name: 'salon5low', url: 'https://icecast.correctiv.net/salon5low', bitrateKbps: 64 },
  /**
   * Twice the bitrate, unused. Switching by network type would need a port the
   * core does not have (there is no way to ask "am I on Wi-Fi" without a platform
   * API), and defaulting everyone to 128 spends someone else's data plan. So it is
   * named here and picked by nobody, until that decision is made deliberately.
   */
  high: { name: 'salon5', url: 'https://icecast.correctiv.net/salon5', bitrateKbps: 128 },
  /**
   * Radio Sakharov, on the same server. A CORRECTIV exile-media project that the
   * app lists in the Entdecken directory as an outbound link only, although the
   * player could carry it: 128 kbit/s, and it had listeners at the time of writing.
   */
  sakharov: {
    name: 'sacharow',
    url: 'https://icecast.correctiv.net/sacharow',
    bitrateKbps: 128,
  },
} as const;

/** The stream the app plays. */
export const RADIO_STREAM_URL = RADIO_MOUNTS.low.url;

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
