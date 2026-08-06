import { useEffect, useState } from 'react';

import { fetchPageMeta, type ArticlePageMeta } from './pageMeta';

/**
 * Loads what the feed does not carry — lead image and reading time — in one
 * cache-first, idempotent request.
 *
 * `initialImage` short-circuits the image only, not the request: a feed item that
 * already has an image still has no reading time. That costs one fetch per hero,
 * cached for 24 h and against a page the reader will ask for anyway.
 */
export function useArticleMeta(articleUrl: string, initialImage?: string): ArticlePageMeta {
  const [meta, setMeta] = useState<ArticlePageMeta>({});

  useEffect(() => {
    let active = true;
    void (async () => {
      const found = await fetchPageMeta(articleUrl);
      if (active) setMeta(found);
    })();
    return () => {
      active = false;
    };
  }, [articleUrl]);

  return { imageUrl: initialImage ?? meta.imageUrl, readingMinutes: meta.readingMinutes };
}
