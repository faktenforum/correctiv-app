/**
 * correctiv.org through its WordPress REST API.
 *
 * The RSS feeds this replaces cost one request and gave four fields. They also
 * gave no image, no pagination and no `Access-Control-Allow-Origin`, which is why
 * the web build shipped a snapshot of the news instead of the news. Measured on
 * 2026-09-01, all of that turns out to be an RSS property rather than a
 * correctiv.org property:
 *
 * | | RSS | this |
 * | --- | --- | --- |
 * | CORS | no header | reflects the `Origin` |
 * | how many | 100, 10 or 7 per category, fixed | 7.154 posts, paged |
 * | image | none | four named sizes, `thumbnail` to `full` |
 * | verdict | only by scraping the article page | `acf["post::interpretation"]` |
 * | reading time | estimated from the body | as the site prints it |
 * | one card's cost | ~115 KB, the whole article page, for an `og:image` | ~2 KB, everything |
 *
 * That last row is the one that decided it. A list of 20 cards cost about 2.3 MB
 * of HTML, because the only way to find a lead image was to fetch each article
 * page and read its `og:image`. The same 20 cards are 43 KB here, and arrive with
 * the verdict and the byline the RSS path had to guess at or scrape.
 *
 * **Nothing had to change at CORRECTIV for this.** The fields below are already
 * public. Two of them are only reachable because this WordPress exposes plugin
 * output on the post: `acf` (Advanced Custom Fields) carries the fact-check
 * verdict and the kicker, `yoast_head_json` the byline and the printed reading
 * time. WordPress's own `meta` carries neither, which is where the first search
 * looked.
 *
 * What is *not* available, and stays a request to CORRECTIV: `wp/v2/users`
 * answers 401 ("DRA: Only authenticated users can access the REST API"), so
 * author ids cannot be resolved in bulk. `yoast_head_json.author` gives the name
 * per post instead, which is why this reads it there.
 */

import { estimateReadingMinutes } from '../articles/page-meta';
import { ratingFromInterpretation } from '../articles/rating';
import type { ExtractedArticle } from '../articles/types';
import { decodeEntities, sanitizeArticleHtml, stripTags } from '../lib/html';
import type { FeedItem, FeedKey } from '../types/models';
import { fetchJson } from './http';

const API = 'https://correctiv.org/wp-json/wp/v2';

/**
 * What a card needs, and not one field more.
 *
 * `_fields` prunes nested paths on a normal response (`acf.post::topline` works),
 * which is what keeps a page of 20 at 43 KB. It does **not** prune inside
 * `_embedded`, so `_embed` is not used here: asking for the featured media and
 * the author that way cost 217 KB for ten posts against 8 KB without, and
 * `cvui_featured_image` carries the same image in better sizes anyway.
 */
const LIST_FIELDS = [
  'id',
  'date',
  'link',
  'title',
  'excerpt',
  'acf.post::interpretation',
  'acf.post::topline',
  'acf.post::excerpt',
  'cvui_featured_image',
  'cvui_categories',
  'yoast_head_json.author',
  'yoast_head_json.twitter_misc',
].join(',');

/** The reader additionally needs the body. */
const ARTICLE_FIELDS = `${LIST_FIELDS},content,modified`;

const LIST_TIMEOUT_MS = 12000;

/** One image variant as the theme exposes it. */
interface WpImageVariant {
  url?: string;
  width?: number;
  height?: number;
}

/**
 * The shape of a post, as far as this file cares.
 *
 * Everything is optional and several fields can be `false`: an unset ACF field
 * serialises as `false`, not as `null` or an absent key (`post::authors` is
 * `false` on most posts). A type that says `string` here would be a lie that
 * typechecks.
 */
interface WpPost {
  id?: number;
  date?: string;
  modified?: string;
  link?: string;
  title?: { rendered?: string };
  excerpt?: { rendered?: string };
  content?: { rendered?: string };
  acf?: {
    'post::interpretation'?: { value?: string; label?: string } | false | null;
    'post::topline'?: string | false | null;
    'post::excerpt'?: string | false | null;
  } | null;
  cvui_featured_image?: Record<string, WpImageVariant> | false | null;
  cvui_categories?: { id?: number; name?: string; slug?: string }[] | null;
  yoast_head_json?: {
    author?: string;
    twitter_misc?: Record<string, string>;
  } | null;
}

/** Image variants the theme publishes, widest last. */
export type WpImageSize = 'thumbnail' | 'list' | 'widget-post' | 'full';

