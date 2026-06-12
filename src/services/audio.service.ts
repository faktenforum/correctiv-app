import { TNSPlayer } from '@nativescript-community/audio';

/**
 * Singleton um TNSPlayer (Android: android.media.MediaPlayer — streamt den
 * Icecast-MP3 direkt; iOS: AVAudioPlayer — kann KEINE Live-Streams, dort
 * bräuchte es einen AVPlayer-Wrapper; dokumentierte Lücke der iOS-Schiene).
 * Kennt kein UI und kein Pinia — der audio-Store bindet die Callbacks.
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
    // iOS-theoretisch: Playback-Kategorie, damit Audio im Hintergrund weiterläuft
    sessionCategory: 'AVAudioSessionCategoryPlayback',
    completeCallback: () => callbacks.onComplete?.(),
    errorCallback: (args: unknown) => callbacks.onError?.(String((args as { error?: unknown })?.error ?? args)),
  });
}

/** Gebündelte Datei aus dem App-Ordner (Sample-Episoden) abspielen. */
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

/** Aktuelle Position in Sekunden (Android MediaPlayer liefert ms, iOS s). */
export function currentTimeSec(): number {
  if (!player) return 0;
  return __ANDROID__ ? player.currentTime / 1000 : player.currentTime;
}

export function durationSec(): number {
  if (!player) return 0;
  return __ANDROID__ ? player.duration / 1000 : player.duration;
}
