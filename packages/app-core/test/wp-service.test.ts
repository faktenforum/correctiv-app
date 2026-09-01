import { describe, expect, it } from 'vitest';

import { FEED_PRIORITY } from '../src/data/feeds.config';
import { slugFromUrl, toArticle, toFeedItem, wpFeedKey, wpImage } from '../src/services/wp.service';

/**
 * The mapping from a WordPress post to the app's models.
 *
 * The payload below is the shape `wp/v2/posts` actually returned on 2026-09-01,
 * trimmed to the fields the app reads. Three of its oddities are the reason this
 * file exists rather than a type doing the work:
 *
 * - An unset ACF field serialises as `false`, not `null` and not an absent key.
 * - The verdict is an object (`{ value, label }`), not a string.
 * - The reading time is a German-keyed string ("4 Minuten") inside
 *   `yoast_head_json.twitter_misc`.
 *
 * Each of those returns `undefined` from a naive read, and `undefined` in this
 * layer means a card without a byline or an article without its verdict plaque.
 */
const post = {
  id: 287673,
  date: '2026-08-31T18:51:04',
  link: 'https://correctiv.org/faktencheck/2026/08/31/historisches-niedrigwasser-der-elbe/',
  title: { rendered: 'Historische Bilder sind kein Gegenbeweis &#8211; zum Klimawandel' },
  excerpt: { rendered: '<p>Ein generierter Auszug.</p>\n' },
  content: { rendered: '<p>Erster Absatz.</p><script>alert(1)</script><p>Zweiter Absatz.</p>' },
  acf: {
    'post::interpretation': { value: 'faktenforum_false', label: 'faktenforum_false' },
    'post::topline': 'Faktencheck',
    'post::excerpt': 'Der redaktionelle Anreißer.',
  },
  cvui_featured_image: {
    thumbnail: { url: 'https://correctiv.org/i/thumb.jpg', width: 220, height: 220 },
    list: { url: 'https://correctiv.org/i/list.jpg', width: 706, height: 386 },
    'widget-post': { url: 'https://correctiv.org/i/wide.jpg', width: 2560, height: 1442 },
    full: { url: 'https://correctiv.org/i/full.jpg', width: 2560, height: 1442 },
  },
  cvui_categories: [
    { id: 5, name: 'Faktencheck', slug: 'faktencheck' },
    { id: 439, name: 'Klima', slug: 'klima' },
  ],
  yoast_head_json: {
    author: 'Sara Pichireddu',
    twitter_misc: { 'Verfasst von': 'Sara Pichireddu', 'Geschätzte Lesezeit': '4 Minuten' },
  },
};

/** The same post with every optional field in its unset form. */
const bare = {
  id: 1,
  date: '2026-08-01T07:00:00',
  link: 'https://correctiv.org/in-eigener-sache/2026/08/01/etwas/',
  title: { rendered: 'Ohne alles' },
  excerpt: { rendered: '' },
  content: { rendered: '<p>Nur ein Rumpf.</p>' },
  acf: { 'post::interpretation': false, 'post::topline': false, 'post::excerpt': false } as const,
  cvui_featured_image: false as const,
  cvui_categories: [],
  yoast_head_json: null,
};

