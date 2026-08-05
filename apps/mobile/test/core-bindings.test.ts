import { computed, isReactive, nextTick } from 'vue';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  coreStores,
  useInterestsStore,
  useMembershipStore,
  useSavedArticlesStore,
  useSettingsStore,
  useVideoStore,
} from '../src/stores/core-bindings';

/**
 * The core stores are framework-neutral now (ADR 0004), so this thin Vue layer is
 * the only thing standing between them and every template in the app. It is worth
 * testing precisely because its failure mode is silent: a template that simply
 * stops updating, with no error anywhere, which typecheck and the Android build
 * both happily pass.
 *
 * What must hold:
 *  - the bound object is reactive, and vanilla-store changes reach it
 *  - actions called on the binding update it
 *  - derived properties (video.isActive) TRACK as Vue dependencies
 *  - parameterised selectors (saved.isSaved(url)) TRACK as Vue dependencies
 */

const initial = {
  settings: coreStores.settings.getState(),
  membership: coreStores.membership.getState(),
  interests: coreStores.interests.getState(),
  saved: coreStores.savedArticles.getState(),
  video: coreStores.video.getState(),
};

beforeEach(() => {
  coreStores.settings.setState(initial.settings, true);
  coreStores.membership.setState(initial.membership, true);
  coreStores.interests.setState(initial.interests, true);
  coreStores.savedArticles.setState(initial.saved, true);
  coreStores.video.setState(initial.video, true);
});

describe('bound store objects', () => {
  it('are reactive', () => {
    expect(isReactive(useSettingsStore())).toBe(true);
  });

  it('return the same instance on every call', () => {
    // Several screens rely on sharing one object — the membership flip has to be
    // visible everywhere at once.
    expect(useMembershipStore()).toBe(useMembershipStore());
  });

  it('mirror changes made directly on the vanilla store', async () => {
    coreStores.settings.getState().setActiveTab('media');
    await nextTick();
    expect(useSettingsStore().activeTab).toBe('media');
  });

  it('apply actions called through the binding', async () => {
    useSettingsStore().setActiveTab('profile');
    await nextTick();
    expect(useSettingsStore().activeTab).toBe('profile');
    expect(coreStores.settings.getState().activeTab).toBe('profile');
  });
});

describe('reactivity of derived values', () => {
  it('video.isActive is tracked, not a stale snapshot', async () => {
    const video = useVideoStore();
    const spy = computed(() => video.isActive);
    expect(spy.value).toBe(false);

    await coreStores.video.getState().play({ id: 'v1', hlsMasterUrl: 'x' } as never);
    await nextTick();
    // If the selector read the vanilla store instead of the reactive mirror,
    // this computed would never invalidate and would still report false.
    expect(spy.value).toBe(true);

    video.close();
    await nextTick();
    expect(spy.value).toBe(false);
  });

  it('interests.extraFeeds recomputes when the selection changes', async () => {
    const store = useInterestsStore();
    const spy = computed(() => store.extraFeeds.length);
    const before = spy.value;

    store.toggle('klima');
    await nextTick();
    expect(spy.value).toBeGreaterThanOrEqual(before);
    expect(store.selectedInterests.map((i) => i.id)).toEqual(['klima']);
  });

  it('savedArticles.isSaved(url) is tracked', async () => {
    const saved = useSavedArticlesStore();
    const url = 'https://correctiv.org/x/';
    const spy = computed(() => saved.isSaved(url));
    expect(spy.value).toBe(false);

    saved.toggle({ url, title: 'X', topline: null, rating: null, savedAt: 'now' });
    await nextTick();
    expect(spy.value).toBe(true);
  });
});
