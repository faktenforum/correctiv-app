import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import { stopOtherMedia } from '../media/exclusive-playback';
import { fetchVideoDetail } from '../services/peertube.service';
import type { Video } from '../types/models';
import type { AppThunk } from './store';

export type VideoStatus = 'idle' | 'loading' | 'ready' | 'error';

/**
 * The persistent video session (PeerTube native player). Mirrors the audio
 * slice's role: one active item that survives tab navigation. The player UI
 * lives above the tab frames, so the native video surface is never re-parented —
 * it only resizes between the collapsed bar and the expanded player.
 *
 * Audio and video coordinate: starting one stops the other (single player).
 */
export interface VideoState {
  current: Video | null;
  hlsUrl: string;
  status: VideoStatus;
  expanded: boolean;
}

const initialState: VideoState = {
  current: null,
  hlsUrl: '',
  status: 'idle',
  expanded: false,
};

/** Pure selector — see the note in stores/interests.ts for why not part of the slice. */
export function isActive(state: VideoState): boolean {
  return state.current !== null;
}

const slice = createSlice({
  name: 'video',
  initialState,
  reducers: {
    opened(state, action: PayloadAction<Video>) {
      state.current = action.payload;
      state.expanded = true;
      state.hlsUrl = action.payload.hlsMasterUrl ?? '';
    },
    statusChanged(state, action: PayloadAction<VideoStatus>) {
      state.status = action.payload;
    },
    resolved(state, action: PayloadAction<string>) {
      state.hlsUrl = action.payload;
      state.status = action.payload ? 'ready' : 'error';
    },
    expand(state) {
      state.expanded = true;
    },
    collapse(state) {
      state.expanded = false;
    },
    close() {
      return initialState;
    },
  },
});

export const videoReducer = slice.reducer;
export const { expand, collapse, close, opened, statusChanged, resolved } = slice.actions;

/** Opens a video, resolving its HLS master where the source has one. */
export const play =
  (video: Video): AppThunk<Promise<void>> =>
  async (dispatch, getState) => {
    // Coordinate: only one medium plays at a time.
    stopOtherMedia('video');

    dispatch(opened(video));
    if (getState().video.hlsUrl) {
      dispatch(statusChanged('ready'));
      return;
    }
    /**
     * Only PeerTube has an HLS master to resolve. A YouTube item plays in an
     * embed and carries no stream URL at all, so asking the PeerTube API for its
     * id is a guaranteed 404 — one that would land as `status: 'error'` and look
     * like the video was broken.
     */
    if (video.source !== 'peertube') {
      dispatch(statusChanged('ready'));
      return;
    }
    // The list payload has no stream URL — resolve the HLS master on open.
    dispatch(statusChanged('loading'));
    try {
      const detail = await fetchVideoDetail(video.id);
      if (getState().video.current?.id !== video.id) return; // superseded while loading
      dispatch(resolved(detail.hlsMasterUrl ?? ''));
    } catch (err) {
      dispatch(statusChanged('error'));
      console.error('PeerTube detail failed:', err instanceof Error ? err.message : err);
    }
  };

export const videoActions = { ...slice.actions, play };
