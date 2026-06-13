import { defineStore } from 'pinia';
import { knownFolders, path } from '@nativescript/core';
import type { AudioTrack } from '../types/models';
import { RADIO_STREAM_URL } from '../data/feeds.config';
import * as audio from '../services/audio.service';

export type PlayerStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'error';

/** 60-second preview for club bonus content (invitation, never a lock). */
export const PREVIEW_LIMIT_SEC = 60;

let progressTimer: ReturnType<typeof setInterval> | null = null;
let loadingWatchdog: ReturnType<typeof setTimeout> | null = null;

/** MediaPlayer sometimes reports network errors not at all or very late — watchdog needed. */
const LOADING_TIMEOUT_MS = 15000;

export const useAudioStore = defineStore('audio', {
  state: () => ({
    track: null as AudioTrack | null,
    status: 'idle' as PlayerStatus,
    positionSec: 0,
    durationSec: 0,
    speed: 1,
    errorMessage: null as string | null,
    /** set when the 60s preview has run out → ClubInviteSheet */
    previewEnded: false,
  }),
  getters: {
    isLive: (state) => state.track?.kind === 'radio',
    // Stays visible in the error state so the user sees the failure message
    isActive: (state) => state.track !== null,
  },
  actions: {
    async playRadio() {
      await this._start(
        {
          kind: 'radio',
          title: 'Salon5 Radio',
          subtitle: '● LIVE — 24/7 aus Bottrop',
          url: RADIO_STREAM_URL,
        },
        () => audio.playUrl(RADIO_STREAM_URL, this._callbacks()),
      );
    },

    async playEpisode(track: Omit<AudioTrack, 'kind'> & { kind?: AudioTrack['kind'] }) {
      const fullTrack: AudioTrack = { ...track, kind: track.kind ?? 'episode' };
      const play = fullTrack.url.startsWith('http')
        ? () => audio.playUrl(fullTrack.url, this._callbacks())
        : () =>
            audio.playFile(
              path.join(knownFolders.currentApp().path, fullTrack.url),
              this._callbacks(),
            );
      await this._start(fullTrack, play);
    },

    /** Bonus content as a 60s preview (for non-members). */
    async playPreview(track: Omit<AudioTrack, 'kind'>) {
      await this.playEpisode({ ...track, kind: 'preview' });
    },

    async togglePlay() {
      if (!this.track) return;
      if (this.status === 'playing') {
        await audio.pause();
        this.status = 'paused';
      } else if (this.status === 'paused') {
        audio.resume();
        this.status = 'playing';
      }
    },

    async seekTo(seconds: number) {
      if (!this.track || this.isLive) return;
      // Does the Android MediaPlayer expect ms in the plugin? seekTo takes seconds per the API
      await audio.seekTo(seconds);
      this.positionSec = seconds;
    },

    setSpeed(speed: number) {
      this.speed = speed;
      audio.setSpeed(speed);
    },

    async stop() {
      await audio.stop();
      this._clearTimer();
      this.track = null;
      this.status = 'idle';
      this.positionSec = 0;
      this.durationSec = 0;
      this.previewEnded = false;
    },

    acknowledgePreviewEnd() {
      this.previewEnded = false;
    },

    async _start(track: AudioTrack, play: () => Promise<void>) {
      // Coordinate: stop any video so only one medium plays at a time.
      const { useVideoStore } = await import('./video');
      useVideoStore().close();
      this._clearTimer();
      this.track = track;
      this.status = 'loading';
      this.errorMessage = null;
      this.previewEnded = false;
      this.positionSec = 0;
      this.durationSec = 0;
      this.speed = 1;
      if (loadingWatchdog) clearTimeout(loadingWatchdog);
      loadingWatchdog = setTimeout(() => {
        if (this.status === 'loading') {
          audio.stop();
          this.status = 'error';
          this.errorMessage =
            'Keine Verbindung zum Stream. Prüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.';
        }
      }, LOADING_TIMEOUT_MS);
      try {
        await play();
        if (this.status !== 'loading') return; // watchdog has already aborted
        if (loadingWatchdog) clearTimeout(loadingWatchdog);
        this.status = 'playing';
        this._startTimer();
      } catch (err) {
        this.status = 'error';
        this.errorMessage =
          'Wiedergabe nicht möglich. Prüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.';
        console.error('Audio start failed:', err);
      }
    },

    _callbacks() {
      return {
        onComplete: () => {
          this._clearTimer();
          this.status = 'idle';
          this.positionSec = 0;
        },
        onError: (message: string) => {
          this._clearTimer();
          this.status = 'error';
          this.errorMessage =
            'Wiedergabe unterbrochen. Prüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.';
          console.error('Audio error:', message);
        },
      };
    },

    _startTimer() {
      this._clearTimer();
      let maxPos = 0;
      progressTimer = setInterval(() => {
        if (this.status !== 'playing') return;
        const pos = audio.currentTimeSec();
        // MediaPlayer sometimes resets to 0 on completion without firing the
        // complete callback — detect the position regression and finish cleanly.
        if (!this.isLive && maxPos > 5 && pos < 1) {
          this._clearTimer();
          this.status = 'idle';
          this.positionSec = 0;
          return;
        }
        maxPos = Math.max(maxPos, pos);
        this.positionSec = pos;
        this.durationSec = audio.durationSec();
        if (
          this.track?.kind === 'preview' &&
          this.positionSec >= PREVIEW_LIMIT_SEC &&
          !this.previewEnded
        ) {
          audio.pause();
          this.status = 'paused';
          this.previewEnded = true; // ClubInviteSheet is opened in the UI
        }
      }, 1000);
    },

    _clearTimer() {
      if (progressTimer) {
        clearInterval(progressTimer);
        progressTimer = null;
      }
      if (loadingWatchdog) {
        clearTimeout(loadingWatchdog);
        loadingWatchdog = null;
      }
    },
  },
});
