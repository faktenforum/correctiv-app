import { describe, expect, it } from 'vitest';

import { FEEDS } from '../src/data/feeds.config';
import { interests } from '../src/data/interests';
import { projectGroups, resolveProject, type Project } from '../src/data/projects';
import type { FeedKey } from '../src/types/models';

const allProjects: Project[] = projectGroups.flatMap((g) => g.projects);

/**
 * The Entdecken directory is data, not code — which is exactly why it needs
 * tests: a card with no target, a feed key that no longer exists, or an id that
 * two groups both claim are all invisible to typecheck and produce a dead row
 * in the app instead of an error.
 */
describe('projectGroups', () => {
  it('has the 7 groups from the concept, each non-empty', () => {
    expect(projectGroups).toHaveLength(7);
    const empty = projectGroups.filter((g) => g.projects.length === 0).map((g) => g.id);
    expect(empty).toEqual([]);
  });

  it('gives every project a unique id', () => {
    const seen = new Set<string>();
    const duplicates = allProjects.filter((p) => (seen.has(p.id) ? true : (seen.add(p.id), false)));
    // Ids are route parameters — a duplicate would make /projekt/<id> ambiguous.
    expect(duplicates.map((p) => p.id)).toEqual([]);
  });

  it('gives every project something to open', () => {
    // A card with no feed, no url, no tab and no teaser is a row that does
    // nothing when tapped — the failure mode this catches.
    const dead = allProjects
      .filter((p) => !p.feed && !p.url && !p.tab && !p.teaserOnly)
      .map((p) => p.id);
    expect(dead).toEqual([]);
  });

  it('references only feeds that exist and actually carry articles', () => {
    const broken = allProjects
      .filter((p) => p.feed)
      .filter((p) => {
        const config = FEEDS[p.feed as FeedKey];
        return !config || config.empty;
      })
      .map((p) => `${p.id} → ${p.feed}`);
    // CORRECTIV.Europe is the case in point: its category feed is empty
    // upstream, so the project carries `teaserOnly` instead of a feed key.
    expect(broken).toEqual([]);
    expect(allProjects.find((p) => p.id === 'europe')).toMatchObject({ teaserOnly: true });
  });
});

describe('resolveProject', () => {
  it('finds every project in the directory', () => {
    const missing = allProjects.filter((p) => resolveProject(p.id)?.id !== p.id).map((p) => p.id);
    expect(missing).toEqual([]);
  });

  it('resolves every topic chip the Entdecken rail offers', () => {
    // The rail shows interests that have a feed; each must produce a page.
    const chips = interests.filter((i) => i.feed);
    expect(chips.length).toBeGreaterThan(0);
    const unresolvable = chips.filter((i) => !resolveProject(i.id)).map((i) => i.id);
    expect(unresolvable).toEqual([]);
  });

  it('prefers the real project over an interest of the same id', () => {
    // `klima` is both a project and an interest. The project page has an
    // editorial description; the synthetic topic page would overwrite it.
    expect(interests.some((i) => i.id === 'klima')).toBe(true);
    expect(resolveProject('klima')?.description).toBe(
      'Die Klimakrise und ihre Folgen, datenbasiert recherchiert.',
    );
  });

  it('builds a topic page for an interest with no project of its own', () => {
    // `jugend` (feed salon5) has no project card, so the synthetic page applies.
    expect(allProjects.some((p) => p.id === 'jugend')).toBe(false);
    expect(resolveProject('jugend')).toEqual({
      id: 'jugend',
      name: 'Jugend & Salon5',
      description: 'Alle Beiträge zum Thema Jugend & Salon5.',
      feed: 'salon5',
    });
  });

  it('returns null for an interest without a feed, and for junk', () => {
    // 'afd' is an interest used for Home ranking only — no feed, no page.
    expect(interests.find((i) => i.id === 'afd')?.feed).toBeUndefined();
    expect(resolveProject('afd')).toBeNull();
    expect(resolveProject('does-not-exist')).toBeNull();
    expect(resolveProject('')).toBeNull();
  });
});
