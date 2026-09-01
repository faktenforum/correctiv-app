import type { SpotlightIssue } from '../data/spotlight';
import { decodeEntities, stripTags } from '../lib/html';
import { fetchJson } from './http';

/**
 * The Spotlight newsletter archive.
 *
 * A public WordPress post type, `newspack_nl_cpt`, from the Newspack Newsletters
 * plugin. 523 issues on 2026-09-01, newest first, and a page of twelve with the
 * four fields below is 4,5 KB. No auth, and the same `Origin`-reflecting CORS
 * header as the rest of the API, so this works in the browser build too.
 *
 * `content` is deliberately not requested. It is the sent email, table layout and
 * all, and nothing in the app renders it — see `data/spotlight.ts` for why an
 * issue opens in the browser instead.
 */
const ENDPOINT = 'https://correctiv.org/wp-json/wp/v2/newspack_nl_cpt';

/**
 * `yoast_head_json.og_image` and not `cvui_featured_image`.
 *
 * The theme's image field is a post-only thing: on every sampled issue
 * `featured_media` is 0 and `acf` is an empty array, while Yoast still resolves a
 * social image. Which is often the newsletter's standing masthead GIF, hence the
 * warning on `SpotlightIssue.imageUrl`.
 */
const FIELDS = 'id,date,link,title,excerpt,yoast_head_json.og_image';

const TIMEOUT_MS = 10000;

interface NewsletterPost {
  id?: number;
  date?: string;
  link?: string;
  title?: { rendered?: string };
  excerpt?: { rendered?: string };
  yoast_head_json?: { og_image?: { url?: string }[] } | null;
}

function plain(html: string): string {
  return decodeEntities(stripTags(html)).replace(/\s+/g, ' ').trim();
}

function toIssue(post: NewsletterPost): SpotlightIssue {
  return {
    id: `nl-${post.id ?? post.link ?? ''}`,
    date: post.date ? new Date(post.date).toISOString() : new Date(0).toISOString(),
    subject: plain(post.title?.rendered ?? ''),
    teaser: plain(post.excerpt?.rendered ?? ''),
    url: post.link ?? '',
    imageUrl: post.yoast_head_json?.og_image?.[0]?.url ?? null,
  };
}

/** The newest issues, newest first. Throws so the caller can fall back. */
export async function fetchSpotlightIssues(count = 12): Promise<SpotlightIssue[]> {
  const params = new URLSearchParams({ per_page: String(count), _fields: FIELDS });
  const posts = await fetchJson<NewsletterPost[]>(`${ENDPOINT}?${params}`, {
    timeoutMs: TIMEOUT_MS,
  });
  return (Array.isArray(posts) ? posts : [])
    .filter((post) => post?.link && post?.title?.rendered)
    .map(toIssue);
}
