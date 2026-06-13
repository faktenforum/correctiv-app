/**
 * Artikel-Extraktion — RUNTIME-AGNOSTISCH (nur htmlparser2-Stack, keine RN-Imports),
 * damit derselbe Code in der App UND im Build-Skript scripts/fetch-offline-articles.mjs
 * läuft. Extrahiert aus dem correctiv.org-WordPress-Markup (BEM, `.detail__*`) den
 * Volltext, bereinigt ihn per Tag-Allowlist und ermittelt Titelbild, Autor:innen,
 * Datum, Lesezeit und (optional) die Faktencheck-Bewertung.
 */
import { parseDocument } from 'htmlparser2';
import { selectOne, selectAll } from 'css-select';
import { textContent, getAttributeValue } from 'domutils';
import serialize from 'dom-serializer';
import type { AnyNode, Document, Element } from 'domhandler';

import type { Article, FactcheckRating } from '../models';

export type ExtractedArticle = Pick<
  Article,
  'title' | 'authors' | 'publishedAt' | 'readingMinutes' | 'heroImageUrl' | 'bodyHtml' | 'rating'
> & { excerpt: string };

// Tags, die im Reader erhalten bleiben (alles andere wird entpackt oder entfernt).
const KEEP = new Set([
  'p', 'h2', 'h3', 'h4', 'h5', 'ul', 'ol', 'li', 'blockquote', 'figure',
  'figcaption', 'img', 'a', 'strong', 'em', 'b', 'i', 'u', 'br', 'hr',
]);
// Tags, die komplett entfernt werden (inkl. Inhalt).
const DROP = new Set([
  'script', 'style', 'noscript', 'iframe', 'form', 'button', 'input', 'svg',
  'video', 'audio', 'ins', 'aside', 'nav', 'header', 'footer',
]);
// Erlaubte Attribute pro Tag.
const ATTRS: Record<string, string[]> = { a: ['href'], img: ['src', 'alt'] };

function isElement(node: AnyNode): node is Element {
  return node.type === 'tag' || node.type === 'script' || node.type === 'style';
}

// Typed Wrapper: css-select infert bei Document-Eingabe den Element-Typ ungenau.
function one(query: string, doc: Document): Element | null {
  return selectOne(query, doc) as Element | null;
}
function all(query: string, doc: Document): Element[] {
  return selectAll(query, doc) as unknown as Element[];
}

/** Bereinigt die Kindknoten rekursiv: entfernen, entpacken oder mit Allowlist-Attributen behalten. */
function sanitizeChildren(children: AnyNode[]): AnyNode[] {
  const out: AnyNode[] = [];
  for (const node of children) {
    if (node.type === 'text') {
      out.push(node);
      continue;
    }
    if (!isElement(node)) continue; // Kommentare, CDATA etc. verwerfen
    const tag = node.name.toLowerCase();
    if (DROP.has(tag)) continue;

    const cleanedChildren = sanitizeChildren(node.children ?? []);
    if (KEEP.has(tag)) {
      node.children = cleanedChildren;
      node.attribs = Object.fromEntries(
        Object.entries(node.attribs ?? {}).filter(([k]) => (ATTRS[tag] ?? []).includes(k)),
      );
      // Leere Absätze/Überschriften ohne Text und ohne Bild verwerfen.
      const hasText = textContent(node).trim().length > 0;
      const hasMedia = tag === 'img' || tag === 'br' || tag === 'hr' || selectOne('img', node) != null;
      if (!hasText && !hasMedia) continue;
      out.push(node);
    } else {
      // Unbekannte Wrapper (span, div, section …) entpacken: Kinder hochziehen.
      out.push(...cleanedChildren);
    }
  }
  return out;
}

const RATING_MAP: { test: RegExp; value: FactcheckRating }[] = [
  { test: /gr(ö|oe)(ß|ss)tenteils falsch/i, value: 'groesstenteils-falsch' },
  { test: /fehlender kontext/i, value: 'fehlender-kontext' },
  { test: /manipuliert/i, value: 'manipuliert' },
  { test: /unbelegt|unbewiesen/i, value: 'unbelegt' },
  { test: /gr(ö|oe)(ß|ss)tenteils richtig/i, value: 'groesstenteils-richtig' },
  { test: /\bfalsch\b/i, value: 'falsch' },
  { test: /\brichtig\b/i, value: 'richtig' },
];

function detectRating(doc: Document): FactcheckRating | undefined {
  // Bewertungs-Plakette: Element mit Klasse, die "claim"/"rating"/"bewertung" enthält.
  const badge = one('[class*="claim"],[class*="rating"],[class*="bewertung"],[class*="verdict"]', doc);
  if (!badge) return undefined;
  const text = textContent(badge);
  return RATING_MAP.find((r) => r.test.test(text))?.value;
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function extractArticle(html: string): ExtractedArticle {
  const doc = parseDocument(html);

  const h1 = one('h1', doc);
  const title = h1 ? textContent(h1).trim() : '';

  const excerptEl = one('.detail__excerpt', doc);
  const excerpt = excerptEl ? textContent(excerptEl).trim() : '';

  const authors = all('.detail__authors a, .detail__authors-link', doc)
    .map((a) => textContent(a).trim())
    .filter(Boolean);

  const timeEl = one('time.detail__date, time[datetime]', doc);
  const datetime = timeEl ? getAttributeValue(timeEl, 'datetime') : undefined;
  const publishedAt = datetime ? new Date(datetime).toISOString() : '';

  const ogEl = one('meta[property="og:image"]', doc);
  const ogImage = (ogEl ? getAttributeValue(ogEl, 'content') : undefined) || undefined;

  const contentEl = one('.detail__content', doc);
  let bodyHtml = '';
  let bodyText = '';
  if (contentEl) {
    contentEl.children = sanitizeChildren(contentEl.children);
    bodyHtml = serialize(contentEl.children).trim();
    bodyText = textContent(contentEl);
  }

  const readingMinutes = Math.max(1, Math.round(countWords(bodyText) / 200));

  return {
    title,
    excerpt,
    authors,
    publishedAt,
    heroImageUrl: ogImage,
    bodyHtml,
    readingMinutes,
    rating: detectRating(doc),
  };
}
