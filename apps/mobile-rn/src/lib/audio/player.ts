import { createAudioPlayer, type AudioPlayer, type AudioStatus } from 'expo-audio';
import { createStore } from 'zustand/vanilla';

import { RADIO_STREAM_URL } from '@correctiv/app-core/data/feeds.config';
import { stopOtherMedia } from '@correctiv/app-core/media/exclusive-playback';
import type { AudioTrack } from '@correctiv/app-core/types/models';

import { ensureAudioMode } from './setup';
import { toAudioSource } from './sources';

/**
 * The app's ONE audio player.
 *
 * Deliberately `createAudioPlayer` and NOT the `useAudioPlayer` hook: the hook ties
 * the player instance to a component's lifetime and releases it on unmount. That is
 * exactly what must not happen here — playback has to survive navigation, tab
 * changes and the background. So the instance lives in the module and React only
 * subscribes to the state.
 *
 * The NativeScript build needed two workarounds here that are gone: detecting a
 * position regression (Android's MediaPlayer jumped to 0 on completion without
 * firing the complete callback) and a one-second timer polling the position.
 * expo-audio reports `didJustFinish`, `isLoaded`, `isBuffering` and `error` itself.
 */

export type PlayerStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'error';

/** Club bonus for non-members: 60 seconds. An invitation, not a lock. */
export const PREVIEW_LIMIT_SEC = 60;

/**
 * expo-audio does report errors through `status.error`, but the lesson from the
 * NativeScript build was that network errors sometimes never arrive at all — and an
 * endless spinner is the worst answer available. Hence a watchdog.
 */
const LOADING_TIMEOUT_MS = 12000;

/**
 * User-facing copy stays GERMAN, in the formal register — it is product voice, not
 * code. Same for the two `fail(...)` messages below.
 */
const NETWORK_HINT = 'Prüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.';

export interface AudioState {
  track: AudioTrack | null;
  status: PlayerStatus;
  positionSec: number;
  /** 0 for live streams — Icecast has no length. */
  durationSec: number;
  /** Playback rate; in state because the full player displays it. */
  speed: number;
  /** Set once the 60-second preview has run out (→ club invitation). */
  previewEnded: boolean;
  errorMessage: string | null;
}

const IDLE: AudioState = {
  track: null,
  status: 'idle',
  positionSec: 0,
  durationSec: 0,
  speed: 1,
  previewEnded: false,
  errorMessage: null,
};

export const audioStore = createStore<AudioState>(() => ({ ...IDLE }));

/** Pure selectors — live playback has neither a length nor a position. */
export function isLive(state: Pick<AudioState, 'track'>): boolean {
  return state.track?.kind === 'radio';
}
export function isActive(state: Pick<AudioState, 'track'>): boolean {
  return state.track !== null;
}

// --- the player instance ------------------------------------------------------

let player: AudioPlayer | null = null;
let watchdog: ReturnType<typeof setTimeout> | null = null;

function ensurePlayer(): AudioPlayer {
  if (!player) {
    player = createAudioPlayer(null, { updateInterval: 500 });
    player.addListener('playbackStatusUpdate', onStatus);
  }
  return player;
}

function clearWatchdog(): void {
  if (watchdog) {
    clearTimeout(watchdog);
    watchdog = null;
  }
}

function fail(message: string): void {
  clearWatchdog();
  player?.pause();
  audioStore.setState({ status: 'error', errorMessage: message });
}

function onStatus(status: AudioStatus): void {
  const { track, previewEnded, status: current } = audioStore.getState();
  if (!track) return; // stopped — ignore trailing updates

  if (status.error) {
    console.warn('[audio] playback error:', status.error);
    fail(`Wiedergabe unterbrochen. ${NETWORK_HINT}`);
    return;
  }

  /**
   * An error stays until a new start clears it.
   *
   * Without this line the next status tick flips the display back to "loading":
   * `status.error` is null again and `isLoaded` is still false, so the mapping below
   * resolves to `loading`. The result is precisely the endless spinner the watchdog
   * exists to prevent — seen on a device when the Icecast stream failed its TLS
   * handshake and the mini bar then sat on "Lädt …" unchanged.
   */
  if (current === 'error') return;

  // The preview gate. Has to apply BEFORE the normal state mapping, or the episode
  // keeps playing while the invitation is shown.
  if (track.kind === 'preview' && status.currentTime >= PREVIEW_LIMIT_SEC) {
    player?.pause();
    audioStore.setState({
      status: 'paused',
      positionSec: PREVIEW_LIMIT_SEC,
      durationSec: status.duration,
      previewEnded: true,
    });
    return;
  }

  if (status.isLoaded) clearWatchdog();

  if (status.didJustFinish) {
    audioStore.setState({ status: 'paused', positionSec: 0 });
    return;
  }

  audioStore.setState({
    status: status.playing
      ? 'playing'
      : !status.isLoaded || status.isBuffering
        ? 'loading'
        : 'paused',
    positionSec: status.currentTime,
    durationSec: status.isLive ? 0 : status.duration,
    // A new run after the preview resets the flag in `start`; pass it through here
    // so the invitation does not reopen on every status tick.
    previewEnded,
  });
}

