/**
 * String primitives for the markup this app reads: entity decoding, tag
 * stripping, tag balancing and meta-tag lookup.
 *
 * Dependency-free and DOM-free on purpose. Everything here runs in the
 * NativeScript runtime, in React Native, in a browser and in a Node script
 * without a parser package — which is what lets the feed parsers and the
 * string-based article extractor be one implementation rather than four.
 */

/**
 * The entities WordPress and the feeds actually emit.
 *
 * Curated, not the full HTML5 set: correctiv.org serves UTF-8, so named entities
 * beyond these are vanishingly rare and a 2000-entry table is not worth shipping
 * to a phone. `&uuml;` therefore passes through untouched — pinned by a test, so
 * the day a source starts emitting it, that test is where it shows up.
 */
export function decodeEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n: string) => String.fromCodePoint(parseInt(n, 16)))
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

/** Markup out, text in, whitespace collapsed. */
export function stripTags(html: string): string {
  return decodeEntities(html.replace(/<[^>]*>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

/** The inverse, for text going into HTML we build ourselves. */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * The inner HTML of the first element whose opening tag matches `startRe`, with
 * nesting counted so a `<div>` inside the block does not end it early. Returns
 * null on markup it cannot balance.
 */
export function balancedBlock(html: string, startRe: RegExp): string | null {
  const m = startRe.exec(html);
  if (!m) return null;
  const tag = /^<(\w+)/.exec(m[0])?.[1];
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
    if (!c) return null; // broken markup
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

const META_TAG = /<meta[^>]*>/gi;

function attribute(tag: string, name: string): string | undefined {
  return new RegExp(`\\b${name}=["']([^"']*)["']`, 'i').exec(tag)?.[1];
}

/**
 * Every `<meta>` on the page as `name`/`property` → `content`.
 *
 * Built as a map rather than searched per lookup because WordPress emits both
 * attribute orders on the same page, sometimes for the same key — so the order
 * inside a tag must not matter. First occurrence wins, which is what a browser
 * would use.
 */
export function metaTags(html: string): Map<string, string> {
  const tags = new Map<string, string>();
  for (const [tag] of html.matchAll(META_TAG)) {
    const key = attribute(tag, 'property') ?? attribute(tag, 'name');
    const content = attribute(tag, 'content');
    if (key && content && !tags.has(key)) tags.set(key, decodeEntities(content));
  }
  return tags;
}

/** One meta tag by `property` or `name`. */
export function extractMeta(html: string, key: string): string | null {
  return metaTags(html).get(key) ?? null;
}
