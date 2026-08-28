import type { FactcheckRating } from './types';

/**
 * The fact-check vocabulary — one label set, one colour logic, two ways in.
 *
 * A correctiv.org fact check states its verdict twice: as an image path
 * (`/rating/mostly-false.svg`) and as German prose next to it ("Größtenteils
 * falsch · Über diese Bewertung"). Two earlier readers each took one of them and
 * built their own vocabulary around it, English slugs against German slugs, so the
 * same article could be styled by one and unstyled by the other.
 *
 * Both readings now land on the same union.
 */

const LABELS: Record<FactcheckRating, string> = {
  falsch: 'Falsch',
  'groesstenteils-falsch': 'Größtenteils falsch',
  'fehlender-kontext': 'Fehlender Kontext',
  unbelegt: 'Unbelegt',
  irrefuehrend: 'Irreführend',
  manipuliert: 'Manipuliert',
  satire: 'Satire',
  'groesstenteils-richtig': 'Größtenteils richtig',
  richtig: 'Richtig',
};

/**
 * How a verdict reads at a glance. Three tones rather than nine colours, because
 * a plaque has to be legible before it is read: refuted, qualified, confirmed.
 */
export type RatingTone = 'refuted' | 'qualified' | 'confirmed';

const TONES: Record<FactcheckRating, RatingTone> = {
  falsch: 'refuted',
  'groesstenteils-falsch': 'refuted',
  manipuliert: 'refuted',
  'fehlender-kontext': 'qualified',
  unbelegt: 'qualified',
  irrefuehrend: 'qualified',
  satire: 'qualified',
  'groesstenteils-richtig': 'confirmed',
  richtig: 'confirmed',
};

/** The English slugs CORRECTIV uses in its rating image paths. */
const FROM_SVG_SLUG: Record<string, FactcheckRating> = {
  false: 'falsch',
  'mostly-false': 'groesstenteils-falsch',
  'missing-context': 'fehlender-kontext',
  unproven: 'unbelegt',
  misleading: 'irrefuehrend',
  manipulated: 'manipuliert',
  satire: 'satire',
  'mostly-true': 'groesstenteils-richtig',
  true: 'richtig',
};

/**
 * German prose → verdict. Order matters: "größtenteils falsch" has to be tested
 * before the bare "falsch" it contains, or every qualified verdict collapses into
 * its absolute.
 */
const FROM_TEXT: { test: RegExp; value: FactcheckRating }[] = [
  { test: /gr(ö|oe)(ß|ss)tenteils falsch/i, value: 'groesstenteils-falsch' },
  { test: /gr(ö|oe)(ß|ss)tenteils richtig/i, value: 'groesstenteils-richtig' },
  { test: /fehlender kontext/i, value: 'fehlender-kontext' },
  { test: /irref(ü|ue)hrend/i, value: 'irrefuehrend' },
  { test: /manipuliert/i, value: 'manipuliert' },
  { test: /unbelegt|unbewiesen/i, value: 'unbelegt' },
  { test: /\bsatire\b/i, value: 'satire' },
  { test: /\bfalsch\b/i, value: 'falsch' },
  { test: /\brichtig\b/i, value: 'richtig' },
];

/** `…/rating/mostly-false.svg` → `groesstenteils-falsch`. Underscores tolerated. */
export function ratingFromSvgSlug(slug: string | null | undefined): FactcheckRating | undefined {
  if (!slug) return undefined;
  return FROM_SVG_SLUG[slug.toLowerCase().replace(/_/g, '-')];
}

const SVG_PATH = /\/rating\/([a-z0-9_-]+)\.svg/i;

/**
 * The verdict as the page's rating image states it.
 *
 * The primary signal for both extraction backends, and the reason they agree:
 * the image path is a closed set, whereas the prose beside it is editorial text
 * that has to be pattern-matched. Both read the raw markup here, so neither can
 * end up with a verdict the other misses.
 */
export function ratingFromPage(html: string): FactcheckRating | undefined {
  return ratingFromSvgSlug(SVG_PATH.exec(html)?.[1]);
}

/** "Größtenteils falsch · Über diese Bewertung" → `groesstenteils-falsch`. */
export function ratingFromText(text: string | null | undefined): FactcheckRating | undefined {
  if (!text) return undefined;
  return FROM_TEXT.find((r) => r.test.test(text))?.value;
}

export function ratingLabel(rating: FactcheckRating): string {
  return LABELS[rating];
}

export function ratingTone(rating: FactcheckRating): RatingTone {
  return TONES[rating];
}

/** Every known verdict — for tests and for rendering a legend. */
export const FACTCHECK_RATINGS = Object.keys(LABELS) as FactcheckRating[];
