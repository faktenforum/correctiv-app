/**
 * The reader's article model — the one part of this app's data layer that is
 * NOT yet unified with the core.
 *
 * The feed model moved to `@correctiv/app-core/types/models` (one FeedItem, one
 * set of parsers). The article model did not, deliberately: the core's
 * `ArticleDetail` and this `Article` are cut differently rather than merely
 * renamed — `topline`/`kicker`, `headline`/`title`, `ratingText`/`badge`,
 * `dateText`, `excerpt`, and only this one has `relatedLinks`. Reconciling them
 * means rewriting `extract.ts` and the reader HTML builder, and the reader is
 * the one screen that is already finished. Doing it as part of bringing the
 * *unbuilt* screens up would risk the working one for no gain.
 *
 * Tracked in adr/0004-react-native-pivot.md under "Offen".
 */

export type FactcheckRating =
  | 'falsch'
  | 'groesstenteils-falsch'
  | 'fehlender-kontext'
  | 'unbelegt'
  | 'manipuliert'
  | 'groesstenteils-richtig'
  | 'richtig';

/** A fully extracted article, ready for the reader. */
export interface Article {
  url: string;
  title: string;
  kicker?: string;
  /** Project/section badge (e.g. "Faktencheck"). */
  badge?: string;
  authors: string[];
  publishedAt: string;
  readingMinutes: number;
  heroImageUrl?: string;
  /** Sanitised article HTML (tag allowlist) for the reader WebView. */
  bodyHtml: string;
  rating?: FactcheckRating;
  relatedLinks: { title: string; url: string }[];
  /** true = loaded from the bundled offline cache. */
  offline?: boolean;
}
