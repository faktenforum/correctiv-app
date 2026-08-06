/**
 * React bindings for the framework-neutral core stores.
 *
 * `@correctiv/app-core` ships zustand/vanilla stores plus pure selector functions
 * (ADR 0004); each host adds its own reactivity. This is the React half — the Vue
 * half lives in apps/mobile/src/stores/core-bindings.ts.
 *
 * On this side there is barely anything to add, which is the point: zustand's
 * `useStore` subscribes a component to a vanilla store directly, and the
 * selectors are ordinary functions of state, so they compose with it as-is.
 *
 * Always select the narrowest slice you need. `useStore(store)` without a
 * selector re-renders on every change to any field in that store.
 */
import { useEffect, useMemo } from 'react';
import { useStore } from 'zustand';

import {
  interestsStore,
  boostedModules as selectBoostedModules,
  extraFeeds as selectExtraFeeds,
  selectedInterests as selectSelectedInterests,
} from '@correctiv/app-core/stores/interests';
import { membershipStore } from '@correctiv/app-core/stores/membership';
import { findSeries, podcastsStore } from '@correctiv/app-core/stores/podcasts';
import {
  participationStore,
  extraCount as selectExtraCount,
  hasSubmitted as selectHasSubmitted,
} from '@correctiv/app-core/stores/participation';
import {
  savedArticlesStore,
  isSaved as selectIsSaved,
} from '@correctiv/app-core/stores/savedArticles';
import { settingsStore } from '@correctiv/app-core/stores/settings';
import { videoStore, isActive as selectIsActive } from '@correctiv/app-core/stores/video';
import { mediaStore, type YoutubeKey } from '@correctiv/app-core/stores/media';
import { audioStore } from '@correctiv/app-core/stores/audio';
import { feedsStore } from '@correctiv/app-core/stores/feeds';

// --- whole-store hooks (use a selector below where you can) -------------------

export const useSettings = () => useStore(settingsStore);
export const useMembership = () => useStore(membershipStore);
export const useMedia = () => useStore(mediaStore);
export const useVideo = () => useStore(videoStore);

// --- narrow selectors --------------------------------------------------------

/** The demo's central lever — read it per render, never snapshot it. */
export const useIsMember = () => useStore(membershipStore, (s) => s.isMember);
export const useActiveTab = () => useStore(settingsStore, (s) => s.activeTab);
export const useTextScale = () => useStore(settingsStore, (s) => s.textScale);
export const useTheme = () => useStore(settingsStore, (s) => s.theme);

export const useVideoIsActive = () => useStore(videoStore, selectIsActive);

export const useSavedArticles = () => useStore(savedArticlesStore, (s) => s.items);
export const useIsSaved = (url: string) =>
  useStore(savedArticlesStore, (s) => selectIsSaved(s, url));

/**
 * These three selectors build a NEW array on every call (`filter`/`map`), and
 * zustand v5's `useStore` passes the selector straight to React's
 * `useSyncExternalStore` — no equality function. A snapshot with a fresh identity
 * each render makes React throw "The result of getSnapshot should be cached to
 * avoid an infinite loop".
 *
 * So subscribe to the raw `selected` array — a stable reference between changes,
 * because the store updates immutably — and derive under `useMemo`.
 */
export const useSelectedInterests = () => {
  const selected = useStore(interestsStore, (s) => s.selected);
  return useMemo(() => selectSelectedInterests({ selected }), [selected]);
};

export const useBoostedModules = () => {
  const selected = useStore(interestsStore, (s) => s.selected);
  return useMemo(() => selectBoostedModules({ selected }), [selected]);
};

export const useExtraFeeds = () => {
  const selected = useStore(interestsStore, (s) => s.selected);
  return useMemo(() => selectExtraFeeds({ selected }), [selected]);
};

/**
 * One media channel's videos, loaded on first use.
 *
 * The core store owns what this app previously got wrong on its own: FunFacts
 * moved to CORRECTIV's PeerTube instance, and fetching it from the YouTube Atom
 * feed is the legacy path. `mediaStore` routes per MEDIA_SOURCE and brings the
 * cache plus stale fallback with it, so this hook only subscribes and kicks off
 * the load.
 *
 * `byKey[key]` is a stable reference between updates (the store patches
 * immutably), so it is safe to select directly — see the note above about
 * selectors that build fresh objects.
 */
export const useVideoChannel = (key: YoutubeKey) => {
  const slice = useStore(mediaStore, (s) => s.byKey[key]);
  useEffect(() => {
    if (slice.status === 'idle') void mediaStore.getState().fetch(key);
  }, [key, slice.status]);
  return slice;
};

/**
 * The whole podcast library, loaded on first use — same shape as
 * `useVideoChannel`. Two narrow subscriptions rather than one whole-store read:
 * `series` is a stable reference between updates and `status` is a string, so
 * neither can produce the fresh-snapshot loop described above.
 */
export const usePodcastLibrary = () => {
  const series = useStore(podcastsStore, (s) => s.series);
  const status = useStore(podcastsStore, (s) => s.status);
  useEffect(() => {
    if (status === 'idle') void podcastsStore.getState().fetchAll();
  }, [status]);
  return { series, status };
};

/** One series by id, with the same lazy load. */
export const usePodcastSeries = (id: string) => {
  const { series, status } = usePodcastLibrary();
  return { series: useMemo(() => findSeries({ series }, id), [series, id]), status };
};

export const useHasSubmitted = (slug: string) =>
  useStore(participationStore, (s) => selectHasSubmitted(s, slug));
export const useExtraCount = (slug: string) =>
  useStore(participationStore, (s) => selectExtraCount(s, slug));

// --- actions -----------------------------------------------------------------

/**
 * Actions live in the store state and their identities are stable, so reading
 * them outside React (no hook, no re-render) is both safe and cheaper than
 * selecting them.
 */
export const coreActions = {
  settings: () => settingsStore.getState(),
  audio: () => audioStore.getState(),
  feeds: () => feedsStore.getState(),
  podcasts: () => podcastsStore.getState(),
  membership: () => membershipStore.getState(),
  interests: () => interestsStore.getState(),
  savedArticles: () => savedArticlesStore.getState(),
  participation: () => participationStore.getState(),
  media: () => mediaStore.getState(),
  video: () => videoStore.getState(),
};

/** Raw stores, for persist() and anything needing subscribe/getState. */
export const coreStores = {
  settings: settingsStore,
  audio: audioStore,
  feeds: feedsStore,
  podcasts: podcastsStore,
  membership: membershipStore,
  interests: interestsStore,
  savedArticles: savedArticlesStore,
  participation: participationStore,
  media: mediaStore,
  video: videoStore,
};
