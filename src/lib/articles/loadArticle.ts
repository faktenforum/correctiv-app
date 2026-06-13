import { cachedFetch } from '@/lib/net/cachedFetch';

import { extractArticle } from './extract';
import { OFFLINE_ARTICLES } from './offlineArticles.generated';
import type { ReaderArticle } from './readerHtml';

/**
 * Lädt einen Artikel für den Reader. Reihenfolge (bundle-first), damit die Demo
 * nie vom WLAN abhängt: gebündelter Offline-Artikel → AsyncStorage-Cache → Netz.
 * Einmal geöffnete Live-Artikel bleiben über den cache-first-Fetch offline verfügbar.
 */
export async function loadArticle(url: string, badge?: string): Promise<ReaderArticle> {
  const bundled = OFFLINE_ARTICLES[url];
  if (bundled) return { ...bundled, badge: badge ?? bundled.badge };

  const html = await cachedFetch(`page:${url}`, url, {
    policy: 'cache-first',
    ttlMs: 24 * 60 * 60 * 1000,
    timeoutMs: 12000,
  });
  const extracted = extractArticle(html);
  return { ...extracted, badge };
}
