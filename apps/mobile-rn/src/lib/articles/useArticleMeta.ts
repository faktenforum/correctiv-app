import { useEffect, useState } from 'react';

import { loadPageMeta } from '@correctiv/app-core/articles/load';
import type { PageMeta } from '@correctiv/app-core/articles/page-meta';

/**
 * Loads what the feed does not carry — lead image and reading time — in one
 * cache-first, idempotent request through the core.
 *
 * `initialImage` short-circuits the image only, not the request: a feed item that
 * already has an image still has no reading time. That costs one fetch per hero,
 * cached for 24 h, against a page the reader will very likely ask for anyway.
 */
export function useArticleMeta(articleUrl: string, initialImage?: string): PageMeta {
  const [meta, setMeta] = useState<PageMeta>({});

  useEffect(() => {
    let active = true;
    void (async () => {
      const found = await loadPageMeta(articleUrl);
      if (active) setMeta(found);
    })();
    return () => {
      active = false;
    };
  }, [articleUrl]);

  return { heroImageUrl: initialImage ?? meta.heroImageUrl, readingMinutes: meta.readingMinutes };
}
