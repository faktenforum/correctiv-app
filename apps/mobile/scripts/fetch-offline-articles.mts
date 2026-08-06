/**
 * Builds this app's offline bundle: feed snapshots, ~15 extracted articles and
 * their cover images, written into `src/assets/data/` and `src/assets/images/`.
 * Run before a demo — the demo must never depend on Wi-Fi.
 *
 *   npm run offline-articles -w @correctiv/mobile
 *
 * Collecting is shared with the Expo app
 * (`@correctiv/app-core/articles/offline-bundle`); what differs is only the
 * writing, because this host reads JSON files out of its app folder while Expo
 * imports a generated module. The extraction backend is the string one — the same
 * one the NativeScript app itself uses, so the bundle cannot differ from what the
 * app would have extracted live.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { extractArticleFromString } from '@correctiv/app-core/articles/extract/string';
import { articleSlug, collectOfflineBundle } from '@correctiv/app-core/articles/offline-bundle';
import type { FeedKey } from '@correctiv/app-core/types/models';

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '../src');
const UA = 'Mozilla/5.0 (X11; Linux x86_64) CorrectivAppPrototype';

/** Editorial mix: 6 investigations, 4 fact checks, 2 climate, 1 each CH/local/Salon5. */
const PICK: Partial<Record<FeedKey, number>> = {
  recherchen: 6,
  faktencheck: 4,
  klima: 2,
  schweiz: 1,
  lokal: 1,
  salon5: 1,
};

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

/** Downloads a cover image next to the article, so the list has pictures offline. */
async function saveCover(url: string, slug: string): Promise<string | null> {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (!res.ok) return null;
    const ext = /\.(png|webp)(\?|$)/i.exec(url)?.[1]?.toLowerCase() ?? 'jpg';
    writeFileSync(
      resolve(SRC, `assets/images/articles/${slug}.${ext}`),
      Buffer.from(await res.arrayBuffer()),
    );
    return `~/assets/images/articles/${slug}.${ext}`;
  } catch {
    return null; // a cover image is a nicety
  }
}

for (const dir of ['assets/data/articles', 'assets/data/feeds', 'assets/images/articles']) {
  mkdirSync(resolve(SRC, dir), { recursive: true });
}

const bundle = await collectOfflineBundle({
  fetchText,
  extract: extractArticleFromString,
  plan: { pick: PICK },
  onProgress: (message) => console.log(message),
});

for (const { key, items } of bundle.snapshots) {
  writeFileSync(resolve(SRC, `assets/data/feeds/${key}.json`), JSON.stringify(items, null, 1));
}

const index: unknown[] = [];
for (const { article, feed, item } of bundle.articles) {
  const slug = articleSlug(article.url);
  const localImage = article.heroImageUrl ? await saveCover(article.heroImageUrl, slug) : null;
  writeFileSync(
    resolve(SRC, `assets/data/articles/${slug}.json`),
    JSON.stringify({ ...article, localImage }, null, 1),
  );
  index.push({
    slug,
    url: article.url,
    feed,
    title: article.title,
    teaser: item.teaser,
    author: article.authors[0] ?? null,
    publishedAt: article.publishedAt,
    rating: article.rating ?? null,
    localImage,
  });
}

writeFileSync(
  resolve(SRC, 'assets/data/articles/index.json'),
  JSON.stringify({ generatedAt: new Date().toISOString(), articles: index }, null, 1),
);

console.log(
  `\nOffline bundle: ${index.length} articles, ${bundle.snapshots.length} feed snapshots`,
);
