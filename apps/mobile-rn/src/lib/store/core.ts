/**
 * React bindings for the core's Redux store.
 *
 * `@correctiv/app-core` owns the store and the slices (ADR 0004); each host adds
 * its own reactivity. This is the React half — `react-redux`'s `useSelector` over
 * the core's `store`, plus the pure selector functions the slices export, which
 * are ordinary functions of state and compose with it as-is.
 *
 * Always select the narrowest slice you need. `useSelector((s) => s.settings)`
 * re-renders on every change to any field in that slice.
 */
import { bindActionCreators } from '@reduxjs/toolkit';
import { useEffect, useMemo } from 'react';
import { useDispatch, useSelector, useStore, type TypedUseSelectorHook } from 'react-redux';

import {
  playEpisode,
  playRadio,
  seekTo,
  setSpeed,
  stop,
  togglePlay,
} from '@correctiv/app-core/stores/audio';
import { enrichImage, fetchFeedKey, fetchMany } from '@correctiv/app-core/stores/feeds';
import {
  boostedModules as selectBoostedModules,
  extraFeeds as selectExtraFeeds,
  interestsActions,
  selectedInterests as selectSelectedInterests,
} from '@correctiv/app-core/stores/interests';
import { fetchChannel, type YoutubeKey } from '@correctiv/app-core/stores/media';
import { membershipActions } from '@correctiv/app-core/stores/membership';
import {
  extraCount as selectExtraCount,
  hasSubmitted as selectHasSubmitted,
  participationActions,
} from '@correctiv/app-core/stores/participation';
import { fetchAll, findSeries } from '@correctiv/app-core/stores/podcasts';
import {
  isSaved as selectIsSaved,
  savedArticlesActions,
} from '@correctiv/app-core/stores/savedArticles';
import { settingsActions } from '@correctiv/app-core/stores/settings';
import {
  store,
  type AppDispatch,
  type AppThunk,
  type RootState,
} from '@correctiv/app-core/stores/store';
import { videoActions } from '@correctiv/app-core/stores/video';

export { store as coreStore };

/** Typed `useSelector`, so a selector's state argument is never `any`. */
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppStore = () => useStore<RootState>();

// --- whole-slice hooks (use a narrower selector below where you can) ----------

export const useSettings = () => useAppSelector((s) => s.settings);
export const useMembership = () => useAppSelector((s) => s.membership);
export const useMedia = () => useAppSelector((s) => s.media);
export const useVideo = () => useAppSelector((s) => s.video);

// --- narrow selectors --------------------------------------------------------

/** The demo's central lever — read it per render, never snapshot it. */
export const useIsMember = () => useAppSelector((s) => s.membership.isMember);
export const useActiveTab = () => useAppSelector((s) => s.settings.activeTab);
export const useTextScale = () => useAppSelector((s) => s.settings.textScale);
export const useTheme = () => useAppSelector((s) => s.settings.theme);

export const useVideoIsActive = () => useAppSelector((s) => s.video.current !== null);

export const useSavedArticles = () => useAppSelector((s) => s.savedArticles.items);
export const useIsSaved = (url: string) =>
  useAppSelector((s) => selectIsSaved(s.savedArticles, url));

/**
 * These three selectors build a NEW array on every call (`filter`/`map`).
 * `useSelector` compares results by reference, so a selector with a fresh
 * identity per call re-renders the component on EVERY dispatch — including the
 * audio position tick, twice a second, for a component that shows interests.
 *
 * So subscribe to the raw `selected` array — a stable reference between changes,
 * because the slice updates immutably — and derive under `useMemo`.
 */
export const useSelectedInterests = () => {
  const selected = useAppSelector((s) => s.interests.selected);
  return useMemo(() => selectSelectedInterests({ selected }), [selected]);
};

export const useBoostedModules = () => {
  const selected = useAppSelector((s) => s.interests.selected);
  return useMemo(() => selectBoostedModules({ selected }), [selected]);
};

