/**
 * Ordering for lists that arrive in more than one piece.
 *
 * Dependency-free like the rest of `lib/`, and it takes a shape rather than a
 * model, so a feed item and a video can be ordered by the same rule.
 */

/**
 * Newest first, by an ISO-8601 timestamp under a key the caller names.
 *
 * The key is a parameter because the three models that need this disagree about
 * it: a feed item and a video carry `publishedAt`, a newsletter issue carries
 * `date`. Ordering is the same idea in all three, and the alternative was a
 * second hand-written comparator for the third.
 *
 * **Returns 0 for two items published at the same instant, and that zero is the
 * point.** The comparator this replaces read `a.publishedAt < b.publishedAt ? 1 :
 * -1`, which answers -1 for a tie in BOTH directions, an inconsistent comparator,
 * so `sort` may reverse equal items instead of leaving them alone. It only ever
 * ran on merged feed lists, where nobody would have noticed; the first
 * single-feed test with two items on the same timestamp caught it immediately.
 * With 0 the sort is stable (ES2019), so items that agree on the minute keep the
 * order their source put them in, which is the only order left that means
 * anything.
 *
 * It lives here because there are two callers: `stores/feeds.ts` orders every
 * slice it holds, and `services/peertube.service.ts` orders videos merged out of
 * several channels. A second hand-written copy is a second chance to write the
 * inconsistent version, and the second copy is the one nobody tests for a tie.
 */
export function byNewest<K extends string>(key: K) {
  return <T extends Record<K, string>>(a: T, b: T): number => {
    if (a[key] === b[key]) return 0;
    return a[key] < b[key] ? 1 : -1;
  };
}

/** The two shapes this repo actually orders. */
export const byPublishedAt = byNewest('publishedAt');
export const byDate = byNewest('date');
