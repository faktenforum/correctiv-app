import { cachedFetch } from '@/lib/net/cachedFetch';

/**
 * Extrahiert die og:image-URL aus dem `<head>` einer Artikelseite. Der RSS-Feed
 * liefert keine Bilder; Titelbilder werden hier bei Bedarf nachgeladen (cache-first,
 * 24 h), damit dieselbe Seite nicht mehrfach geholt wird.
 */
const OG_PATTERNS = [
  /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
  /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
];

export function extractOgImage(html: string): string | undefined {
  for (const re of OG_PATTERNS) {
    const m = html.match(re);
    if (m?.[1]) return m[1];
  }
  return undefined;
}

export async function fetchOgImage(articleUrl: string): Promise<string | undefined> {
  try {
    const html = await cachedFetch(`page:${articleUrl}`, articleUrl, {
      policy: 'cache-first',
      ttlMs: 24 * 60 * 60 * 1000,
      timeoutMs: 8000,
    });
    return extractOgImage(html);
  } catch {
    return undefined;
  }
}
