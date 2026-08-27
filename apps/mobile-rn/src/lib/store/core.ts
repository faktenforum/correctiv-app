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
import {
  enrichImage,
  fetchFeedKey,
  fetchMany,
  type FeedStatus,
} from '@correctiv/app-core/stores/feeds';
import {
  boostedModules as selectBoostedModules,
  extraFeeds as selectExtraFeeds,
  interestsActions,
  selectedInterests as selectSelectedInterests,
} from '@correctiv/app-core/stores/interests';
import {
  fetchChannel,
  type VideoListState,
  type YoutubeKey,
} from '@correctiv/app-core/stores/media';
import { membershipActions } from '@correctiv/app-core/stores/membership';
import {
  extraCount as selectExtraCount,
  hasSubmitted as selectHasSubmitted,
  participationActions,
} from '@correctiv/app-core/stores/participation';
import { fetchAll, findSeries, type PodcastsStatus } from '@correctiv/app-core/stores/podcasts';
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

// --- lazy loads --------------------------------------------------------------

/** What the lazily loaded slices' statuses have in common: all start at `'idle'`. */
type LazyStatus = FeedStatus | PodcastsStatus | VideoListState['status'];

/**
 * Fills a slice the first time something asks for it.
 *
 * `useVideoChannel`, `usePodcastLibrary` and `useFeed` were three copies of the
 * same four lines: watch a status, and while it is still `'idle'` dispatch the
 * thunk that fills the slice. The SUBSCRIPTION stays with the caller, because
 * only the caller knows how to select narrowly enough — see the note on the
 * interest hooks above, and the ones about `byKey` below.
 *
 * Two things here are load-bearing.
 *
 * **It dispatches through the Provider, not through the imported store.** Those
 * are the same object in the app, so nothing can diverge today — but
 * `createAppStore()` exists for tests, and against an isolated store a hook that
 * reads the Provider while loading into the singleton would sit on `'idle'`
 * forever: it never sees its own load land, so the effect never re-runs, never
 * retries and never errors.
 *
 * **The subject is a dependency too.** A status alone cannot decide when to load
 * again: two video channels can both be `'idle'`, so a rail switching from one to
 * the other would never load the second. Hence the subject is handed over
 * separately instead of being closed over — `() => fetchChannel(key)` would be a
 * fresh function on every render, and an effect can only depend on what it can
 * compare.
 */
export function useLazyLoad<S>(
  status: LazyStatus,
  load: (subject: S) => AppThunk<unknown>,
  subject: S,
): void {
  const dispatch = useAppDispatch();
  useEffect(() => {
    if (status === 'idle') void dispatch(load(subject));
  }, [dispatch, load, status, subject]);
}

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
  useLazyLoad(slice.status, fetchChannel, key);
  return slice;
};

/**
 * The whole podcast library, loaded on first use — same shape as
 * `useVideoChannel`. Two narrow subscriptions rather than one whole-slice read:
 * `series` is a stable reference between updates and `status` is a string, so
 * neither can cost a render it does not owe.
 *
 * There is one library and it arrives in one piece, so the load has no subject —
 * `fetchAll` takes only its options, and defaults them.
 */
export const usePodcastLibrary = () => {
  const series = useAppSelector((s) => s.podcasts.series);
  const status = useAppSelector((s) => s.podcasts.status);
  useLazyLoad(status, fetchAll, undefined);
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
 * Every action this app dispatches, bound to one dispatch.
 *
 * The thunk groups are spelled out rather than run through `bindActionCreators`,
 * because that helper types a bound thunk as returning the thunk itself instead
 * of what dispatching it returns — which would make every `await` on one a lie.
 */
function bindCoreActions(dispatch: AppDispatch) {
  const bind =
    <A extends unknown[], R>(creator: (...args: A) => AppThunk<R>) =>
    (...args: A): R =>
      dispatch(creator(...args));

  return {
    settings: bindActionCreators(settingsActions, dispatch),
    membership: bindActionCreators(membershipActions, dispatch),
    savedArticles: bindActionCreators(savedArticlesActions, dispatch),
    interests: bindActionCreators(interestsActions, dispatch),
    participation: bindActionCreators(participationActions, dispatch),

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
        dispatch,
      ),
      play: bind(videoActions.play),
    },
  };
}

export type CoreActions = ReturnType<typeof bindCoreActions>;

/**
 * The actions, bound to the core's singleton store at module load.
 *
 * **Inside React use `useCoreActions()`; outside, use this and know that you
 * are.** Reads go through the Provider, so a component that writes here reads
 * one store and writes to another the moment the two are not the same object.
 * They are the same object in the app — `app/_layout.tsx` hands the Provider this
 * very singleton, and `__tests__/root-layout.test.tsx` pins that — but
 * `createAppStore()` exists for tests, and against an isolated store the divergence
 * is silent: both calls succeed and the screen simply never updates.
 *
 * The callers that genuinely run outside React are real and few:
 * `lib/audio/player.ts` (whose actions the exclusive-playback callback invokes as
 * well as screens do), `lib/feeds/corpus.ts` (a module-level promise) and the
 * `registerExclusiveMedium` wiring in `app/_layout.tsx`. That is not a wart — it
 * is the same reason the core owns the store instance at all, which the doc
 * comment in `@correctiv/app-core/stores/store` sets out.
 */
export const coreActions = bindCoreActions(store.dispatch);

/**
 * The same actions, bound to the store the Provider actually holds.
 *
 * Memoised on the dispatch, which react-redux keeps stable for the life of the
 * store — so these keep one identity across renders and can be handed straight
 * to an `onPress` without defeating memoisation downstream.
 */
export const useCoreActions = (): CoreActions => {
  const dispatch = useAppDispatch();
  return useMemo(() => bindCoreActions(dispatch), [dispatch]);
};
