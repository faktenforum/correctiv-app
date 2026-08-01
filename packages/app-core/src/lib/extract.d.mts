export interface ExtractedArticle {
  topline: string | null;
  headline: string | null;
  excerpt: string | null;
  authors: string | null;
  dateIso: string | null;
  dateText: string | null;
  rating: string | null;
  ratingText: string | null;
  bodyHtml: string | null;
  ogImage: string | null;
}

export function extractMeta(html: string, property: string): string | null;
export function balancedBlock(html: string, startRe: RegExp): string | null;
export function stripTags(html: string): string;
export function decodeEntities(s: string): string;
export function sanitizeBody(body: string): string;
export function extractArticle(html: string): ExtractedArticle;
export function readingMinutes(bodyHtml: string | null | undefined): number;
