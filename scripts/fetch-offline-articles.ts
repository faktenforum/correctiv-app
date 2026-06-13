/**
 * Baut den Offline-Artikel-Cache: holt die neuesten Artikel aus mehreren
 * Kategorie-Feeds, extrahiert sie mit DEMSELBEN extractArticle() wie die App und
 * schreibt sie als src/lib/articles/offlineArticles.generated.ts. So funktioniert
 * der Demo-Pfad (Home → Artikel lesen) auch ohne Netz.
 *
 * Aufruf:  npm run offline-articles
 */
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { extractArticle } from '../src/lib/articles/extract';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = resolve(ROOT, 'src', 'lib', 'articles', 'offlineArticles.generated.ts');

const UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/124 Mobile Safari/537.36';

// Feeds + Default-Badge; pro Feed die obersten N Artikel bündeln.
const FEEDS: { url: string; badge: string; take: number }[] = [
  { url: 'https://correctiv.org/feed/', badge: 'Recherche', take: 5 },
  { url: 'https://correctiv.org/category/faktencheck/feed/', badge: 'Faktencheck', take: 5 },
  { url: 'https://correctiv.org/category/klimawandel/feed/', badge: 'Klima', take: 3 },
  { url: 'https://correctiv.org/category/schweiz/feed/', badge: 'Schweiz', take: 2 },
];

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status} für ${url}`);
  return res.text();
}

function articleLinks(rssXml: string, take: number): string[] {
  const links = [...rssXml.matchAll(/<link>(https:\/\/correctiv\.org\/[^<]+?\/\d{4}\/\d{2}\/\d{2}\/[^<]+?)<\/link>/g)].map(
    (m) => m[1],
  );
  return [...new Set(links)].slice(0, take);
}

async function main() {
  const entries: { url: string; badge: string }[] = [];
  for (const feed of FEEDS) {
    try {
      const xml = await fetchText(feed.url);
      for (const url of articleLinks(xml, feed.take)) entries.push({ url, badge: feed.badge });
    } catch (err) {
      console.warn(`  Feed übersprungen: ${feed.url} (${(err as Error).message})`);
    }
  }
  // Dedupe über URL.
  const unique = [...new Map(entries.map((e) => [e.url, e])).values()];
  console.log(`${unique.length} Artikel-URLs gesammelt, extrahiere …`);

  const bundle: Record<string, unknown> = {};
  for (const { url, badge } of unique) {
    try {
      const html = await fetchText(url);
      const a = extractArticle(html);
      if (!a.bodyHtml || a.bodyHtml.length < 200) {
        console.warn(`  Leerer Body, übersprungen: ${url}`);
        continue;
      }
      bundle[url] = { ...a, badge };
      console.log(`  ✓ ${a.title.slice(0, 60)} (${a.readingMinutes} Min.)`);
    } catch (err) {
      console.warn(`  Fehler bei ${url}: ${(err as Error).message}`);
    }
  }

  const header =
    '// AUTO-GENERATED von scripts/fetch-offline-articles.ts — nicht von Hand editieren.\n' +
    '// Gebündelte, vor-extrahierte Artikel (Offline-Cache für den Demo-Pfad).\n' +
    '// Regenerieren: npm run offline-articles\n';
  writeFileSync(
    OUT,
    `${header}/* eslint-disable */\nimport type { ReaderArticle } from './readerHtml';\n\n` +
      `export const OFFLINE_ARTICLES: Record<string, ReaderArticle> = ${JSON.stringify(bundle, null, 2)};\n`,
  );
  console.log(`${Object.keys(bundle).length} Artikel gebündelt → offlineArticles.generated.ts`);
}

main();
