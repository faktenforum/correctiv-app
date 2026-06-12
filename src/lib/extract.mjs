/**
 * String-basierte Extraktion aus correctiv.org-Artikelseiten (WordPress-Theme,
 * BEM-Klassen `detail__*`). Bewusst DOM-frei: läuft identisch im Node-Skript
 * (scripts/fetch-offline-articles.mjs) und in der App (article.service.ts).
 */

/** <meta property="og:image" content="..."> — beide Attribut-Reihenfolgen. */
export function extractMeta(html, property) {
  const a = html.match(
    new RegExp(`<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i'),
  );
  if (a) return decodeEntities(a[1]);
  const b = html.match(
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${property}["']`, 'i'),
  );
  return b ? decodeEntities(b[1]) : null;
}

/** Liefert den inneren HTML-Inhalt des ersten Elements, dessen öffnender Tag auf `startRe` passt — mit Tag-Balancierung. */
export function balancedBlock(html, startRe) {
  const m = html.match(startRe);
  if (!m) return null;
  const tag = m[0].match(/^<(\w+)/)?.[1];
  if (!tag) return null;
  const open = new RegExp(`<${tag}[\\s>]`, 'gi');
  const close = new RegExp(`</${tag}>`, 'gi');
  let depth = 1;
  let pos = m.index + m[0].length;
  while (depth > 0) {
    open.lastIndex = pos;
    close.lastIndex = pos;
    const o = open.exec(html);
    const c = close.exec(html);
    if (!c) return null; // kaputtes Markup
    if (o && o.index < c.index) {
      depth += 1;
      pos = o.index + o[0].length;
    } else {
      depth -= 1;
      pos = c.index + c[0].length;
    }
  }
  return html.slice(m.index + m[0].length, pos - `</${tag}>`.length);
}

export function stripTags(html) {
  return decodeEntities(html.replace(/<[^>]*>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

export function decodeEntities(s) {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#?(?:apos|039);/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#8211;|&ndash;/g, '–')
    .replace(/&#8212;|&mdash;/g, '—')
    .replace(/&#8220;|&ldquo;/g, '“')
    .replace(/&#8221;|&rdquo;/g, '”')
    .replace(/&#8222;|&bdquo;/g, '„')
    .replace(/&#8216;|&lsquo;/g, '‘')
    .replace(/&#8217;|&rsquo;/g, '’')
    .replace(/&#8230;|&hellip;/g, '…');
}

/** Entfernt Skripte, Tracker und Share-Blöcke aus dem Artikel-Body, behält Inhalts-Markup. */
export function sanitizeBody(body) {
  let out = body;
  for (const tag of ['script', 'noscript', 'iframe', 'form', 'style', 'svg', 'button']) {
    out = out.replace(new RegExp(`<${tag}[\\s\\S]*?</${tag}>`, 'gi'), '');
  }
  // Tracking-Pixel (1×1) und leere lazyload-imgs ohne src
  out = out.replace(/<img[^>]+(facebook\.com\/tr|height="1")[^>]*>/gi, '');
  // <picture>/<source>-Varianten auf das <img> reduzieren (WebView lädt srcset selbst)
  out = out.replace(/<source[^>]*>/gi, '');
  return out.trim();
}

/**
 * Zerlegt eine correctiv.org-Artikelseite.
 * @returns {{ topline: string|null, headline: string|null, excerpt: string|null,
 *   authors: string|null, dateIso: string|null, dateText: string|null,
 *   rating: string|null, ratingText: string|null, bodyHtml: string|null, ogImage: string|null }}
 */
export function extractArticle(html) {
  const headline = (() => {
    const m = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
    return m ? stripTags(m[1]) : extractMeta(html, 'og:title');
  })();

  const toplineBlock = balancedBlock(html, /<\w+[^>]*class="[^"]*\btopline\b[^"]*"[^>]*>/);
  const topline = toplineBlock ? stripTags(toplineBlock) : null;

  const excerptBlock = balancedBlock(html, /<\w+[^>]*class="[^"]*detail__excerpt[^"]*"[^>]*>/);
  const excerpt = excerptBlock ? stripTags(excerptBlock) : extractMeta(html, 'og:description');

  const authorsBlock = balancedBlock(html, /<\w+[^>]*class="[^"]*detail__authors\b[^"]*"[^>]*>/);
  let authors = null;
  if (authorsBlock) {
    // "von Max Bernhard" — das <time>-Element gehört nicht zu den Autor:innen
    authors = stripTags(authorsBlock.replace(/<time[\s\S]*?<\/time>/gi, '')).replace(/^von\s+/i, '');
  }

  const dateM = html.match(/<time[^>]*class="[^"]*detail__date[^"]*"[^>]*datetime="([^"]+)"[^>]*>([\s\S]*?)<\/time>/);
  const dateIso = dateM ? dateM[1] : null;
  const dateText = dateM ? stripTags(dateM[2]) : null;

  const ratingM = html.match(/\/rating\/([a-z0-9_-]+)\.svg/i);
  const rating = ratingM ? ratingM[1] : null;
  const ratingTextBlock = balancedBlock(html, /<\w+[^>]*class="[^"]*detail__rating-text[^"]*"[^>]*>/);
  const ratingText = ratingTextBlock ? stripTags(ratingTextBlock) : null;

  const bodyBlock = balancedBlock(html, /<div[^>]*class="[^"]*detail__content[^"]*"[^>]*>/);
  const bodyHtml = bodyBlock ? sanitizeBody(bodyBlock) : null;

  return {
    topline,
    headline,
    excerpt,
    authors,
    dateIso,
    dateText,
    rating,
    ratingText,
    bodyHtml,
    ogImage: extractMeta(html, 'og:image'),
  };
}

/** Lesezeit in Minuten (~200 Wörter/min) aus Artikel-HTML. */
export function readingMinutes(bodyHtml) {
  const words = stripTags(bodyHtml || '').split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}
