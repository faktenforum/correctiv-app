import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  decodeEntities,
  extractArticle,
  extractMeta,
  readingMinutes,
  stripTags,
} from '../src/lib/extract.mjs';

const ARTICLE = readFileSync(
  fileURLToPath(new URL('./__fixtures__/articles/faktencheck-1.html', import.meta.url)),
  'utf8',
);

/**
 * Pinned against a real correctiv.org Faktencheck page. The extractor walks the
 * WordPress theme's `detail__*` BEM classes, so a theme change breaks it
 * silently in production — these assertions are the early warning.
 */
describe('extractArticle', () => {
  const article = extractArticle(ARTICLE);

  it('pulls the editorial fields off the page', () => {
    expect(article).toMatchObject({
      topline: 'Politik',
      headline: 'Weshalb eine Deutschlandfahne die Bundestagspolizei auf den Plan rief',
      authors: 'Steffen Kutzner',
      dateText: '12. Juni 2026',
      dateIso: '2026-06-12T17:20:06+02:00',
    });
  });

  it('extracts a non-trivial body and keeps content markup', () => {
    expect(article.bodyHtml).not.toBeNull();
    expect(article.bodyHtml!.length).toBeGreaterThan(1000);
    expect(article.bodyHtml!).toContain('<p');
  });

  it('strips scripts, iframes and forms out of the body', () => {
    for (const tag of ['<script', '<noscript', '<iframe', '<form', '<style', '<button']) {
      expect(article.bodyHtml!).not.toContain(tag);
    }
  });

  it('resolves the social image', () => {
    expect(article.ogImage).toBe(extractMeta(ARTICLE, 'og:image'));
    expect(article.ogImage).toMatch(/^https:\/\/correctiv\.org\/wp-content\/uploads\//);
  });

  it('leaves rating fields null on a page without a rating plaque', () => {
    expect(article.rating).toBeNull();
    expect(article.ratingText).toBeNull();
  });

  it('yields an all-null result on a page it cannot understand, rather than throwing or half-parsing', () => {
    const empty = extractArticle('<html><body><p>nothing familiar</p></body></html>');
    expect(empty).toEqual({
      topline: null,
      headline: null,
      excerpt: null,
      authors: null,
      dateIso: null,
      dateText: null,
      rating: null,
      ratingText: null,
      bodyHtml: null,
      ogImage: null,
    });
  });
});

describe('readingMinutes', () => {
  it('estimates at least one minute for a real article body', () => {
    expect(readingMinutes(extractArticle(ARTICLE).bodyHtml ?? '')).toBeGreaterThanOrEqual(1);
  });

  it('never returns zero', () => {
    expect(readingMinutes('')).toBeGreaterThanOrEqual(1);
  });
});

describe('stripTags', () => {
  it('removes markup and collapses whitespace', () => {
    expect(stripTags('<p>Hallo   <strong>Welt</strong></p>')).toBe('Hallo Welt');
  });
});

describe('decodeEntities', () => {
  it('decodes numeric entities', () => {
    expect(decodeEntities('&#8211;&#8230;&#x2014;')).toBe('–…—');
  });

  it('decodes the named entities the feeds actually use', () => {
    expect(decodeEntities('&amp;&lt;&gt;&quot;&nbsp;&ndash;&bdquo;X&ldquo;')).toBe('&<>" –„X“');
  });

  it('leaves unsupported named entities untouched — WordPress emits UTF-8, so this is by design', () => {
    // Documents a real limitation: the table is curated, not the full HTML5 set.
    // If a source ever starts emitting &uuml; this test is where it surfaces.
    expect(decodeEntities('M&uuml;nchen')).toBe('M&uuml;nchen');
  });
});
