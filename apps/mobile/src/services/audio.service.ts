import { TNSPlayer } from '@nativescript-community/audio';

/**
 * Singleton around TNSPlayer (Android: android.media.MediaPlayer — streams the
 * Icecast MP3 directly; iOS: AVAudioPlayer — CANNOT play live streams, an
 * AVPlayer wrapper would be needed there; documented gap of the iOS track).
 * Knows no UI and no Pinia — the audio store binds the callbacks.
 */

export interface AudioServiceCallbacks {
  onComplete?: () => void;
  onError?: (message: string) => void;
}

let player: TNSPlayer | null = null;

function getPlayer(): TNSPlayer {
  if (!player) {
    player = new TNSPlayer();
  }
  return player;
}

export async function playUrl(url: string, callbacks: AudioServiceCallbacks = {}): Promise<void> {
  const p = getPlayer();
  await p.stop().catch(() => undefined);
  await p.playFromUrl({
    audioFile: url,
    loop: false,
    autoPlay: true,
    // iOS in theory: playback category so audio keeps playing in the background
    sessionCategory: 'AVAudioSessionCategoryPlayback',
    completeCallback: () => callbacks.onComplete?.(),
    errorCallback: (args: unknown) => callbacks.onError?.(String((args as { error?: unknown })?.error ?? args)),
  });
}

/** Play a bundled file from the app folder (sample episodes). */
export async function playFile(path: string, callbacks: AudioServiceCallbacks = {}): Promise<void> {
  const p = getPlayer();
  await p.stop().catch(() => undefined);
  await p.playFromFile({
    audioFile: path,
    loop: false,
    autoPlay: true,
    sessionCategory: 'AVAudioSessionCategoryPlayback',
    completeCallback: () => callbacks.onComplete?.(),
    errorCallback: (args: unknown) => callbacks.onError?.(String((args as { error?: unknown })?.error ?? args)),
  });
}

export async function pause(): Promise<void> {
  await getPlayer().pause();
}

export function resume(): void {
  getPlayer().resume();
}

export async function stop(): Promise<void> {
  await getPlayer().stop().catch(() => undefined);
}

export async function seekTo(seconds: number): Promise<void> {
  await getPlayer().seekTo(seconds);
}

export function setSpeed(speed: number): void {
  getPlayer().changePlayerSpeed(speed);
}

export function isPlaying(): boolean {
  return player?.isAudioPlaying() ?? false;
}

/** Current position in seconds (Android MediaPlayer returns ms, iOS s). */
export function currentTimeSec(): number {
  if (!player) return 0;
  return __ANDROID__ ? player.currentTime / 1000 : player.currentTime;
}

export function durationSec(): number {
  if (!player) return 0;
  return __ANDROID__ ? player.duration / 1000 : player.duration;
}
