import {
  createAudioPlayer,
  type AudioPlayer as ExpoAudioPlayer,
  type AudioStatus,
} from 'expo-audio';

import type { AudioBackend, NowPlaying, PlaybackStatus } from '@correctiv/app-core';

import { ensureAudioMode } from './setup';
import { toAudioSource } from './sources';

/**
 * The Expo audio backend: expo-audio translated into the core's `AudioBackend`
 * port. The state machine on the other side of that port lives in
 * `@correctiv/app-core/stores/audio`, where any host can share it.
 *
 * Deliberately `createAudioPlayer` and NOT the `useAudioPlayer` hook: the hook
 * ties the player instance to a component's lifetime and releases it on unmount.
 * That is exactly what must not happen — playback has to survive navigation, tab
 * changes and the background. So the instance lives in this module and React only
 * ever subscribes to the store.
 */

let player: ExpoAudioPlayer | null = null;
let listener: ((status: PlaybackStatus) => void) | null = null;

function instance(): ExpoAudioPlayer {
  if (!player) {
    player = createAudioPlayer(null, { updateInterval: 500 });
    player.addListener('playbackStatusUpdate', (status: AudioStatus) => {
      listener?.({
        playing: status.playing,
        loaded: status.isLoaded,
        buffering: status.isBuffering,
        positionSec: status.currentTime,
        durationSec: status.duration,
        finished: status.didJustFinish,
        live: status.isLive,
        error: status.error,
      });
    });
  }
  return player;
}

export const expoAudio: AudioBackend = {
  async load(url, nowPlaying: NowPlaying) {
    await ensureAudioMode();
    const active = instance();
    active.replace(toAudioSource(url));
    // Lock screen / notification. Needs `interruptionMode: 'doNotMix'`, which
    // ensureAudioMode sets — without it the OS does not attach the controls to us.
    active.setActiveForLockScreen(true, {
      title: nowPlaying.title,
      artist: nowPlaying.artist,
      artworkUrl: nowPlaying.artworkUrl,
    });
  },

  play() {
    instance().play();
  },

  pause() {
    player?.pause();
  },

  async seekTo(seconds) {
    await instance().seekTo(seconds);
  },

  setRate(rate) {
    player?.setPlaybackRate(rate);
  },

  release() {
    if (!player) return;
    player.pause();
    player.clearLockScreenControls();
    // Drop the source, or a paused live stream keeps buffering.
    player.replace(null);
  },

  onStatus(next) {
    listener = next;
  },
};

/** Tests only: throws away the instance so the next load builds a fresh one. */
export function resetExpoAudio(): void {
  player?.remove();
  player = null;
  listener = null;
}
