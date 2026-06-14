import type { FeedItem, FeedKey } from '../types/models';
import { fetchText } from './http';
import { decodeEntities } from '../lib/extract.mjs';
import { getCached, setCached } from './cache.service';

/**
 * Full-text search across correctiv.org via the public WordPress REST API
 * (/wp-json/wp/v2/posts?search=…). One request returns title, excerpt, date,
 * link and the featured image, so results map straight onto FeedItem and
 * render with the normal ArticleCard. No auth, no scraping.
 *
 * The SearchPage keeps a local search over already-loaded feed items as the
 * offline/error fallback — the demo must never depend on Wi-Fi.
 */
const ENDPOINT = 'https://correctiv.org/wp-json/wp/v2/posts';
const FIELDS = 'id,date,link,title,excerpt,jetpack_featured_media_url';
const CACHE_NS = 'search';
const TTL_MS = 10 * 60 * 1000;

interface WpPost {
  id: number;
  date: string;
  link: string;
  title: { rendered: string };
  excerpt: { rendered: string };
  jetpack_featured_media_url?: string;
}

function stripHtml(html: string): string {
  return decodeEntities(html.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
}

/** Best-effort feed bucket from the article URL (FeedItem.feed is display-only here). */
function feedKeyFromUrl(url: string): FeedKey {
  if (url.includes('/faktencheck/')) return 'faktencheck';
  if (url.includes('/klimawandel/')) return 'klima';
  if (url.includes('/lokal/')) return 'lokal';
  if (url.includes('/salon5/')) return 'salon5';
  return 'recherchen';
}

function toFeedItem(post: WpPost): FeedItem {
  return {
    id: `wp-${post.id}`,
    feed: feedKeyFromUrl(post.link),
    title: stripHtml(post.title?.rendered ?? ''),
    url: post.link,
    teaser: stripHtml(post.excerpt?.rendered ?? ''),
    publishedAt: post.date ? new Date(post.date).toISOString() : new Date(0).toISOString(),
    categories: [],
    imageUrl: post.jetpack_featured_media_url || null,
  };
}

/** Search published correctiv.org posts. Throws on network error (caller falls back). */
export async function searchArticles(query: string, count = 15): Promise<FeedItem[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const cacheKey = q.toLowerCase();
  const cached = getCached<FeedItem[]>(CACHE_NS, cacheKey, TTL_MS);
  if (cached) return cached;

  const url = `${ENDPOINT}?search=${encodeURIComponent(q)}&per_page=${count}&_fields=${FIELDS}`;
  const posts = JSON.parse(await fetchText(url, 10000)) as WpPost[];
  const items = Array.isArray(posts) ? posts.filter((p) => p?.link).map(toFeedItem) : [];
  setCached(CACHE_NS, cacheKey, items);
  return items;
}
