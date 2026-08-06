import { cachedFetch } from '@/lib/net/cachedFetch';

/**
 * What an article page says about itself beyond what the feed carries: the lead
 * image and the reading time.
 *
 * The reading time is not estimated here. correctiv.org publishes its own number
 * as a `twitter:label`/`twitter:data` pair, so the app shows what the website
 * shows instead of a second, differing guess. The pair's index moves — `label1`
 * on a Spotlight piece, which has no author, `label2` on a fact check, where
 * `label1` is "Verfasst von" — so the label has to be found by its value, never
 * by its position.
 */
export type ArticlePageMeta = {
  imageUrl?: string;
  readingMinutes?: number;
};

const META_TAG = /<meta[^>]*>/gi;

function attribute(tag: string, name: string): string | undefined {
  return tag.match(new RegExp(`\\b${name}=["']([^"']*)["']`, 'i'))?.[1];
}

/**
 * `name`/`property` → `content` for every meta tag, so the order of attributes
 * inside a tag cannot matter — WordPress emits both orders on the same page.
 * First occurrence wins, which is the one a browser would use.
 */
function metaTags(html: string): Map<string, string> {
  const tags = new Map<string, string>();
  for (const [tag] of html.matchAll(META_TAG)) {
    const key = attribute(tag, 'property') ?? attribute(tag, 'name');
    const content = attribute(tag, 'content');
    if (key && content && !tags.has(key)) tags.set(key, content);
  }
  return tags;
}

function readingMinutes(tags: Map<string, string>): number | undefined {
  for (const [key, value] of tags) {
    const index = /^twitter:label(\d+)$/.exec(key)?.[1];
    if (!index || !/lesezeit/i.test(value)) continue;
    const minutes = Number.parseInt(tags.get(`twitter:data${index}`) ?? '', 10);
    if (Number.isFinite(minutes) && minutes > 0) return minutes;
  }
  return undefined;
}

export function extractPageMeta(html: string): ArticlePageMeta {
  const tags = metaTags(html);
  return { imageUrl: tags.get('og:image'), readingMinutes: readingMinutes(tags) };
}

export async function fetchPageMeta(articleUrl: string): Promise<ArticlePageMeta> {
  try {
    const html = await cachedFetch(`page:${articleUrl}`, articleUrl, {
      policy: 'cache-first',
      ttlMs: 24 * 60 * 60 * 1000,
      timeoutMs: 8000,
    });
    return extractPageMeta(html);
  } catch {
    return {};
  }
}
