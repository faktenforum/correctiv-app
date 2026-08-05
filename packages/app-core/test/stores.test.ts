import { beforeEach, describe, expect, it, vi } from 'vitest';

import { interests } from '../src/data/interests';
import { configurePlatform, createMemoryPlatform, resetPlatform } from '../src/ports';
import { persist } from '../src/stores/persist';
import { PERSISTED_KEYS, settingsStore } from '../src/stores/settings';
import { membershipStore } from '../src/stores/membership';
import {
  boostedModules,
  extraFeeds,
  interestsStore,
  selectedInterests,
} from '../src/stores/interests';
import { isSaved, savedArticlesStore, type SavedArticle } from '../src/stores/savedArticles';
import { extraCount, hasSubmitted, participationStore } from '../src/stores/participation';
import { isActive, videoStore } from '../src/stores/video';

/**
 * The stores moved from Pinia to zustand/vanilla so the core can drive both a Vue
 * and a React host (ADR 0004). These tests pin the behaviour that move could
 * quietly change: immutable updates, action semantics, and the pure selectors
 * that replaced Pinia's computed getters.
 */

const initial = {
  settings: settingsStore.getState(),
  membership: membershipStore.getState(),
  interests: interestsStore.getState(),
  saved: savedArticlesStore.getState(),
  participation: participationStore.getState(),
  video: videoStore.getState(),
};

beforeEach(() => {
  // Vanilla stores are module singletons, so state has to be restored explicitly.
  settingsStore.setState(initial.settings, true);
  membershipStore.setState(initial.membership, true);
  interestsStore.setState(initial.interests, true);
  savedArticlesStore.setState(initial.saved, true);
  participationStore.setState(initial.participation, true);
  videoStore.setState(initial.video, true);
  resetPlatform();
});

describe('settings store', () => {
  it('tracks visited tabs without duplicating them', () => {
    const { setActiveTab } = settingsStore.getState();
    setActiveTab('media');
    setActiveTab('profile');
    setActiveTab('media');

    expect(settingsStore.getState().activeTab).toBe('media');
    expect(settingsStore.getState().visitedTabs).toEqual(['home', 'media', 'profile']);
  });

  it('replaces the visitedTabs array instead of mutating it', () => {
    const before = settingsStore.getState().visitedTabs;
    settingsStore.getState().setActiveTab('discover');
    // A binding that diffs by reference (React) only re-renders on a new array.
    expect(settingsStore.getState().visitedTabs).not.toBe(before);
    expect(before).toEqual(['home']);
  });

  it('completes onboarding and sets the theme', () => {
    settingsStore.getState().completeOnboarding();
    settingsStore.getState().setTheme('dark');
    expect(settingsStore.getState().onboardingDone).toBe(true);
    expect(settingsStore.getState().theme).toBe('dark');
  });
});

describe('membership store', () => {
  it('joining sets the member flag and keeps the first memberSince', () => {
    const { join } = membershipStore.getState();
    join(25, 'jährlich', 'Testperson');
    const first = membershipStore.getState().memberSince;
    expect(membershipStore.getState().isMember).toBe(true);
    expect(membershipStore.getState().amountEur).toBe(25);
    expect(first).not.toBeNull();

    join(50, 'monatlich');
    expect(membershipStore.getState().memberSince).toBe(first);
    // Joining again without a name must not blank the existing one.
    expect(membershipStore.getState().name).toBe('Testperson');
    expect(membershipStore.getState().amountEur).toBe(50);
  });

  it('reset returns every field to its initial value', () => {
    membershipStore.getState().join(99, 'jährlich', 'X');
    membershipStore.getState().reset();
    expect(membershipStore.getState()).toMatchObject({
      isMember: false,
      name: '',
      memberSince: null,
      amountEur: 10,
      interval: 'monatlich',
      paused: false,
    });
  });
});

describe('interests selectors', () => {
  it('toggle adds and removes, immutably', () => {
    const before = interestsStore.getState().selected;
    interestsStore.getState().toggle('klima');
    expect(interestsStore.getState().selected).toEqual(['klima']);
    expect(interestsStore.getState().selected).not.toBe(before);

    interestsStore.getState().toggle('klima');
    expect(interestsStore.getState().selected).toEqual([]);
  });

  it('selectors are pure functions of the state passed in', () => {
    // The whole point of the rewrite: a selector must never read the store
    // itself, or a Vue computed calling it would escape dependency tracking.
    const detached = { selected: ['klima'] };
    expect(selectedInterests(detached).map((i) => i.id)).toEqual(['klima']);
    // The real store is untouched by the call above.
    expect(selectedInterests(interestsStore.getState())).toEqual([]);
  });

  it('boostedModules drops interests without a boostModule', () => {
    const all = { selected: interests.map((i) => i.id) };
    const expected = interests.filter((i) => i.boostModule).length;
    expect(boostedModules(all)).toHaveLength(expected);
    expect(boostedModules(all).every((m) => !!m)).toBe(true);
  });

  it('extraFeeds keeps feed-backed interests but never salon5', () => {
    const all = { selected: interests.map((i) => i.id) };
    expect(extraFeeds(all).some((i) => i.feed === 'salon5')).toBe(false);
    expect(extraFeeds(all).every((i) => !!i.feed)).toBe(true);
    expect(extraFeeds(all)).toHaveLength(
      interests.filter((i) => i.feed && i.feed !== 'salon5').length,
    );
  });
});