// --- actions -----------------------------------------------------------------

async function start(track: AudioTrack): Promise<void> {
  // Coordinate: only one medium plays at a time.
  stopOtherMedia('audio');
  clearWatchdog();
  audioStore.setState({ ...IDLE, track, status: 'loading' });

  try {
    await ensureAudioMode();
    const active = ensurePlayer();
    active.replace(toAudioSource(track.url));
    active.play();
    // Lock screen / notification. Needs `interruptionMode: 'doNotMix'`, which
    // ensureAudioMode sets — without it the OS does not attach the controls to us.
    active.setActiveForLockScreen(true, {
      title: track.title,
      artist: track.subtitle ?? 'CORRECTIV',
      artworkUrl: track.artworkUrl,
    });
  } catch (err) {
    console.warn('[audio] start failed:', err);
    fail(`Wiedergabe nicht möglich. ${NETWORK_HINT}`);
    return;
  }

  watchdog = setTimeout(() => {
    if (audioStore.getState().status === 'loading') {
      fail(`Keine Verbindung zum Stream. ${NETWORK_HINT}`);
    }
  }, LOADING_TIMEOUT_MS);
}

/** The Salon5 live stream (Icecast). */
export function playRadio(): Promise<void> {
  return start({
    kind: 'radio',
    title: 'Salon5 Radio',
    subtitle: '● LIVE — 24/7 aus Bottrop',
    url: RADIO_STREAM_URL,
  });
}

/** A podcast episode or bonus audio, in full. */
export function playEpisode(track: Omit<AudioTrack, 'kind'>): Promise<void> {
  return start({ ...track, kind: 'episode' });
}

/** The same as a 60-second preview (non-members, club content). */
export function playPreview(track: Omit<AudioTrack, 'kind'>): Promise<void> {
  return start({ ...track, kind: 'preview' });
}

/**
 * Play/pause.
 *
 * Special case, the preview: past the 60-second mark it does not resume but shows
 * the invitation again. The NativeScript build had a hole here — its limit fired
 * once (`!this.previewEnded`), and a second tap on play then ran the episode to the
 * end and gave away club content.
 */
export function togglePlay(): void {
  const state = audioStore.getState();
  if (!state.track || !player) return;

  if (state.status === 'playing') {
    player.pause();
    audioStore.setState({ status: 'paused' });
    return;
  }
  if (state.track.kind === 'preview' && state.positionSec >= PREVIEW_LIMIT_SEC) {
    audioStore.setState({ previewEnded: true });
    return;
  }
  player.play();
}

export async function seekTo(seconds: number): Promise<void> {
  const state = audioStore.getState();
  if (!player || !state.track || isLive(state)) return;
  await player.seekTo(Math.max(0, seconds));
  audioStore.setState({ positionSec: seconds });
}

export function setSpeed(rate: number): void {
  player?.setPlaybackRate(rate);
  audioStore.setState({ speed: rate });
}

export function stop(): void {
  clearWatchdog();
  if (player) {
    player.pause();
    player.clearLockScreenControls();
    // Release the source, or a paused live stream keeps buffering.
    player.replace(null);
  }
  audioStore.setState({ ...IDLE });
}

/** The club invitation has been seen — clear the flag, keep the track loaded. */
export function acknowledgePreviewEnd(): void {
  audioStore.setState({ previewEnded: false });
}

/** Tests only: reset the instance and the state. */
export function resetAudioForTests(): void {
  clearWatchdog();
  player?.remove();
  player = null;
  audioStore.setState({ ...IDLE });
}
