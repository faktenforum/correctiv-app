import { XMLParser } from 'fast-xml-parser';

/**
 * Gemeinsamer XML-Parser für RSS (WordPress) und Atom (YouTube). processEntities
 * dekodiert HTML-Entities (&amp; etc.); CDATA wird automatisch zu Text. Attribute
 * landen unter `@_name`, Namespaces bleiben im Schlüssel (z. B. `yt:videoId`).
 */
export const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  processEntities: true,
  trimValues: true,
});

export function toArray<T>(value: T | T[] | undefined | null): T[] {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

/** Holt den Textwert aus string | number | { '#text' } (fast-xml-parser-Formen). */
export function textOf(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (typeof value === 'object' && '#text' in (value as Record<string, unknown>)) {
    return String((value as Record<string, unknown>)['#text'] ?? '');
  }
  return '';
}

export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Parst ein RFC-822- oder ISO-Datum robust nach ISO-8601 (leer bei Fehler). */
export function toIso(dateStr: unknown): string {
  const s = textOf(dateStr);
  if (!s) return '';
  const t = Date.parse(s);
  return Number.isNaN(t) ? '' : new Date(t).toISOString();
}
