import { platform } from '../ports';
import { fetchCachedText, getCached, getStale, setCached } from '../services/cache.service';
import { fetchText } from '../services/http';
import { extractArticleFromString } from './extract/string';
import { extractPageMeta, type PageMeta } from './page-meta';
import type { Article, ArticleExtractor } from './types';

/**
 * Getting an article onto the screen, as one cascade.
 *
 * There were two of these once, and they disagreed about the order. One asked the
 * cache first and fell back to its bundled copy only after the network failed.
 * The other checked its bundle first and never cached what it extracted. This
 * takes the better half of each.
 *
 *   1. the host's bundle      — pre-extracted, needs no network, never changes
 *   2. a fresh cached article — extracted earlier this day
 *   3. the network            — fetch, extract, cache the result
 *   4. a stale cached article — expired beats absent
 *
 * The bundle comes first because that is the promise the demo makes: the reader
 * opens without Wi-Fi. Only the extracted article is cached, not the page HTML —
 * a tenth of the bytes and no second extraction on the next open.
 */

const CACHE_NS = 'articles';
const TTL_MS = 24 * 60 * 60 * 1000;
const PAGE_TIMEOUT_MS = 12000;

/**
 * Which extraction backend this host uses. The string one is the default because
 * it runs anywhere; a host that has installed an HTML parser registers the DOM
 * one at startup. See `articles/types.ts` for the trade-off.
 */
let extract: ArticleExtractor = extractArticleFromString;

export function configureArticleExtractor(next: ArticleExtractor): void {
  extract = next;
}

export interface LoadArticleOptions {
  /** Section badge from the calling screen — the page's own kicker wins if it has one. */
  kicker?: string;
}

export async function loadArticle(url: string, options: LoadArticleOptions = {}): Promise<Article> {
  const bundled = platform().content.article(url);
  if (bundled) return { ...bundled, kicker: bundled.kicker ?? options.kicker, offline: true };

  const cached = await getCached<Article>(CACHE_NS, url, TTL_MS);
  if (cached) return cached;

  try {
    const html = await fetchText(url, { timeoutMs: PAGE_TIMEOUT_MS });
    const extracted = extract(html);
    if (!extracted.bodyHtml) throw new Error(`No article body at ${url}`);
    const article: Article = {
      url,
      ...extracted,
      kicker: extracted.kicker ?? options.kicker,
    };
    await setCached(CACHE_NS, url, article);
    return article;
  } catch (err) {
    const stale = await getStale<Article>(CACHE_NS, url);
    if (stale) return stale;
    throw err;
  }
}

/**
 * What a feed item does not carry: the lead image and the reading time.
 *
 * Cheap enough to call per card — the page is fetched cache-first with a 24-hour
 * window, and it is a page the reader will very likely ask for next anyway. Never
 * throws: a card without an image is a card, a card that blew up is a bug.
 */
export async function loadPageMeta(url: string): Promise<PageMeta> {
  const bundled = platform().content.article(url);
  if (bundled) {
    return {
      heroImageUrl: platform().content.image(url) ?? bundled.heroImageUrl,
      readingMinutes: bundled.readingMinutes,
      title: bundled.title,
      excerpt: bundled.excerpt,
    };
  }
  try {
    const html = await fetchCachedText(`page:${url}`, url, {
      policy: 'cache-first',
      ttlMs: TTL_MS,
      timeoutMs: 8000,
    });
    return extractPageMeta(html);
  } catch {
    return {};
  }
}
