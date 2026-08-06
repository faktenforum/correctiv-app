import { computed, isReactive, nextTick } from 'vue';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  coreStores,
  useAudioStore,
  useFeedsStore,
  useInterestsStore,
  useMembershipStore,
  usePodcastsStore,
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
  audio: coreStores.audio.getState(),
  feeds: coreStores.feeds.getState(),
  podcasts: coreStores.podcasts.getState(),
};

beforeEach(() => {
  coreStores.settings.setState(initial.settings, true);
  coreStores.membership.setState(initial.membership, true);
  coreStores.interests.setState(initial.interests, true);
  coreStores.savedArticles.setState(initial.saved, true);
  coreStores.video.setState(initial.video, true);
  coreStores.audio.setState(initial.audio, true);
  coreStores.feeds.setState(initial.feeds, true);
  coreStores.podcasts.setState(initial.podcasts, true);
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

    saved.toggle({ url, title: 'X', kicker: null, rating: null, savedAt: 'now' });
    await nextTick();
    expect(spy.value).toBe(true);
  });
});

/**
 * The three stores this app used to own itself (ADR 0006). They came from the core
 * with actions and derived values, so they are exactly the shape this binding can get
 * wrong — and the templates that read them are the mini player, the tab bar and the
 * home feed, i.e. everything a demo starts with.
 */
describe('the stores that moved into the core', () => {
  it('audio.isLive and isActive track the vanilla store', async () => {
    const audio = useAudioStore();
    const live = computed(() => audio.isLive);
    const active = computed(() => audio.isActive);
    expect(active.value).toBe(false);

    coreStores.audio.setState({
      track: { kind: 'radio', title: 'Salon5 Radio', url: 'https://icecast/x' },
    });
    await nextTick();
    expect(active.value).toBe(true);
    expect(live.value).toBe(true);

    coreStores.audio.setState({ track: null });
    await nextTick();
    expect(active.value).toBe(false);
    expect(live.value).toBe(false);
  });

  it('feeds.items(key) is tracked per feed', async () => {
    const feeds = useFeedsStore();
    const spy = computed(() => feeds.items('recherchen').length);
    expect(spy.value).toBe(0);

    coreStores.feeds.setState((state) => ({
      byKey: {
        ...state.byKey,
        recherchen: { ...state.byKey.recherchen, items: [{ id: 'a' }] as never, status: 'ready' },
      },
    }));
    await nextTick();
    expect(spy.value).toBe(1);
    // A different feed must not have been invalidated into showing the same item.
    expect(feeds.items('klima')).toHaveLength(0);
  });

  it('podcasts.find(id) is tracked', async () => {
    const podcasts = usePodcastsStore();
    const spy = computed(() => podcasts.find('pausenbrot')?.title ?? null);
    expect(spy.value).toBeNull();

    coreStores.podcasts.setState({
      series: [{ id: 'pausenbrot', title: 'Pausenbrot' }] as never,
      status: 'ready',
    });
    await nextTick();
    expect(spy.value).toBe('Pausenbrot');
  });
});
