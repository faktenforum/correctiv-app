import { describe, expect, it } from 'vitest';

import { CONTENT_FEEDS, FEEDS, MEDIA_SOURCE, PEERTUBE_CHANNELS } from '../src/data/feeds.config';
import type { FeedKey } from '../src/types/models';

/**
 * The feed catalogue is now the single one — the Expo app had a parallel
 * `FEED_SOURCES` with a different key set (`haupt` for `recherchen`) and its own
 * badges. These tests pin the properties that made that duplication survivable
 * so far, so the merged version cannot lose them.
 */
describe('FEEDS', () => {
  const keys = Object.keys(FEEDS) as FeedKey[];

  it('covers every FeedKey with a label and an https url', () => {
    expect(keys.length).toBeGreaterThanOrEqual(7);
    for (const key of keys) {
      expect(FEEDS[key].label.length).toBeGreaterThan(0);
      expect(FEEDS[key].url).toMatch(/^https:\/\/correctiv\.org\//);
    }
  });

  /**
   * The pitfall that cost real debugging time: `correctiv.org/<slug>/feed/`
   * returns the static landing page as a single item, and looks like a working
   * feed. Only `/category/<slug>/feed/` streams articles — the site-wide feed
   * being the one exception. A comment said so; now a test does.
   */
  it('uses only /category/<slug>/feed/ urls, except the site-wide feed', () => {
    const CATEGORY = /^https:\/\/correctiv\.org\/category\/[a-z0-9-]+\/feed\/$/;
    const SITE_WIDE = 'https://correctiv.org/feed/';
    // Collected rather than asserted per key, so a failure names every offender
    // at once — the same shape as the core's boundary guard.
    const wouldReturnLandingPage = keys
      .filter((k) => FEEDS[k].url !== SITE_WIDE && !CATEGORY.test(FEEDS[k].url))
      .map((k) => `${k}: ${FEEDS[k].url}`);
    expect(wouldReturnLandingPage).toEqual([]);
  });

  it('gives every category feed a badge, and the site-wide feed none', () => {
    // The badge labels articles by project in lists; the main feed is the
    // default context, so a badge there would be noise on every row.
    expect(FEEDS.recherchen.badge).toBeUndefined();
    const missing = keys.filter((k) => k !== 'recherchen' && !FEEDS[k].badge);
    expect(missing).toEqual([]);
  });

  it('marks europe as empty and keeps it out of CONTENT_FEEDS', () => {
    // Upstream returns no items for it. Offering it as a content source would
    // show an empty list and read as a bug in the app.
    expect(FEEDS.europe.empty).toBe(true);
    expect(CONTENT_FEEDS).not.toContain('europe');
    expect(CONTENT_FEEDS).toContain('recherchen');
    expect(CONTENT_FEEDS).toHaveLength(keys.length - 1);
  });

  it('marks no other feed as empty', () => {
    // A stray `empty` would silently drop a working feed out of every list.
    expect(keys.filter((k) => FEEDS[k].empty)).toEqual(['europe']);
  });
});

describe('media channels', () => {
  it('routes FunFacts to PeerTube and gives it a channel handle', () => {
    // FunFacts moved off YouTube; the Expo app was still pulling the Atom feed.
    expect(MEDIA_SOURCE.funfacts).toBe('peertube');
    expect(PEERTUBE_CHANNELS.funfacts).toBeTruthy();
  });

  it('has a PeerTube handle for every peertube-sourced channel', () => {
    const missing = Object.entries(MEDIA_SOURCE)
      .filter(([, source]) => source === 'peertube')
      .filter(([key]) => !PEERTUBE_CHANNELS[key as keyof typeof PEERTUBE_CHANNELS])
      .map(([key]) => key);
    expect(missing).toEqual([]);
  });
});
