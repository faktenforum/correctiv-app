/**
 * Vue bindings for the framework-neutral core stores.
 *
 * `@correctiv/app-core` no longer ships Pinia stores — it ships plain
 * zustand/vanilla stores plus pure selector functions, so the same state logic
 * can also drive the React Native app. Each host adds its own reactivity here.
 *
 * The bound objects deliberately reproduce the surface the templates already
 * used: state as properties, actions as methods, derived values as properties
 * (`video.isActive`) or as functions (`saved.isSaved(url)`) exactly as Pinia
 * exposed them. That is why no call site in the 22 consuming files changed.
 *
 * Two details are load-bearing:
 *
 *  1. Derived values are computed from THIS reactive mirror, never by calling
 *     into the vanilla store. A selector reading the vanilla state would run
 *     outside Vue's dependency tracking, and the template would silently stop
 *     updating — the class of bug that is invisible until a demo.
 *  2. The mirrors are module-level singletons. The Pinia stores were singletons
 *     too, and several screens depend on sharing one object: the membership
 *     status flip has to become visible everywhere at once.
 */
import { computed, reactive, type ComputedRef } from 'vue';
import type { StoreApi } from 'zustand/vanilla';

import { settingsStore, type SettingsState } from '@correctiv/app-core/stores/settings';
import { membershipStore, type MembershipState } from '@correctiv/app-core/stores/membership';
import {
  interestsStore,
  boostedModules,
  extraFeeds,
  selectedInterests,
  type InterestsState,
} from '@correctiv/app-core/stores/interests';
import {
  savedArticlesStore,
  isSaved,
  type SavedArticle,
  type SavedArticlesState,
} from '@correctiv/app-core/stores/savedArticles';
import {
  participationStore,
  extraCount,
  hasSubmitted,
  type ParticipationState,
} from '@correctiv/app-core/stores/participation';
import { mediaStore, type MediaState } from '@correctiv/app-core/stores/media';
import { videoStore, isActive, type VideoState } from '@correctiv/app-core/stores/video';
import type { Interest } from '@correctiv/app-core/data/interests';

// Re-exported so consumers have one import for both the binding and the types
// that describe it — the store modules stay an implementation detail of this file.
export type { TabId, ThemePreference } from '@correctiv/app-core/stores/settings';
export type { MembershipInterval } from '@correctiv/app-core/stores/membership';
export type { CalloutSubmission } from '@correctiv/app-core/stores/participation';
export type { VideoStatus } from '@correctiv/app-core/stores/video';
export type { YoutubeKey, VideoListState } from '@correctiv/app-core/stores/media';

/** Mirrors a vanilla store into a Vue reactive object, once per store. */
function bind<T extends object>(store: StoreApi<T>): T {
  const state = reactive({ ...store.getState() }) as T;
  store.subscribe((next) => Object.assign(state, next));
  return state;
}

/**
 * Adds a derived value as a real property, so `store.isActive` keeps working in
 * templates. `computed` memoises it and — because the getter reads the reactive
 * mirror — Vue tracks the dependency correctly.
 */
function withDerived<T extends object, D extends Record<string, ComputedRef<unknown>>>(
  state: T,
  derived: D,
): T & { [K in keyof D]: D[K] extends ComputedRef<infer V> ? V : never } {
  for (const [key, ref] of Object.entries(derived)) {
    Object.defineProperty(state, key, { get: () => ref.value, enumerable: true });
  }
  return state as T & { [K in keyof D]: D[K] extends ComputedRef<infer V> ? V : never };
}

// --- settings, membership, media: no derived state, plain mirrors -------------

const settings = bind(settingsStore);
const membership = bind(membershipStore);
const media = bind(mediaStore);

export const useSettingsStore = (): SettingsState => settings;
export const useMembershipStore = (): MembershipState => membership;
export const useMediaStore = (): MediaState => media;

// --- interests ---------------------------------------------------------------

const interests = withDerived(bind(interestsStore), {
  selectedInterests: computed(() => selectedInterests(interestsView())),
  boostedModules: computed(() => boostedModules(interestsView())),
  extraFeeds: computed(() => extraFeeds(interestsView())),
});
// Indirection because the computeds above are created before `interests` is
// assigned; reading through a function defers it to first access.
function interestsView(): Pick<InterestsState, 'selected'> {
  return interests;
}

export type BoundInterests = InterestsState & {
  selectedInterests: Interest[];
  boostedModules: string[];
  extraFeeds: Interest[];
};
export const useInterestsStore = (): BoundInterests => interests as BoundInterests;

// --- saved articles (parameterised selector stays a function) ----------------

const savedArticlesMirror = bind(savedArticlesStore);
const savedArticles = Object.assign(savedArticlesMirror, {
  isSaved: (url: string) => isSaved(savedArticlesMirror, url),
});

export type BoundSavedArticles = SavedArticlesState & { isSaved: (url: string) => boolean };
export const useSavedArticlesStore = (): BoundSavedArticles => savedArticles;
export type { SavedArticle };

// --- participation (parameterised selectors stay functions) ------------------

const participationMirror = bind(participationStore);
const participation = Object.assign(participationMirror, {
  hasSubmitted: (slug: string) => hasSubmitted(participationMirror, slug),
  extraCount: (slug: string) => extraCount(participationMirror, slug),
});

export type BoundParticipation = ParticipationState & {
  hasSubmitted: (slug: string) => boolean;
  extraCount: (slug: string) => number;
};
export const useParticipationStore = (): BoundParticipation => participation;

// --- video -------------------------------------------------------------------

const video = withDerived(bind(videoStore), {
  isActive: computed(() => isActive(videoView())),
});
function videoView(): Pick<VideoState, 'current'> {
  return video;
}

export type BoundVideo = VideoState & { isActive: boolean };
export const useVideoStore = (): BoundVideo => video as BoundVideo;

// --- raw vanilla stores, for persist() and anything needing subscribe --------

export const coreStores = {
  settings: settingsStore,
  membership: membershipStore,
  interests: interestsStore,
  savedArticles: savedArticlesStore,
  participation: participationStore,
  media: mediaStore,
  video: videoStore,
};