function text(value: string | false | null | undefined): string {
  return typeof value === 'string' ? value.trim() : '';
}

/** `excerpt.rendered` is a paragraph of HTML; the ACF field is already plain. */
function plain(html: string): string {
  return decodeEntities(stripTags(html)).replace(/\s+/g, ' ').trim();
}

/**
 * The lead image at the size the caller will actually draw.
 *
 * Falls back down the list rather than up: a card that asked for `list` and got
 * `full` draws a 2560 px JPEG into a 350 px row, which is the waste this whole
 * file exists to remove. Asking for a size the post does not have is normal —
 * the variants are generated per upload.
 */
export function wpImage(post: WpPost, prefer: WpImageSize = 'list'): string | null {
  const variants = post.cvui_featured_image;
  if (!variants) return null;

  // Two loops rather than one built list: up from `prefer` to the widest, then
  // down to the narrowest. Written out because the tidy version needs either
  // `Array#reverse` on a copy (which the linter reads as a mutation) or
  // `toReversed`, and Hermes cannot be relied on for the second.
  const order: WpImageSize[] = ['thumbnail', 'list', 'widget-post', 'full'];
  const from = Math.max(0, order.indexOf(prefer));
  for (let i = from; i < order.length; i += 1) {
    const url = variants[order[i]]?.url;
    if (url) return url;
  }
  for (let i = from - 1; i >= 0; i -= 1) {
    const url = variants[order[i]]?.url;
    if (url) return url;
  }
  return null;
}

/**
 * "4 Minuten" → 4.
 *
 * Yoast prints this on the page, so it is the site's own number rather than an
 * estimate over the body. The key is German because the site is; a locale change
 * upstream would drop the value, and the reader then estimates as before.
 */
function readingMinutes(post: WpPost): number | undefined {
  const printed = post.yoast_head_json?.twitter_misc?.['Geschätzte Lesezeit'];
  const minutes = printed ? Number.parseInt(printed, 10) : Number.NaN;
  return Number.isFinite(minutes) && minutes > 0 ? minutes : undefined;
}

function interpretation(post: WpPost): string | undefined {
  const field = post.acf?.['post::interpretation'];
  return field && typeof field === 'object' ? field.value : undefined;
}

/** The lead paragraph: the editorial field first, the generated excerpt second. */
function excerpt(post: WpPost): string {
  return text(post.acf?.['post::excerpt']) || plain(post.excerpt?.rendered ?? '');
}

/**
 * Which of the app's feeds a post belongs to.
 *
 * `cvui_categories` names every category on the post, so this is a lookup rather
 * than the guess it replaces: the search used to read the bucket out of the
 * article's URL path (`/faktencheck/` in the link), which broke for anything
 * published outside a category-shaped permalink and could not see a second
 * category at all. A post carries several — the sampled fact check is in both
 * `faktencheck` and `klima` — so the caller passes the priority it wants.
 */
export function wpFeedKey(
  post: WpPost,
  priority: readonly { slug: string; feed: FeedKey }[],
  fallback: FeedKey = 'recherchen',
): FeedKey {
  const slugs = new Set((post.cvui_categories ?? []).map((c) => c.slug));
  return priority.find((p) => slugs.has(p.slug))?.feed ?? fallback;
}

/** A post as a feed card. */
export function toFeedItem(post: WpPost, feed: FeedKey, imageSize: WpImageSize = 'list'): FeedItem {
  return {
    id: `wp-${post.id ?? post.link ?? ''}`,
    feed,
    title: plain(post.title?.rendered ?? ''),
    url: post.link ?? '',
    teaser: excerpt(post),
    author: post.yoast_head_json?.author || undefined,
    publishedAt: post.date ? new Date(post.date).toISOString() : new Date(0).toISOString(),
    categories: (post.cvui_categories ?? []).map((c) => c.name ?? '').filter(Boolean),
    imageUrl: wpImage(post, imageSize),
    readingMinutes: readingMinutes(post),
  };
}

