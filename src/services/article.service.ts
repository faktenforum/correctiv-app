import { knownFolders, path, File } from '@nativescript/core';
import type { ArticleDetail } from '../types/models';
import { fetchText } from './http';
import { getCached, getStale, setCached } from './cache.service';
import { extractArticle, extractMeta, readingMinutes } from '../lib/extract.mjs';

const CACHE_NS = 'articles';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

function appPath(...segments: string[]): string {
  return path.join(knownFolders.currentApp().path, ...segments);
}

interface OfflineIndexEntry {
  slug: string;
  url: string;
}

let offlineIndex: OfflineIndexEntry[] | null = null;

function getOfflineIndex(): OfflineIndexEntry[] {
  if (offlineIndex) return offlineIndex;
  try {
    const file = appPath('assets', 'data', 'articles', 'index.json');
    offlineIndex = File.exists(file)
      ? (JSON.parse(File.fromPath(file).readTextSync()) as { articles: OfflineIndexEntry[] }).articles
      : [];
  } catch {
    offlineIndex = [];
  }
  return offlineIndex;
}

function loadOfflineArticle(url: string): ArticleDetail | null {
  const entry = getOfflineIndex().find((e) => e.url === url);
  if (!entry) return null;
  try {
    const file = appPath('assets', 'data', 'articles', `${entry.slug}.json`);
    const detail = JSON.parse(File.fromPath(file).readTextSync()) as ArticleDetail;
    return { ...detail, offline: true };
  } catch {
    return null;
  }
}

/**
 * Fallback cascade: file cache (24 h) → network → bundled offline content →
 * expired cache. The demo must never depend on Wi-Fi.
 */
export async function loadArticle(url: string): Promise<ArticleDetail> {
  const cached = getCached<ArticleDetail>(CACHE_NS, url, CACHE_TTL_MS);
  if (cached) return cached;

  try {
    const html = await fetchText(url, 12000);
    const extracted = extractArticle(html);
    if (!extracted.bodyHtml) throw new Error(`No article body at ${url}`);
    const detail: ArticleDetail = {
      url,
      ...extracted,
      headline: extracted.headline ?? url,
      bodyHtml: extracted.bodyHtml,
      readingMinutes: readingMinutes(extracted.bodyHtml),
    };
    setCached(CACHE_NS, url, detail);
    return detail;
  } catch (err) {
    const offline = loadOfflineArticle(url);
    if (offline) return offline;
    const stale = getStale<ArticleDetail>(CACHE_NS, url);
    if (stale) return stale;
    throw err;
  }
}

/** Only the og:image of an article URL (for card thumbnails), with cache. */
export async function loadOgImage(url: string): Promise<string | null> {
  const cacheKey = `og:${url}`;
  const cached = getCached<string | null>(CACHE_NS, cacheKey, CACHE_TTL_MS);
  if (cached !== null) return cached;
  const offline = loadOfflineArticle(url);
  if (offline?.ogImage) return offline.ogImage;
  try {
    const html = await fetchText(url, 12000);
    const image = extractMeta(html, 'og:image');
    setCached(CACHE_NS, cacheKey, image ?? '');
    // Since we already loaded the whole page: cache the article right away too
    const extracted = extractArticle(html);
    if (extracted.bodyHtml) {
      setCached(CACHE_NS, url, {
        url,
        ...extracted,
        headline: extracted.headline ?? url,
        bodyHtml: extracted.bodyHtml,
        readingMinutes: readingMinutes(extracted.bodyHtml),
      } satisfies ArticleDetail);
    }
    return image;
  } catch {
    return null;
  }
}

const RATING_LABELS: Record<string, string> = {
  false: 'Falsch',
  'mostly-false': 'Größtenteils falsch',
  mostly_false: 'Größtenteils falsch',
  'missing-context': 'Fehlender Kontext',
  missing_context: 'Fehlender Kontext',
  unproven: 'Unbelegt',
  misleading: 'Irreführend',
  manipulated: 'Manipuliert',
  satire: 'Satire',
  true: 'Richtig',
  'mostly-true': 'Größtenteils richtig',
  mostly_true: 'Größtenteils richtig',
};

export function ratingLabel(rating: string | null | undefined, ratingText?: string | null): string | null {
  if (!rating) return null;
  // ratingText from the page is the most reliable ("Falsch Über diese Bewertung")
  const fromPage = ratingText?.replace(/Über diese Bewertung.*/i, '').trim();
  return fromPage || RATING_LABELS[rating] || rating;
}

let templateCache: string | null = null;

/** Builds the reader HTML from assets/reader/template.html. */
export function buildReaderHtml(
  detail: ArticleDetail,
  options: { isMember: boolean; textScale: number },
): string {
  if (!templateCache) {
    templateCache = File.fromPath(appPath('assets', 'reader', 'template.html')).readTextSync();
  }

  const badgeLabel = detail.rating ? 'FAKTENCHECK' : (detail.topline ?? '').toUpperCase();
  const label = ratingLabel(detail.rating, detail.ratingText);
  const ratingHtml = label
    ? `<div class="rating rating--${detail.rating}"><span class="rating__label">${label}</span></div>`
    : '';
  const heroHtml = detail.ogImage
    ? `<figure class="hero"><img src="${detail.ogImage}" alt=""></figure>`
    : '';
  const metaParts = [
    detail.authors ? `von ${detail.authors}` : null,
    detail.dateText,
    `${detail.readingMinutes} Min. Lesezeit`,
  ].filter(Boolean);
  const footerHtml = options.isMember
    ? `<p class="support-line">Ermöglicht durch Unterstützer:innen wie Sie — danke, dass Sie dabei sind.</p>`
    : `<p class="support-line">Diese Recherche war nur möglich durch Unterstützer:innen wie Sie.</p>
       <a class="support-btn" href="correctiv://join">Unterstützer:in werden</a>`;

  return templateCache
    .replace('{{fontSize}}', String(16 * options.textScale))
    .replace('{{hero}}', heroHtml)
    .replace('{{badge}}', badgeLabel ? `<p class="badge">${badgeLabel}</p>` : '')
    .replace('{{headline}}', detail.headline)
    .replace('{{meta}}', metaParts.join(' · '))
    .replace('{{rating}}', ratingHtml)
    .replace('{{excerpt}}', detail.excerpt ? `<p class="excerpt">${detail.excerpt}</p>` : '')
    .replace('{{body}}', detail.bodyHtml)
    .replace('{{footer}}', footerHtml);
}

export function readerBaseUrl(): string {
  return `file://${appPath('assets', 'reader')}/`;
}