describe('savedArticles store', () => {
  const article: SavedArticle = {
    url: 'https://correctiv.org/a/',
    title: 'A',
    topline: null,
    rating: null,
    savedAt: '2026-08-05T00:00:00.000Z',
  };

  it('toggle saves, then unsaves', () => {
    savedArticlesStore.getState().toggle(article);
    expect(isSaved(savedArticlesStore.getState(), article.url)).toBe(true);
    savedArticlesStore.getState().toggle(article);
    expect(isSaved(savedArticlesStore.getState(), article.url)).toBe(false);
  });

  it('newest saved article comes first', () => {
    savedArticlesStore.getState().toggle(article);
    savedArticlesStore
      .getState()
      .toggle({ ...article, url: 'https://correctiv.org/b/', title: 'B' });
    expect(savedArticlesStore.getState().items.map((a) => a.title)).toEqual(['B', 'A']);
  });

  it('remove deletes only the given url', () => {
    savedArticlesStore.getState().toggle(article);
    savedArticlesStore.getState().toggle({ ...article, url: 'https://correctiv.org/b/' });
    savedArticlesStore.getState().remove(article.url);
    expect(savedArticlesStore.getState().items.map((a) => a.url)).toEqual([
      'https://correctiv.org/b/',
    ]);
  });
});

describe('participation store', () => {
  it('counts repeated submissions per callout', () => {
    const { submit } = participationStore.getState();
    submit('pflege', { a: 1 });
    submit('pflege', { a: 2 });
    submit('mieten', { a: 3 });

    const state = participationStore.getState();
    expect(hasSubmitted(state, 'pflege')).toBe(true);
    expect(hasSubmitted(state, 'unbekannt')).toBe(false);
    expect(extraCount(state, 'pflege')).toBe(2);
    expect(extraCount(state, 'mieten')).toBe(1);
    expect(extraCount(state, 'unbekannt')).toBe(0);
  });
});

describe('video store', () => {
  it('isActive follows the current item', () => {
    expect(isActive(videoStore.getState())).toBe(false);
    videoStore.setState({ current: { id: 'v1' } as never });
    expect(isActive(videoStore.getState())).toBe(true);
    videoStore.getState().close();
    expect(isActive(videoStore.getState())).toBe(false);
  });

  it('close clears the whole session', () => {
    videoStore.setState({
      current: { id: 'v1' } as never,
      hlsUrl: 'x',
      status: 'ready',
      expanded: true,
    });
    videoStore.getState().close();
    expect(videoStore.getState()).toMatchObject({
      current: null,
      hlsUrl: '',
      status: 'idle',
      expanded: false,
    });
  });
});

describe('persist', () => {
  it('writes only the declared keys, debounced', async () => {
    vi.useFakeTimers();
    const platform = createMemoryPlatform();
    configurePlatform(platform);

    persist('settings', settingsStore, PERSISTED_KEYS);
    settingsStore.getState().setTheme('light');
    settingsStore.getState().setActiveTab('media');

    expect(platform.keyValue.getString('store.settings')).toBeNull(); // still debounced
    await vi.advanceTimersByTimeAsync(300);

    const saved = JSON.parse(platform.keyValue.getString('store.settings') ?? '{}');
    expect(saved.theme).toBe('light');
    // activeTab is ephemeral shell state and must not be persisted.
    expect(saved).not.toHaveProperty('activeTab');
    expect(Object.keys(saved).sort()).toEqual([...PERSISTED_KEYS].sort());
    vi.useRealTimers();
  });

  it('hydrates from storage, ignoring unknown keys', () => {
    const platform = createMemoryPlatform();
    platform.keyValue.setString(
      'store.settings',
      JSON.stringify({ theme: 'dark', textScale: 1.5, activeTab: 'profile', bogus: 1 }),
    );
    configurePlatform(platform);

    persist('settings', settingsStore, PERSISTED_KEYS);

    expect(settingsStore.getState().theme).toBe('dark');
    expect(settingsStore.getState().textScale).toBe(1.5);
    // Not in PERSISTED_KEYS, so a stale payload cannot override live shell state…
    expect(settingsStore.getState().activeTab).toBe('home');
    // …nor inject state the store never declared.
    expect(settingsStore.getState()).not.toHaveProperty('bogus');
  });

  it('discards corrupt persistence instead of throwing', () => {
    const platform = createMemoryPlatform();
    platform.keyValue.setString('store.settings', '{not json');
    configurePlatform(platform);

    expect(() => persist('settings', settingsStore, PERSISTED_KEYS)).not.toThrow();
    expect(platform.keyValue.getString('store.settings')).toBeNull();
    expect(settingsStore.getState().theme).toBe('system');
  });

  it('keeps actions callable after hydration', () => {
    const platform = createMemoryPlatform();
    platform.keyValue.setString('store.settings', JSON.stringify({ theme: 'dark' }));
    configurePlatform(platform);

    persist('settings', settingsStore, PERSISTED_KEYS);
    // setState with a partial slice must not clobber the action functions —
    // the failure mode would be a store that hydrates and then cannot be used.
    expect(() => settingsStore.getState().setTheme('light')).not.toThrow();
    expect(settingsStore.getState().theme).toBe('light');
  });
});
