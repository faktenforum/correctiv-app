/**
 * Feed-Parser gegen echte, gespeicherte Feed-Antworten. Erkennt Markup-Drift und
 * die „Statische-Seite-Falle" (ein Kategorie-Feed muss viele Items liefern, nicht 1).
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { parseRssFeed } from '../src/lib/feeds/rss';
import { parseYoutubeFeed } from '../src/lib/feeds/youtubeAtom';

const fixture = (name: string) =>
  readFileSync(resolve(__dirname, '..', '__fixtures__', 'feeds', name), 'utf8');

describe('RSS-Parser (Faktencheck)', () => {
  const items = parseRssFeed(fixture('faktencheck.rss.xml'), 'faktencheck');

  it('liest den vollständigen Feed (nicht die 1-Item-Landingpage)', () => {
    expect(items.length).toBeGreaterThan(50);
  });

  it('mappt Pflichtfelder des ersten Items', () => {
    const first = items[0];
    expect(first.title.length).toBeGreaterThan(0);
    expect(first.link).toMatch(/^https:\/\/correctiv\.org\//);
    expect(first.sourceId).toBe('faktencheck');
    expect(first.publishedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/); // ISO
  });

  it('extrahiert Autor:innen und Kategorien', () => {
    const withAuthor = items.find((i) => i.authors.length > 0);
    expect(withAuthor).toBeDefined();
    const withCats = items.find((i) => i.categories.length > 0);
    expect(withCats).toBeDefined();
  });

  it('Teaser ist von HTML/CDATA bereinigt', () => {
    const withTeaser = items.find((i) => i.teaser.length > 0)!;
    expect(withTeaser.teaser).not.toMatch(/<[^>]+>/);
    expect(withTeaser.teaser).not.toMatch(/CDATA/);
  });
});

describe('YouTube-Atom-Parser (FunFacts)', () => {
  const videos = parseYoutubeFeed(fixture('funfacts.atom.xml'), 'funfacts');

  it('liest Einträge mit Video-ID und Thumbnail', () => {
    expect(videos.length).toBeGreaterThan(0);
    const first = videos[0];
    expect(first.id).toMatch(/^[\w-]{6,}$/);
    expect(first.thumbnailUrl).toMatch(/^https:\/\/i\d?\.ytimg\.com\//);
    expect(first.channel).toBe('funfacts');
  });
});