describe('a post as a feed card', () => {
  const card = toFeedItem(post, 'faktencheck');

  it('decodes the title and prefers the editorial teaser', () => {
    expect(card.title).toBe('Historische Bilder sind kein Gegenbeweis – zum Klimawandel');
    expect(card.teaser).toBe('Der redaktionelle Anreißer.');
  });

  it('carries the byline the RSS path could only get from <dc:creator>', () => {
    expect(card.author).toBe('Sara Pichireddu');
  });

  it('takes the list-sized image, not the 2560 px one', () => {
    expect(card.imageUrl).toBe('https://correctiv.org/i/list.jpg');
  });

  it('names every category the post is filed under', () => {
    expect(card.categories).toEqual(['Faktencheck', 'Klima']);
  });

  /**
   * Not cosmetic: without it `ArticleHero` fetches the whole article page for this
   * one number, and in a browser that fetch is blocked by CORS.
   */
  it('carries the reading time so the hero needs no second request', () => {
    expect(card.readingMinutes).toBe(4);
    expect(toFeedItem(bare, 'recherchen').readingMinutes).toBeUndefined();
  });

  it('survives a post with nothing set', () => {
    const empty = toFeedItem(bare, 'recherchen');
    expect(empty.title).toBe('Ohne alles');
    expect(empty.teaser).toBe('');
    expect(empty.author).toBeUndefined();
    expect(empty.imageUrl).toBeNull();
  });
});

describe('picking an image size', () => {
  it('falls back to a bigger variant, and to thumbnail only as a last resort', () => {
    const onlyWide = { cvui_featured_image: { 'widget-post': { url: 'https://x/w.jpg' } } };
    expect(wpImage(onlyWide, 'list')).toBe('https://x/w.jpg');

    const onlyThumb = { cvui_featured_image: { thumbnail: { url: 'https://x/t.jpg' } } };
    expect(wpImage(onlyThumb, 'list')).toBe('https://x/t.jpg');

    expect(wpImage(post, 'thumbnail')).toBe('https://correctiv.org/i/thumb.jpg');
    expect(wpImage(bare)).toBeNull();
  });
});

describe('a post as an article', () => {
  const article = toArticle(post);

  /**
   * The field that decided the whole switch to the API. Before this, the verdict
   * could only be read out of the article page's markup.
   */
  it('reads the fact-check verdict out of the ACF field', () => {
    expect(article.rating).toBe('falsch');
    expect(toArticle(bare).rating).toBeUndefined();
  });

  it('takes the kicker from post::topline', () => {
    expect(article.kicker).toBe('Faktencheck');
    expect(toArticle(bare).kicker).toBeUndefined();
  });

  it('uses the reading time the site prints, and estimates when it is absent', () => {
    expect(article.readingMinutes).toBe(4);
    expect(toArticle(bare).readingMinutes).toBeGreaterThan(0);
  });

  it('strips a script out of the body', () => {
    expect(article.bodyHtml).not.toContain('<script');
    expect(article.bodyHtml).toContain('Zweiter Absatz.');
  });

  it('keeps the author as an array, as the reader expects', () => {
    expect(article.authors).toEqual(['Sara Pichireddu']);
    expect(toArticle(bare).authors).toEqual([]);
  });
});

describe('which feed a post belongs to', () => {
  /**
   * The sampled fact check is filed under both `faktencheck` and `klima`, so the
   * answer needs an order rather than a match. This replaces reading the section
   * out of the article's URL path.
   */
  it('follows the configured priority when a post has several categories', () => {
    expect(wpFeedKey(post, FEED_PRIORITY)).toBe('faktencheck');
  });

  it('falls back to recherchen for a post in no configured category', () => {
    expect(wpFeedKey(bare, FEED_PRIORITY)).toBe('recherchen');
  });
});

describe('finding a post by its public URL', () => {
  it('takes the last path segment of a nested permalink', () => {
    expect(slugFromUrl('https://correctiv.org/faktencheck/2026/08/31/ein-slug/')).toBe('ein-slug');
    expect(slugFromUrl('https://correctiv.org/faktencheck/2026/08/31/ein-slug')).toBe('ein-slug');
    expect(slugFromUrl('https://correctiv.org/a/b/slug/?utm=1#top')).toBe('slug');
  });

  /** A file is not a post, and asking the API for one wastes a request. */
  it('refuses anything that is not a slug', () => {
    expect(slugFromUrl('https://correctiv.org/feed.xml')).toBeNull();
    expect(slugFromUrl('https://correctiv.org/')).toBeNull();
  });
});
