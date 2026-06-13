import { defineStore } from 'pinia';
import type { Video } from '../types/models';
import { fetchVideoDetail } from '../services/peertube.service';

export type VideoStatus = 'idle' | 'loading' | 'ready' | 'error';

/**
 * The persistent video session (PeerTube native player). Mirrors the audio
 * store's role: one active item that survives tab navigation. The player UI
 * (UnifiedPlayer.vue) lives in AppShell Row 1, so the native video surface is
 * never re-parented — it only resizes between the collapsed bar and the
 * expanded player.
 *
 * Audio and video coordinate: starting one stops the other (single player).
 */
export const useVideoStore = defineStore('video', {
  state: () => ({
    current: null as Video | null,
    hlsUrl: '',
    status: 'idle' as VideoStatus,
    expanded: false,
  }),
  getters: {
    isActive: (s) => s.current !== null,
  },
  actions: {
    async play(video: Video) {
      // Coordinate: stop audio so only one medium plays at a time.
      const { useAudioStore } = await import('./audio');
      useAudioStore().stop();

      this.current = video;
      this.expanded = true;
      this.hlsUrl = video.hlsMasterUrl ?? '';
      if (this.hlsUrl) {
        this.status = 'ready';
        return;
      }
      // The list payload has no stream URL — resolve the HLS master on open.
      this.status = 'loading';
      try {
        const detail = await fetchVideoDetail(video.id);
        if (this.current?.id !== video.id) return; // superseded while loading
        this.hlsUrl = detail.hlsMasterUrl ?? '';
        this.status = this.hlsUrl ? 'ready' : 'error';
      } catch (err) {
        this.status = 'error';
        console.error('PeerTube detail failed:', err instanceof Error ? err.message : err);
      }
    },

    expand() {
      this.expanded = true;
    },
    collapse() {
      this.expanded = false;
    },
    close() {
      this.current = null;
      this.hlsUrl = '';
      this.status = 'idle';
      this.expanded = false;
    },
  },
});
