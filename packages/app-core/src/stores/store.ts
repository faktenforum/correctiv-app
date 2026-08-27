import {
  combineReducers,
  configureStore,
  createAction,
  type ThunkAction,
  type UnknownAction,
} from '@reduxjs/toolkit';

import { audioReducer } from './audio';
import { feedsReducer } from './feeds';
import { interestsReducer } from './interests';
import { mediaReducer } from './media';
import { membershipReducer } from './membership';
import { participationReducer } from './participation';
import { podcastsReducer } from './podcasts';
import { savedArticlesReducer } from './savedArticles';
import { settingsReducer } from './settings';
import { videoReducer } from './video';

/**
 * Puts every slice back to its initial value.
 *
 * The per-slice `resetForDemo` and `reset` actions stay: they are the product's
 * demo reset, and they are deliberate about what they do NOT touch. This one is
 * the blunt version, for a test that wants a clean tree without rebuilding the
 * store — and it works by handing `undefined` to the combined reducer, which is
 * how Redux asks every slice for its own initial state.
 */
export const resetStore = createAction('app/reset');

const combined = combineReducers({
  settings: settingsReducer,
  membership: membershipReducer,
  savedArticles: savedArticlesReducer,
  interests: interestsReducer,
  participation: participationReducer,
  feeds: feedsReducer,
  media: mediaReducer,
  podcasts: podcastsReducer,
  audio: audioReducer,
  video: videoReducer,
});

const rootReducer: typeof combined = (state, action) =>
  combined(resetStore.match(action) ? undefined : state, action);

/**
 * One Redux store for the whole core.
 *
 * What used to be ten independent observable stores is ten slices of one state
 * tree. The slice files kept their names and their public shape — the state
 * interfaces, the pure selectors and the German copy are unchanged — so the only
 * thing that moved is who owns the transition: a reducer now, not a closure over
 * `set`.
 *
 * ## Why the store is constructed here and not by the host
 *
 * The host still binds its own reactivity (`react-redux` in the app), but the
 * store itself is the core's, for the same reason the stores were: a module that
 * wants to read state — `media/exclusive-playback.ts`, the audio watchdog — must
 * reach the same instance the screens are subscribed to. `createAppStore()` is
 * exported beside it so a test can build a fresh, isolated tree.
 *
 * ## The two dev-mode checks stay on
 *
 * RTK's serializable and immutability checks run on every dispatch, and this app
 * dispatches an audio position tick twice a second against a state tree that also
 * holds a few hundred feed items. That is the usual reason to switch them off.
 * They stay on because they earn it here: the feed and podcast cascades hand
 * bundled snapshots straight into state, and a reducer mutating one of those
 * generated constants would corrupt the offline bundle for the rest of the
 * session. Both checks are development-only and cost nothing in a release build.
 */
export function createAppStore() {
  return configureStore({
    reducer: rootReducer,
  });
}

export const store = createAppStore();

export type AppStore = ReturnType<typeof createAppStore>;
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];

/**
 * The return type of every async action in this core.
 *
 * These are plain thunks rather than `createAsyncThunk`, and that is deliberate.
 * `createAsyncThunk`'s value is the pending/fulfilled/rejected triple, and not one
 * of these cascades wants it: `feeds.fetch` shows stale items *while* loading,
 * `podcasts.fetchAll` decides between `ready`, `partial` and `offline` after the
 * fact, and `media.fetch` only enters `loading` when it has nothing to show. They
 * set their own status at their own moments, which is exactly what a plain thunk
 * is for. Multi-argument actions also stay multi-argument this way.
 */
export type AppThunk<R = void> = ThunkAction<R, RootState, undefined, UnknownAction>;
