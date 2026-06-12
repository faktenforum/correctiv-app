/**
 * Erzeugt das Offline-Bundle: ~15 echte Artikel + Feed-Snapshots + Titelbilder
 * als App-Assets. Vor jeder Demo ausführen — die Demo darf nie vom WLAN abhängen.
 *
 * Nutzt dieselbe Extraktionslogik wie die App (src/lib/extract.mjs).
 * Hinweis: Bilder im Artikel-Body bleiben Remote-URLs; offline gebündelt
 * wird nur das Titelbild (og:image).
 *
 * Aufruf: npm run offline-articles
 */
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractArticle, readingMinutes, decodeEntities } from '../src/lib/extract.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(__dirname, '../src');
const UA = { 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) CorrectivAppPrototype' };

const FEEDS = {
  recherchen: 'https://correctiv.org/feed/',
  faktencheck: 'https://correctiv.org/category/faktencheck/feed/',
  klima: 'https://correctiv.org/category/klimawandel/feed/',
  schweiz: 'https://correctiv.org/category/schweiz/feed/',
  lokal: 'https://correctiv.org/category/lokal/feed/',
  salon5: 'https://correctiv.org/category/salon5/feed/',
};

// Mix laut Plan: 6 Recherchen, 4 Faktenchecks, 2 Klima, je 1 CH/Lokal/Salon5
const PICK = { recherchen: 6, faktencheck: 4, klima: 2, schweiz: 1, lokal: 1, salon5: 1 };

function slugify(url) {
  return (
    url
      .replace(/\/$/, '')
      .split('/')
      .pop()
      ?.toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .slice(0, 80) || 'artikel'
  );
}

/** Minimaler RSS-Parser fürs Skript (die App nutzt fast-xml-parser). */
function parseItems(xml, feed) {
  const items = [];
  const itemRe = /<item>([\s\S]*?)<\/item>/g;
  let m;
  while ((m = itemRe.exec(xml))) {
    const block = m[1];
    const tag = (name) => {
      const t = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`));
      if (!t) return '';
      return decodeEntities(t[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/<[^>]*>/g, ' '))
        .replace(/\s+/g, ' ')
        .trim();
    };
    const url = tag('link');
    if (!url) continue;
    const categories = [...block.matchAll(/<category>([\s\S]*?)<\/category>/g)].map((c) =>
      decodeEntities(c[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')).trim(),
    );
    items.push({
      id: tag('guid') || url,
      feed,
      title: tag('title'),
      url,
      teaser: tag('description'),
      author: tag('dc:creator') || undefined,
      publishedAt: new Date(tag('pubDate') || 0).toISOString(),
      categories,
      imageUrl: null,
    });
  }
  return items;
}

async function fetchString(url) {
  const res = await fetch(url, { headers: UA });
  if (!res.ok) throw new Error(`HTTP ${res.status} für ${url}`);
  return res.text();
}

mkdirSync(resolve(SRC, 'assets/data/articles'), { recursive: true });
mkdirSync(resolve(SRC, 'assets/data/feeds'), { recursive: true });
mkdirSync(resolve(SRC, 'assets/images/articles'), { recursive: true });

const indexEntries = [];
const seenUrls = new Set();

for (const [feed, feedUrl] of Object.entries(FEEDS)) {
  process.stdout.write(`Feed ${feed} … `);
  const xml = await fetchString(feedUrl);
  const items = parseItems(xml, feed);
  console.log(`${items.length} Items`);

  // Feed-Snapshot als Offline-Fallback
  writeFileSync(resolve(SRC, `assets/data/feeds/${feed}.json`), JSON.stringify(items, null, 1));

  let picked = 0;
  for (const item of items) {
    if (picked >= PICK[feed]) break;
    if (seenUrls.has(item.url)) continue;
    seenUrls.add(item.url);
    try {
      const html = await fetchString(item.url);
      const extracted = extractArticle(html);
      if (!extracted.bodyHtml) {
        console.warn(`  ! kein Body: ${item.url}`);
        continue;
      }
      const slug = slugify(item.url);

      // Titelbild herunterladen und lokal referenzieren
      let localImage = null;
      if (extracted.ogImage) {
        try {
          const res = await fetch(extracted.ogImage, { headers: UA });
          if (res.ok) {
            const buf = Buffer.from(await res.arrayBuffer());
            const ext = extracted.ogImage.match(/\.(png|webp)(\?|$)/i)?.[1]?.toLowerCase() ?? 'jpg';
            writeFileSync(resolve(SRC, `assets/images/articles/${slug}.${ext}`), buf);
            localImage = `~/assets/images/articles/${slug}.${ext}`;
          }
        } catch {
          /* Titelbild ist Komfort */
        }
      }

      const detail = {
        url: item.url,
        ...extracted,
        headline: extracted.headline ?? item.title,
        readingMinutes: readingMinutes(extracted.bodyHtml),
        localImage,
      };
      writeFileSync(resolve(SRC, `assets/data/articles/${slug}.json`), JSON.stringify(detail, null, 1));
      indexEntries.push({
        slug,
        url: item.url,
        feed,
        title: detail.headline,
        teaser: item.teaser,
        author: item.author ?? null,
        publishedAt: item.publishedAt,
        rating: extracted.rating,
        localImage,
      });
      picked += 1;
      console.log(`  ✓ ${slug}`);
    } catch (err) {
      console.warn(`  ! ${item.url}: ${err.message}`);
    }
  }
}

writeFileSync(
  resolve(SRC, 'assets/data/articles/index.json'),
  JSON.stringify({ generatedAt: new Date().toISOString(), articles: indexEntries }, null, 1),
);
console.log(`\nOffline-Bundle: ${indexEntries.length} Artikel, ${Object.keys(FEEDS).length} Feed-Snapshots`);
