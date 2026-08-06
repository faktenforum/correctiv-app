import { metaTags } from '../lib/html';

/**
 * What an article page says about itself in its `<head>` — independent of the
 * extraction backend, because both backends need it and neither needs a parser
 * for it.
 */

export interface PageMeta {
  heroImageUrl?: string;
  /** The page's OWN reading time, when it publishes one. */
  readingMinutes?: number;
  title?: string;
  excerpt?: string;
}

/**
 * The reading time is not estimated here.
 *
 * correctiv.org publishes its own number as a `twitter:label`/`twitter:data`
 * pair, so the app can show what the website shows instead of a second, differing
 * guess. The pair's index moves — `label1` on a Spotlight piece, which has no
 * author, `label2` on a fact check, where `label1` is "Verfasst von" — so the
 * label has to be found by its value, never by its position.
 */
function publishedReadingMinutes(tags: Map<string, string>): number | undefined {
  for (const [key, value] of tags) {
    const index = /^twitter:label(\d+)$/.exec(key)?.[1];
    if (!index || !/lesezeit/i.test(value)) continue;
    const minutes = Number.parseInt(tags.get(`twitter:data${index}`) ?? '', 10);
    if (Number.isFinite(minutes) && minutes > 0) return minutes;
  }
  return undefined;
}

export function extractPageMeta(html: string): PageMeta {
  const tags = metaTags(html);
  return {
    heroImageUrl: tags.get('og:image'),
    readingMinutes: publishedReadingMinutes(tags),
    title: tags.get('og:title'),
    excerpt: tags.get('og:description'),
  };
}

/** ~200 words per minute, at least one. The fallback when the page publishes none. */
export function estimateReadingMinutes(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}
