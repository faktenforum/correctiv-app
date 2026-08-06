import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parseWpFeed, parseYoutubeFeed } from '../src/lib/rss-parse';

const fixture = (name: string) =>
  readFileSync(fileURLToPath(new URL(`./__fixtures__/${name}`, import.meta.url)), 'utf8');

const WP_RSS = fixture('feeds/faktencheck.rss.xml');
const YT_ATOM = fixture('feeds/funfacts.atom.xml');

/**
 * Pinned against real captures of correctiv.org/faktencheck/feed/ and the
 * FunFacts YouTube Atom feed. The parsers are deliberately regex-based (an XML
 * library collides with @nativescript/vite's CommonJS resolver), so these tests
 * are the only thing standing between a WordPress theme change and a silently
 * empty feed in the app.
 */
describe('parseWpFeed', () => {
  const items = parseWpFeed(WP_RSS, 'faktencheck');

  it('parses every item in the feed', () => {
    expect(items).toHaveLength(100);
  });

  it('maps the first item completely', () => {
    expect(items[0]).toMatchObject({
      feed: 'faktencheck',
      title: 'Weshalb eine Deutschlandfahne die Bundestagspolizei auf den Plan rief',
      url: 'https://correctiv.org/faktencheck/hintergrund/2026/06/12/weshalb-eine-deutschlandfahne-die-bundestagspolizei-auf-den-plan-rief/',
      author: 'Steffen Kutzner',
      publishedAt: '2026-06-12T15:20:06.000Z',
      imageUrl: null,
    });
    expect(items[0].categories).toContain('Faktencheck');
  });

  it('never yields an item without a link or id', () => {
    for (const item of items) {
      expect(item.url).toMatch(/^https?:\/\//);
      expect(item.id).toBeTruthy();
    }
  });

  it('strips markup and decodes entities out of titles and teasers', () => {
    for (const item of items) {
      expect(item.title).not.toMatch(/[<>]|&[a-z]+;|&#\d+;/);
      expect(item.teaser).not.toMatch(/<[a-z]/i);
    }
  });

  it('produces parseable ISO timestamps for every item', () => {
    for (const item of items) {
      expect(Number.isNaN(Date.parse(item.publishedAt))).toBe(false);
    }
  });

  it('tags every item with the feed it was requested for', () => {
    expect(new Set(items.map((i) => i.feed))).toEqual(new Set(['faktencheck']));
  });
});

describe('parseYoutubeFeed', () => {
  const videos = parseYoutubeFeed(YT_ATOM);

  it('parses the channel entries', () => {
    expect(videos).toHaveLength(15);
  });

  it('maps the first entry to a watchable url and a thumbnail', () => {
    expect(videos[0]).toMatchObject({
      title: 'Kooperation, Petition, Revolution',
      url: 'https://www.youtube.com/watch?v=tKwKQ1W9TXs',
      thumbnailUrl: 'https://i1.ytimg.com/vi/tKwKQ1W9TXs/hqdefault.jpg',
    });
  });

  it('gives every entry an id, a url and a thumbnail', () => {
    for (const video of videos) {
      expect(video.id).toBeTruthy();
      expect(video.url).toContain('watch?v=');
      expect(video.thumbnailUrl).toMatch(/^https:\/\//);
      expect(Number.isNaN(Date.parse(video.publishedAt))).toBe(false);
    }
  });

  it('returns no duplicates', () => {
    expect(new Set(videos.map((v) => v.id)).size).toBe(videos.length);
  });

  /**
   * The Atom feed does not say which of the app's channels it is, so the caller
   * passes it in. Without this the media store cannot tell a FunFacts video from
   * a main-channel one after the fact.
   */
  it('tags entries with the channel it was asked for, and the platform', () => {
    const tagged = parseYoutubeFeed(YT_ATOM, 'funfacts');
    expect(tagged.every((v) => v.channel === 'funfacts')).toBe(true);
    expect(tagged.every((v) => v.source === 'youtube')).toBe(true);
  });

  it('leaves the channel unset when none is given', () => {
    expect(videos.every((v) => v.channel === undefined)).toBe(true);
  });
});

describe('author handling', () => {
  /**
   * Measured, not assumed: across 200 live items (correctiv.org/feed/ and
   * /category/faktencheck/feed/) every item carries exactly ONE <dc:creator>,
   * and none is a composite like "A und B". The Expo app modelled this as
   * `authors: string[]`; this test records why the singular string is right, so
   * the array does not come back on a hunch.
   */
  it('yields one author per item, never a list', () => {
    const withAuthor = parseWpFeed(WP_RSS, 'faktencheck').filter((i) => i.author);
    expect(withAuthor.length).toBeGreaterThan(50);
    for (const item of withAuthor) {
      expect(typeof item.author).toBe('string');
      expect(item.author).not.toMatch(/\bund\b|,|&/);
    }
  });

  it('leaves author undefined rather than empty when the tag is missing', () => {
    const [item] = parseWpFeed(
      '<rss><channel><item><link>https://correctiv.org/a/</link></item></channel></rss>',
      'recherchen',
    );
    expect(item.author).toBeUndefined();
  });
});

describe('malformed input', () => {
  it('returns an empty list instead of throwing', () => {
    expect(parseWpFeed('', 'faktencheck')).toEqual([]);
    expect(parseWpFeed('<rss><channel></channel></rss>', 'faktencheck')).toEqual([]);
    expect(parseYoutubeFeed('not xml at all')).toEqual([]);
  });
});
