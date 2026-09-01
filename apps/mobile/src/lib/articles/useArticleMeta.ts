import { useEffect, useState } from 'react';

import { loadPageMeta } from '@correctiv/app-core/articles/load';
import type { PageMeta } from '@correctiv/app-core/articles/page-meta';

/**
 * What the card does not already carry: lead image and reading time.
 *
 * **It asks for nothing when the item has both**, which since the move to the REST
 * API is the normal case. That guard is the point of this file now. Before it, the
 * hero fetched the whole article page — about 115 KB — for a reading time the feed
 * did not carry, on every render of Home. On the web target that request is not
 * merely wasteful, it is blocked: the article page sends no
 * `Access-Control-Allow-Origin`, so the browser refuses it, the byline loses its
 * reading time and the console gets a CORS error. Found by opening the export in a
 * browser after everything else was green.
 *
 * The fetch stays for the RSS fallback path, which carries no reading time, and it
 * is cache-first with a 24-hour window against a page the reader will very likely
 * open next.
 */
export function useArticleMeta(
  articleUrl: string,
  initialImage?: string,
  initialReadingMinutes?: number,
): PageMeta {
  const [meta, setMeta] = useState<PageMeta>({});
  const complete = Boolean(initialImage && initialReadingMinutes);

  useEffect(() => {
    if (complete) return;
    let active = true;
    void (async () => {
      const found = await loadPageMeta(articleUrl);
      if (active) setMeta(found);
    })();
    return () => {
      active = false;
    };
  }, [articleUrl, complete]);

  return {
    heroImageUrl: initialImage ?? meta.heroImageUrl,
    readingMinutes: initialReadingMinutes ?? meta.readingMinutes,
  };
}
