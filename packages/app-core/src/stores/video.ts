import { createStore } from './create-store';
import type { Video } from '../types/models';
import { fetchVideoDetail } from '../services/peertube.service';
import { stopOtherMedia } from '../media/exclusive-playback';

export type VideoStatus = 'idle' | 'loading' | 'ready' | 'error';

/**
 * The persistent video session (PeerTube native player). Mirrors the audio
 * store's role: one active item that survives tab navigation. The player UI
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

  play: (video: Video) => Promise<void>;
  expand: () => void;
  collapse: () => void;
  close: () => void;
}

/** Pure selector — see the note in stores/interests.ts for why not a method. */
export function isActive(state: Pick<VideoState, 'current'>): boolean {
  return state.current !== null;
}

export const videoStore = createStore<VideoState>((set, get) => ({
  current: null,
  hlsUrl: '',
  status: 'idle',
  expanded: false,

  play: async (video) => {
    // Coordinate: only one medium plays at a time.
    stopOtherMedia('video');

    set({ current: video, expanded: true, hlsUrl: video.hlsMasterUrl ?? '' });
    if (get().hlsUrl) {
      set({ status: 'ready' });
      return;
    }
    /**
     * Only PeerTube has an HLS master to resolve. A YouTube item plays in an
     * embed and carries no stream URL at all, so asking the PeerTube API for its
     * id is a guaranteed 404 — one that would land as `status: 'error'` and look
     * like the video was broken.
     */
    if (video.source !== 'peertube') {
      set({ status: 'ready' });
      return;
    }
    // The list payload has no stream URL — resolve the HLS master on open.
    set({ status: 'loading' });
    try {
      const detail = await fetchVideoDetail(video.id);
      if (get().current?.id !== video.id) return; // superseded while loading
      const hlsUrl = detail.hlsMasterUrl ?? '';
      set({ hlsUrl, status: hlsUrl ? 'ready' : 'error' });
    } catch (err) {
      set({ status: 'error' });
      console.error('PeerTube detail failed:', err instanceof Error ? err.message : err);
    }
  },

  expand: () => set({ expanded: true }),
  collapse: () => set({ expanded: false }),
  close: () => set({ current: null, hlsUrl: '', status: 'idle', expanded: false }),
}));
