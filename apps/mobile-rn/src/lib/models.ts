/**
 * Datenmodelle der App. Bewusst geformt wie die künftigen API-Antworten, damit
 * der Phase-3-Wechsel von Beispieldaten auf echte Anbindungen nur den Daten-Layer
 * (lib/feeds, lib/sample-data) betrifft, nicht die UI.
 */

// --- Feeds & Artikel (LIVE) ---------------------------------------------------

export type FeedSourceId =
  | 'haupt'
  | 'faktencheck'
  | 'schweiz'
  | 'salon5'
  | 'klima'
  | 'lokal'
  | 'europe';

/** Ein Eintrag aus einem RSS-Feed. Der Feed liefert keinen Volltext und keine Bilder. */
export interface FeedItem {
  id: string;
  sourceId: FeedSourceId;
  title: string;
  link: string;
  /** ISO-8601. */
  publishedAt: string;
  authors: string[];
  categories: string[];
  teaser: string;
  /** Wird erst beim Bedarf über die Artikelseite (og:image) nachgeladen. */
  heroImageUrl?: string;
}

export type FactcheckRating =
  | 'falsch'
  | 'groesstenteils-falsch'
  | 'fehlender-kontext'
  | 'unbelegt'
  | 'manipuliert'
  | 'groesstenteils-richtig'
  | 'richtig';

/** Vollständig extrahierter Artikel für den Reader. */
export interface Article {
  url: string;
  title: string;
  kicker?: string;
  /** Projekt-/Rubrik-Badge (z. B. „Faktencheck"). */
  badge?: string;
  authors: string[];
  publishedAt: string;
  readingMinutes: number;
  heroImageUrl?: string;
  /** Bereinigtes Artikel-HTML (Tag-Allowlist) für die Reader-WebView. */
  bodyHtml: string;
  rating?: FactcheckRating;
  relatedLinks: { title: string; url: string }[];
  /** true = aus dem gebündelten Offline-Cache geladen. */
  offline?: boolean;
}

// --- Mediathek ----------------------------------------------------------------

export interface Video {
  id: string;
  title: string;
  thumbnailUrl: string;
  publishedAt: string;
  channel: 'gespraech' | 'funfacts' | 'hauptkanal';
  description: string;
}

export interface PodcastEpisode {
  id: string;
  seriesId: string;
  title: string;
  description: string;
  durationSec: number;
  /** Externe URL oder gebündeltes Asset (require-Modul-ID). */
  audioUrl?: string;
  audioAsset?: number;
  /** Bonusfolge → 60-s-Preview für Nicht-Mitglieder. */
  isBonus: boolean;
}

export interface PodcastSeries {
  id: string;
  title: string;
  description: string;
  coverImage?: string;
  episodes: PodcastEpisode[];
}

// --- Mitmachen (SAMPLE nach Beabee / Faktenforum) -----------------------------

export type CalloutFieldType = 'select' | 'multiselect' | 'text' | 'textarea' | 'photo';

export interface CalloutField {
  key: string;
  type: CalloutFieldType;
  label: string;
  required?: boolean;
  options?: string[];
}

/** CrowdNewsroom-Callout, angelehnt an das Beabee-Callout/Response-Schema. */
export interface Callout {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  intro: string;
  privacyNote: string;
  status: 'open' | 'closed';
  expiresAt?: string;
  responseCount: number;
  goal?: number;
  form: CalloutField[];
}

export interface CalloutSubmission {
  calloutId: string;
  answers: Record<string, unknown>;
  submittedAt: string;
}

/** Faktenforum-Behauptung, angelehnt an das Hasura/GraphQL-Schema. */
export interface Claim {
  id: string;
  shortText: string;
  origin: string;
  submittedAt: string;
  status: 'eingereicht' | 'in-pruefung' | 'geprueft';
  rating?: string;
  sources: { url: string; assessment: string }[];
}

// --- Club & Profil ------------------------------------------------------------

export interface MembershipState {
  isMember: boolean;
  /** ISO-8601, gesetzt nach Beitritt. */
  memberSince?: string;
  amountEur: number;
  interval: 'monat' | 'jahr';
}

// --- Spotlight / Newsletter (SAMPLE) -----------------------------------------

export interface SpotlightIssue {
  id: string;
  date: string;
  title: string;
  intro: string;
  items: { time: string; headline: string; body: string }[];
}