/** A post as a fully extracted article, ready for `buildReaderHtml`. */
export function toArticle(post: WpPost): ExtractedArticle {
  const body = post.content?.rendered ?? '';
  return {
    title: plain(post.title?.rendered ?? ''),
    kicker: text(post.acf?.['post::topline']) || undefined,
    excerpt: excerpt(post) || undefined,
    authors: post.yoast_head_json?.author ? [post.yoast_head_json.author] : [],
    publishedAt: post.date ? new Date(post.date).toISOString() : '',
    readingMinutes: readingMinutes(post) ?? estimateReadingMinutes(stripTags(body)),
    // `list` (706 px) and not `widget-post` (2560): the reader is a phone-width
    // WebView, and the offline generator already settled on 640 as enough.
    heroImageUrl: wpImage(post, 'list') ?? undefined,
    bodyHtml: sanitizeArticleHtml(body),
    rating: ratingFromInterpretation(interpretation(post)),
  };
}

export interface WpFeedPage {
  items: FeedItem[];
  /** True while another page is worth asking for. */
  hasMore: boolean;
}

export interface FetchWpFeedOptions {
  /** WordPress category id. Omit for the site-wide stream of every post. */
  categoryId?: number;
  /** 1-based, as WordPress counts. */
  page?: number;
  perPage?: number;
}

/**
 * One page of a feed.
 *
 * `hasMore` is inferred from a full page rather than read from
 * `X-WP-TotalPages`, because the core's one fetch returns a body and not a
 * response. Trading an exact count for not reshaping `http.ts` is the right way
 * round: nothing in the app displays a total, and "is there another page" is the
 * only question a list asks.
 */
export async function fetchWpFeed(
  feed: FeedKey,
  options: FetchWpFeedOptions = {},
): Promise<WpFeedPage> {
  const { categoryId, page = 1, perPage = 20 } = options;
  const query = new URLSearchParams({
    per_page: String(perPage),
    page: String(page),
    _fields: LIST_FIELDS,
  });
  if (categoryId !== undefined) query.set('categories', String(categoryId));

  const posts = await fetchJson<WpPost[]>(`${API}/posts?${query}`, {
    timeoutMs: LIST_TIMEOUT_MS,
  });
  const list = Array.isArray(posts) ? posts.filter((p) => p?.link) : [];
  return {
    /**
     * Every card is stamped with the feed that was asked for, including on the
     * site-wide feed where the posts do come from every section.
     *
     * Bucketing them by `wpFeedKey` would be easy and is deliberately not done:
     * `item.feed` drives the section badge, so Home's „Neueste Recherchen“ would
     * suddenly sprout „Faktencheck“ labels next to a rail that already shows fact
     * checks. That is an editorial call about how Home reads, not a mapping
     * detail. The search buckets, because there a hit has no other context.
     */
    items: list.map((post) => toFeedItem(post, feed)),
    hasMore: list.length === perPage,
  };
}

/** Full-text search over published posts. */
export async function searchWpPosts(
  query: string,
  count: number,
  priority: readonly { slug: string; feed: FeedKey }[] = [],
): Promise<FeedItem[]> {
  const params = new URLSearchParams({
    search: query,
    per_page: String(count),
    _fields: LIST_FIELDS,
  });
  const posts = await fetchJson<WpPost[]>(`${API}/posts?${params}`, { timeoutMs: 10000 });
  return (Array.isArray(posts) ? posts : [])
    .filter((p) => p?.link)
    .map((post) => toFeedItem(post, wpFeedKey(post, priority)));
}

/**
 * The last path segment of a correctiv.org permalink.
 *
 * `?slug=` is how a post is looked up by URL: WordPress has no "by permalink"
 * endpoint, and slugs are unique per post type, so a nested permalink like
 * `/faktencheck/2026/08/31/<slug>/` resolves from its tail alone.
 */
export function slugFromUrl(url: string): string | null {
  const path = url.split('?')[0].split('#')[0].replace(/\/+$/, '');
  const slug = path.slice(path.lastIndexOf('/') + 1);
  return slug && !slug.includes('.') ? slug : null;
}

/**
 * One article, by its public URL. `null` when the API does not know the slug,
 * which is a normal answer and not an error: the caller then scrapes the page as
 * it always did.
 */
export async function fetchWpArticle(url: string): Promise<ExtractedArticle | null> {
  const slug = slugFromUrl(url);
  if (!slug) return null;
  const params = new URLSearchParams({ slug, _fields: ARTICLE_FIELDS, per_page: '1' });
  const posts = await fetchJson<WpPost[]>(`${API}/posts?${params}`, {
    timeoutMs: LIST_TIMEOUT_MS,
  });
  const post = Array.isArray(posts) ? posts[0] : undefined;
  if (!post?.content?.rendered) return null;
  const article = toArticle(post);
  return article.bodyHtml ? article : null;
}
