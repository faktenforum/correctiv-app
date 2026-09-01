import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import { fetchRadioStatus, type RadioStatus } from '../services/radio.service';
import type { AppThunk } from './store';

/**
 * What is on air, as opposed to what this app is playing.
 *
 * Those are two different facts and they live in two different slices. `audio`
 * holds our own player: loading, playing, position, which track. This holds the
 * station: whether a source is connected, how many people are listening, and the
 * title Icecast is announcing. The second is true whether or not the reader ever
 * presses play, which is why it cannot be a field on the first.
 *
 * **It does not poll.** A slice that schedules its own interval keeps the runtime
 * awake for as long as the app lives, and no screen here needs second-by-second
 * accuracy; the Mediathek banner is read once when the screen opens. `fetch` takes
 * `force` so that a caller with a reason — a pull-to-refresh, the moment playback
 * starts — can ask again, and nothing asks on a timer.
 */
export type RadioStatusState = 'idle' | 'loading' | 'ready' | 'unknown';

export interface RadioState {
  status: RadioStatusState;
  /** Null until the first successful read. */
  station: RadioStatus | null;
}

const initialState: RadioState = { status: 'idle', station: null };

/**
 * What the banner should print under „Salon5 Radio“.
 *
 * `null` means "say what you would have said anyway": the caller keeps its own
 * fixed subtitle rather than showing an empty line, because a banner with a blank
 * second row looks broken while a slightly generic one does not.
 */
export function nowPlayingLine(state: RadioState): string | null {
  if (state.status !== 'ready' || !state.station?.online) return null;
  return state.station.nowPlaying;
}

const slice = createSlice({
  name: 'radio',
  initialState,
  reducers: {
    statusChanged(state, action: PayloadAction<RadioStatusState>) {
      state.status = action.payload;
    },
    loaded(state, action: PayloadAction<RadioStatus>) {
      state.station = action.payload;
      state.status = 'ready';
    },
  },
});

export const radioReducer = slice.reducer;
export const { statusChanged, loaded } = slice.actions;

/**
 * Read the station status once.
 *
 * A failure lands on `'unknown'` and not on `'error'`, and the distinction is the
 * whole point of this slice: not reaching the status document says nothing about
 * whether the stream plays. The banner must not turn into „nicht erreichbar“
 * because a JSON endpoint timed out — that verdict belongs to the player, which
 * finds out by trying.
 */
export const fetchStatus =
  (options: { force?: boolean } = {}): AppThunk<Promise<void>> =>
  async (dispatch, getState) => {
    const current = getState().radio;
    if (!options.force && current.status !== 'idle') return;

    dispatch(statusChanged('loading'));
    try {
      dispatch(loaded(await fetchRadioStatus()));
    } catch (err) {
      console.warn('Radio status unavailable:', err instanceof Error ? err.message : err);
      dispatch(statusChanged('unknown'));
    }
  };

export const radioActions = { ...slice.actions, fetchStatus };
