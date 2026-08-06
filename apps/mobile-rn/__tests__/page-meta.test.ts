/**
 * Article page meta against a real, saved correctiv.org page.
 *
 * The reading time is read off the page rather than estimated, and the label it
 * hangs on moves: on the fact check below it is `twitter:label2`, because
 * `label1` is "Verfasst von". On a Spotlight piece, which names no author, the
 * same value sits on `label1`. Position-based extraction passes one of these two
 * and silently returns the author's name as a number for the other.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { extractPageMeta } from '../src/lib/articles/pageMeta';

/**
 * Only the extraction is under test. It shares its module with `fetchPageMeta`,
 * whose cache reaches AsyncStorage, and an unmocked native module fails the whole
 * suite at import time — nothing here ever calls it.
 */
jest.mock('@react-native-async-storage/async-storage', () => ({}));

const factCheck = readFileSync(
  resolve(__dirname, '..', '__fixtures__', 'articles', 'faktencheck-1.html'),
  'utf8',
);

/** The shape correctiv.org serves for a Spotlight piece, read off the live page. */
const spotlight = `<html><head>
  <meta property="og:image" content="https://correctiv.org/wp-content/uploads/2026/08/spotlight.jpg" />
  <meta name="twitter:label1" content="Geschätzte Lesezeit" />
  <meta name="twitter:data1" content="14 Minuten" />
</head><body></body></html>`;

describe('extractPageMeta', () => {
  it('reads the lead image', () => {
    expect(extractPageMeta(factCheck).imageUrl).toBe(
      'https://correctiv.org/wp-content/uploads/2026/06/Thomas-Trutschel-Photothek.de-Picture-Alliance-Titelbild-Deutschlandflagge-scaled-e1781276795542-1445x790.jpg',
    );
  });

  it('reads the reading time from label2 when an author comes first', () => {
    expect(extractPageMeta(factCheck).readingMinutes).toBe(5);
  });

  it('reads the reading time from label1 when no author is named', () => {
    expect(extractPageMeta(spotlight).readingMinutes).toBe(14);
  });

  it('ignores the attribute order inside a tag', () => {
    const html = '<meta content="https://example.org/a.jpg" property="og:image">';
    expect(extractPageMeta(html).imageUrl).toBe('https://example.org/a.jpg');
  });

  it('says nothing rather than guessing when the page states nothing', () => {
    expect(extractPageMeta('<html><head><title>x</title></head></html>')).toEqual({
      imageUrl: undefined,
      readingMinutes: undefined,
    });
  });

  it('does not mistake another label for the reading time', () => {
    const html = `<meta name="twitter:label1" content="Verfasst von" />
      <meta name="twitter:data1" content="Steffen Kutzner" />`;
    expect(extractPageMeta(html).readingMinutes).toBeUndefined();
  });
});
