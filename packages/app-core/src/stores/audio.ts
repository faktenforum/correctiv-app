import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import { RADIO_STREAM_URL } from '../data/feeds.config';
import { stopOtherMedia } from '../media/exclusive-playback';
import { platform, type AudioBackend, type PlaybackStatus } from '../ports';
import type { AudioTrack } from '../types/models';
import type { AppDispatch, AppThunk, RootState } from './store';

/**
 * The player's state machine.
 *
 * Everything platform-specific sits behind `AudioBackend` (`ports/index.ts`),
 * which each host implements over its own SDK.
 *
 * There is no length limit on club content: bonus episodes play in full for
 * everyone. Both apps used to stop a non-member at 60 seconds and offer the club —
 * dropped on 2026-08-06, which also puts audio in line with "closeness, not a
 * paywall". The `CLUB` badge stays as a label; it no longer withholds anything.
 *
 * An error state is sticky until the next start. Without that, the following
 * status tick — no error, not loaded yet — maps straight back to "loading", which
 * is exactly the endless spinner the watchdog exists to prevent.
 */

export type PlayerStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'error';

/**
 * Both SDKs report playback errors — and on both, a network failure sometimes
 * never arrives at all. An endless spinner is the worst available answer, so a
 * timer decides when to stop believing in the stream.
 */
const LOADING_TIMEOUT_MS = 12000;

/** User-facing copy stays German, in the formal register: this is product voice. */
const NETWORK_HINT = 'Prüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.';

export interface AudioState {
  track: AudioTrack | null;
  status: PlayerStatus;
  positionSec: number;
  /** 0 for live streams — Icecast has no length. */
  durationSec: number;
  /** Playback rate; in state because the full player shows it. */
  speed: number;
  errorMessage: string | null;
}

const IDLE: AudioState = {
  track: null,
  status: 'idle',
  positionSec: 0,
  durationSec: 0,
  speed: 1,
  errorMessage: null,
};

/** Pure selectors — live playback has neither a length nor a position. */
export function isLive(state: Pick<AudioState, 'track'>): boolean {
  return state.track?.kind === 'radio';
}
export function isActive(state: Pick<AudioState, 'track'>): boolean {
  return state.track !== null;
}

const slice = createSlice({
  name: 'audio',
  initialState: IDLE,
  reducers: {
    started(state, action: PayloadAction<AudioTrack>) {
      Object.assign(state, IDLE, { track: action.payload, status: 'loading' });
    },
    failed(state, action: PayloadAction<string>) {
      state.status = 'error';
      state.errorMessage = action.payload;
    },
    tick(
      state,
      action: PayloadAction<{ status: PlayerStatus; positionSec: number; durationSec: number }>,
    ) {
      state.status = action.payload.status;
      state.positionSec = action.payload.positionSec;
      state.durationSec = action.payload.durationSec;
    },
    finished(state) {
      state.status = 'paused';
      state.positionSec = 0;
    },
    paused(state) {
      state.status = 'paused';
    },
    positionSet(state, action: PayloadAction<number>) {
      state.positionSec = action.payload;
    },
    speedSet(state, action: PayloadAction<number>) {
      state.speed = action.payload;
    },
    stopped() {
      return IDLE;
    },
  },
});

export const audioReducer = slice.reducer;
export const { started, failed, tick, finished, paused, positionSet, speedSet, stopped } =
  slice.actions;

// --- the imperative half: watchdog and backend listener ----------------------

let watchdog: ReturnType<typeof setTimeout> | null = null;
/** The backend the status listener is attached to, so it is attached exactly once. */
let listening: AudioBackend | null = null;

function clearWatchdog(): void {
  if (watchdog) {
    clearTimeout(watchdog);
    watchdog = null;
  }
}

function fail(dispatch: AppDispatch, message: string): void {
  clearWatchdog();
  // State first, command second: a backend that emits from `pause()` re-enters
  // the status handler, and it has to find the new state when it does. See the
  // note on `AudioBackend` in ports/index.ts.
  dispatch(failed(message));
  platform().audio?.pause();
}