export const useExtraFeeds = () => {
  const selected = useAppSelector((s) => s.interests.selected);
  return useMemo(() => selectExtraFeeds({ selected }), [selected]);
};

/**
 * One media channel's videos, loaded on first use.
 *
 * The core slice owns what this app previously got wrong on its own: FunFacts
 * moved to CORRECTIV's PeerTube instance, and fetching it from the YouTube Atom
 * feed is the legacy path. `stores/media` routes per MEDIA_SOURCE and brings the
 * cache plus stale fallback with it, so this hook only subscribes and kicks off
 * the load.
 *
 * `byKey[key]` is a stable reference between updates (Immer patches the channel
 * in place and leaves its siblings alone), so it is safe to select directly —
 * see the note above about selectors that build fresh objects.
 */
export const useVideoChannel = (key: YoutubeKey) => {
  const slice = useAppSelector((s) => s.media.byKey[key]);
  useEffect(() => {
    if (slice.status === 'idle') void store.dispatch(fetchChannel(key));
  }, [key, slice.status]);
  return slice;
};

/**
 * The whole podcast library, loaded on first use — same shape as
 * `useVideoChannel`. Two narrow subscriptions rather than one whole-slice read:
 * `series` is a stable reference between updates and `status` is a string, so
 * neither can cost a render it does not owe.
 */
export const usePodcastLibrary = () => {
  const series = useAppSelector((s) => s.podcasts.series);
  const status = useAppSelector((s) => s.podcasts.status);
  useEffect(() => {
    if (status === 'idle') void store.dispatch(fetchAll());
  }, [status]);
  return { series, status };
};

/** One series by id, with the same lazy load. */
export const usePodcastSeries = (id: string) => {
  const { series, status } = usePodcastLibrary();
  return {
    series: useMemo(() => findSeries({ series, status }, id), [series, status, id]),
    status,
  };
};

export const useHasSubmitted = (slug: string) =>
  useAppSelector((s) => selectHasSubmitted(s.participation, slug));
export const useExtraCount = (slug: string) =>
  useAppSelector((s) => selectExtraCount(s.participation, slug));

// --- actions -----------------------------------------------------------------

/**
 * Actions, bound to the core store once at module load.
 *
 * Dispatching outside React costs no render and needs no hook, which is what
 * keeps the call sites plain: `coreActions.settings.setTheme('dark')` in an
 * onPress, rather than a `useDispatch` in every screen that has a button.
 *
 * The thunk groups are spelled out rather than run through
 * `bindActionCreators`, because that helper types a bound thunk as returning the
 * thunk itself instead of what dispatching it returns — which would make every
 * `await` here a lie.
 */
const bind =
  <A extends unknown[], R>(creator: (...args: A) => AppThunk<R>) =>
  (...args: A): R =>
    store.dispatch(creator(...args));

export const coreActions = {
  settings: bindActionCreators(settingsActions, store.dispatch),
  membership: bindActionCreators(membershipActions, store.dispatch),
  savedArticles: bindActionCreators(savedArticlesActions, store.dispatch),
  interests: bindActionCreators(interestsActions, store.dispatch),
  participation: bindActionCreators(participationActions, store.dispatch),

  audio: {
    playRadio: bind(playRadio),
    playEpisode: bind(playEpisode),
    togglePlay: bind(togglePlay),
    seekTo: bind(seekTo),
    setSpeed: bind(setSpeed),
    stop: bind(stop),
  },
  feeds: {
    fetch: bind(fetchFeedKey),
    fetchMany: bind(fetchMany),
    enrichImage: bind(enrichImage),
  },
  podcasts: { fetchAll: bind(fetchAll) },
  media: { fetch: bind(fetchChannel) },
  video: {
    ...bindActionCreators(
      { expand: videoActions.expand, collapse: videoActions.collapse, close: videoActions.close },
      store.dispatch,
    ),
    play: bind(videoActions.play),
  },
};
