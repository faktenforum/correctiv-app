import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { extractArticleFromDom } from '../src/articles/extract/dom';
import { extractArticleFromString } from '../src/articles/extract/string';
import { estimateReadingMinutes, extractPageMeta } from '../src/articles/page-meta';
import { ratingFromPage, ratingFromText, ratingLabel, ratingTone } from '../src/articles/rating';
import { buildReaderHtml } from '../src/articles/reader-html';
import type { Article, ArticleExtractor } from '../src/articles/types';
import { decodeEntities, stripTags } from '../src/lib/html';

const ARTICLE = readFileSync(
  fileURLToPath(new URL('./__fixtures__/articles/faktencheck-1.html', import.meta.url)),
  'utf8',
);

const BACKENDS: [string, ArticleExtractor][] = [
  ['string', extractArticleFromString],
  ['dom', extractArticleFromDom],
];

/**
 * Pinned against a real correctiv.org page. Both extractors walk the WordPress
 * theme's `detail__*` BEM classes, so a theme change breaks them silently in
 * production — these assertions are the early warning.
 */
describe.each(BACKENDS)('extract (%s backend)', (_name, extract) => {
  const article = extract(ARTICLE);

  it('pulls the editorial fields off the page', () => {
    expect(article.title).toBe(
      'Weshalb eine Deutschlandfahne die Bundestagspolizei auf den Plan rief',
    );
    expect(article.kicker).toBe('Politik');
    expect(article.authors).toEqual(['Steffen Kutzner']);
    expect(article.publishedAt).toBe('2026-06-12T15:20:06.000Z');
    expect(article.publishedText).toBe('12. Juni 2026');
    expect(article.excerpt?.length).toBeGreaterThan(20);
  });

  it('extracts a non-trivial body and keeps content markup', () => {
    expect(article.bodyHtml.length).toBeGreaterThan(1000);
    expect(article.bodyHtml).toContain('<p');
  });

  it('strips scripts, iframes and forms out of the body', () => {
    expect(article.bodyHtml).not.toMatch(/<script|<noscript|<iframe|<form|<style|<button/i);
  });

  it('resolves the social image', () => {
    expect(article.heroImageUrl).toMatch(/^https:\/\/correctiv\.org\/wp-content\/uploads\//);
  });

  it('leaves the verdict unset on a page without a rating plaque', () => {
    expect(article.rating).toBeUndefined();
  });

  it('gives a plausible reading time', () => {
    expect(article.readingMinutes).toBeGreaterThanOrEqual(1);
    expect(article.readingMinutes).toBeLessThan(60);
  });

  it('returns an empty article rather than throwing on a page it cannot understand', () => {
    const empty = extract('<html><body><p>nothing familiar</p></body></html>');
    expect(empty.title).toBe('');
    expect(empty.bodyHtml).toBe('');
    expect(empty.authors).toEqual([]);
    expect(empty.rating).toBeUndefined();
  });
});

/**
 * THE test that makes two extraction backends a choice rather than a fork.
 *
 * The core ships both because a host may not be able to carry an HTML parser (see
 * `articles/types.ts`). Every field they are supposed to agree on is asserted equal
 * here. The body markup is deliberately excluded, because tighter markup is the
 * entire reason the DOM backend exists.
 */
describe('the two backends agree', () => {
  const fromString = extractArticleFromString(ARTICLE);
  const fromDom = extractArticleFromDom(ARTICLE);

  it('on every field except the body markup', () => {
    const { bodyHtml: _s, ...s } = fromString;
    const { bodyHtml: _d, ...d } = fromDom;
    expect(s).toEqual(d);
  });

  it('on the plain text of the body, to within the wrappers one of them unwraps', () => {
    const words = (html: string) => stripTags(html).split(/\s+/).length;
    expect(words(fromDom.bodyHtml)).toBeGreaterThan(words(fromString.bodyHtml) * 0.9);
  });

  it('and only the DOM backend removes classes and inline styles', () => {
    expect(fromDom.bodyHtml).not.toMatch(/ class="| style="/i);
    // Not a defect in the string backend — a documented limit of regex cleanup.
    expect(fromString.bodyHtml).toMatch(/ class="/i);
  });
});

describe('fact-check vocabulary', () => {
  it('reads the verdict off the rating image path', () => {
    expect(ratingFromPage('<img src="/assets/rating/mostly-false.svg">')).toBe(
      'groesstenteils-falsch',
    );
    expect(ratingFromPage('<img src="/assets/rating/missing_context.svg">')).toBe(
      'fehlender-kontext',
    );
    expect(ratingFromPage('<p>no plaque here</p>')).toBeUndefined();
  });

  /**
   * Order matters: "größtenteils falsch" contains "falsch". Matching the bare
   * word first would collapse every qualified verdict into its absolute.
   */
  it('reads the verdict off German prose, longest match first', () => {
    expect(ratingFromText('Größtenteils falsch Über diese Bewertung')).toBe(
      'groesstenteils-falsch',
    );
    expect(ratingFromText('Falsch Über diese Bewertung')).toBe('falsch');
    expect(ratingFromText('Groesstenteils richtig')).toBe('groesstenteils-richtig');
    expect(ratingFromText('Fehlender Kontext')).toBe('fehlender-kontext');
  });

  it('maps every verdict to a label and one of three tones', () => {
    expect(ratingLabel('fehlender-kontext')).toBe('Fehlender Kontext');
    expect(ratingTone('falsch')).toBe('refuted');
    expect(ratingTone('unbelegt')).toBe('qualified');
    expect(ratingTone('richtig')).toBe('confirmed');
  });
});

describe('page meta', () => {
  /**
   * correctiv.org publishes its own reading time as a twitter:label/data pair
   * whose index moves between article types, so it has to be found by value.
   */
  it("prefers the page's own reading time over an estimate", () => {
    const html = `<meta name="twitter:label2" content="Lesezeit"><meta name="twitter:data2" content="7 Minuten">`;
    expect(extractPageMeta(html).readingMinutes).toBe(7);
  });

  it('ignores a label pair that is not the reading time', () => {
    const html = `<meta name="twitter:label1" content="Verfasst von"><meta name="twitter:data1" content="Steffen Kutzner">`;
    expect(extractPageMeta(html).readingMinutes).toBeUndefined();
  });

  it('reads meta tags in either attribute order — WordPress emits both', () => {
    expect(
      extractPageMeta('<meta property="og:image" content="https://x/a.jpg">').heroImageUrl,
    ).toBe('https://x/a.jpg');
    expect(
      extractPageMeta('<meta content="https://x/b.jpg" property="og:image">').heroImageUrl,
    ).toBe('https://x/b.jpg');
  });

  it('never estimates zero minutes', () => {
    expect(estimateReadingMinutes('')).toBe(1);
  });
});

describe('reader html', () => {
  const article: Article = {
    url: 'https://correctiv.org/faktencheck/2026/06/12/x/',
    title: 'Ein <Titel> & ein "Zitat"',
    kicker: 'Politik',
    excerpt: 'Der Lead.',
    authors: ['A. Autorin', 'B. Autor'],
    publishedAt: '2026-06-12T15:20:06.000Z',
    publishedText: '12. Juni 2026',
    readingMinutes: 5,
    bodyHtml: '<p>Text</p>',
    heroImageUrl: 'https://correctiv.org/hero.jpg',
  };

  it('escapes editorial text but passes the sanitised body through', () => {
    const html = buildReaderHtml(article);
    expect(html).toContain('Ein &lt;Titel&gt; &amp; ein &quot;Zitat&quot;');
    expect(html).toContain('<p>Text</p>');
  });

  /**
   * The date goes through the app's own formatter rather than being echoed from the
   * page, so the reader reads "12. Juni" like every list does — correctiv.org itself
   * prints a leading zero.
   */
  it('builds the meta line from authors, the app-formatted date and the reading time', () => {
    expect(buildReaderHtml({ ...article, publishedText: '12.06.2026' })).toContain(
      'von A. Autorin, B. Autor · 12. Juni 2026 · 5 Min. Lesezeit',
    );
  });

  it('falls back to the printed date only when no date was parsable, and drops it if neither is', () => {
    expect(
      buildReaderHtml({ ...article, publishedAt: '', publishedText: 'im Juni 2026' }),
    ).toContain('von A. Autorin, B. Autor · im Juni 2026 · 5 Min. Lesezeit');
    expect(buildReaderHtml({ ...article, publishedAt: '', publishedText: undefined })).toContain(
      'von A. Autorin, B. Autor · 5 Min. Lesezeit',
    );
  });

  it('shows the section as a badge, and FAKTENCHECK when there is a verdict', () => {
    expect(buildReaderHtml(article)).toContain('<p class="badge">POLITIK</p>');
    const checked = buildReaderHtml({ ...article, rating: 'falsch' });
    expect(checked).toContain('<p class="badge">FAKTENCHECK</p>');
    expect(checked).toContain('rating rating--refuted');
    expect(checked).toContain('Falsch');
  });

  /** The support moment is an invitation for guests and a thank-you for members. */
  it('asks guests to join and thanks members', () => {
    expect(buildReaderHtml(article)).toContain('correctiv://join');
    expect(buildReaderHtml(article, { isMember: true })).not.toContain('correctiv://join');
    expect(buildReaderHtml(article, { isMember: true })).toContain('danke, dass Sie dabei sind');
  });

  it('takes CSS as inline text or as a stylesheet href, so either host can style it', () => {
    expect(buildReaderHtml(article, { css: ['body{color:red}'] })).toContain(
      '<style>body{color:red}</style>',
    );
    expect(buildReaderHtml(article, { stylesheets: ['assets/reader/reader.css'] })).toContain(
      '<link rel="stylesheet" href="assets/reader/reader.css">',
    );
  });

  it('scales the root font size with the app text-size setting', () => {
    expect(buildReaderHtml(article, { textScale: 1 })).toContain('font-size:16px');
    expect(buildReaderHtml(article, { textScale: 1.25 })).toContain('font-size:20px');
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

describe('stripTags', () => {
  it('removes markup and collapses whitespace', () => {
    expect(stripTags('<p>Hallo   <strong>Welt</strong></p>')).toBe('Hallo Welt');
  });
});