function onStatus(dispatch: AppDispatch, getState: () => RootState, status: PlaybackStatus): void {
  const state = getState().audio;
  if (!state.track) return; // stopped — ignore trailing updates

  /**
   * An error stays until the next start clears it, and this guard comes FIRST.
   *
   * Two reasons, both learned the hard way. A tick that merely looks unloaded
   * would otherwise map back to "loading" — the endless spinner the watchdog
   * exists to prevent. And `fail()` above calls `AudioBackend.pause()`: a backend
   * that reports back from inside that call arrives here with the same error still
   * attached, so anything after the `status.error` branch is too late to stop the
   * recursion. That was a real crash on a device, and keeping this line first is
   * what makes it structurally impossible rather than merely unlikely.
   */
  if (state.status === 'error') return;

  if (status.error) {
    console.warn('[audio] playback error:', status.error);
    fail(dispatch, `Wiedergabe unterbrochen. ${NETWORK_HINT}`);
    return;
  }

  if (status.loaded) clearWatchdog();

  if (status.finished) {
    dispatch(finished());
    return;
  }

  dispatch(
    tick({
      status: status.playing
        ? 'playing'
        : !status.loaded || status.buffering
          ? 'loading'
          : 'paused',
      positionSec: status.positionSec,
      durationSec: status.live ? 0 : status.durationSec,
    }),
  );
}

/**
 * The host may register its platform after this module is imported, so the
 * listener is attached on first use rather than at construction.
 */
function backend(dispatch: AppDispatch, getState: () => RootState): AudioBackend | null {
  const audio = platform().audio ?? null;
  if (audio && audio !== listening) {
    audio.onStatus((status) => onStatus(dispatch, getState, status));
    listening = audio;
  }
  return audio;
}

const start =
  (track: AudioTrack): AppThunk<Promise<void>> =>
  async (dispatch, getState) => {
    // Coordinate: only one medium plays at a time.
    stopOtherMedia('audio');
    clearWatchdog();
    dispatch(started(track));

    const audio = backend(dispatch, getState);
    if (!audio) {
      dispatch(failed('Auf dieser Plattform ist keine Wiedergabe möglich.'));
      return;
    }

    try {
      await audio.load(track.url, {
        title: track.title,
        artist: track.subtitle ?? 'CORRECTIV',
        artworkUrl: track.artworkUrl,
      });
      audio.play();
    } catch (err) {
      console.warn('[audio] start failed:', err);
      fail(dispatch, `Wiedergabe nicht möglich. ${NETWORK_HINT}`);
      return;
    }

    watchdog = setTimeout(() => {
      if (getState().audio.status === 'loading') {
        fail(dispatch, `Keine Verbindung zum Stream. ${NETWORK_HINT}`);
      }
    }, LOADING_TIMEOUT_MS);
  };

export const playRadio = (): AppThunk<Promise<void>> =>
  start({
    kind: 'radio',
    title: 'Salon5 Radio',
    subtitle: '● LIVE — 24/7 aus Bottrop',
    url: RADIO_STREAM_URL,
  });

export const playEpisode = (track: Omit<AudioTrack, 'kind'>): AppThunk<Promise<void>> =>
  start({ ...track, kind: 'episode' });

export const togglePlay = (): AppThunk => (dispatch, getState) => {
  const state = getState().audio;
  const audio = backend(dispatch, getState);
  if (!state.track || !audio) return;

  if (state.status === 'playing') {
    dispatch(paused());
    audio.pause();
    return;
  }
  audio.play();
};

export const seekTo =
  (seconds: number): AppThunk<Promise<void>> =>
  async (dispatch, getState) => {
    const state = getState().audio;
    const audio = backend(dispatch, getState);
    if (!audio || !state.track || isLive(state)) return;
    await audio.seekTo(Math.max(0, seconds));
    dispatch(positionSet(seconds));
  };

export const setSpeed =
  (rate: number): AppThunk =>
  (dispatch, getState) => {
    backend(dispatch, getState)?.setRate(rate);
    dispatch(speedSet(rate));
  };

export const stop = (): AppThunk => (dispatch, getState) => {
  clearWatchdog();
  backend(dispatch, getState)?.release();
  dispatch(stopped());
};

export const audioActions = {
  ...slice.actions,
  playRadio,
  playEpisode,
  togglePlay,
  seekTo,
  setSpeed,
  stop,
};

/**
 * Test helper — drops the watchdog and the listener registration.
 *
 * The state itself is reset by dispatching `stopped()`, which a test does against
 * whichever store it built.
 */
export function resetAudioController(): void {
  clearWatchdog();
  listening = null;
}
