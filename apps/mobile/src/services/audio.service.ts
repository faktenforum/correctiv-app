import { TNSPlayer } from '@nativescript-community/audio';
import { knownFolders, path } from '@nativescript/core';
import type { AudioBackend, NowPlaying, PlaybackStatus } from '@correctiv/app-core';

/**
 * The NativeScript audio backend: `TNSPlayer` translated into the core's
 * `AudioBackend` port.
 *
 * On Android that is `android.media.MediaPlayer`, which streams the Icecast MP3
 * directly. On iOS it is `AVAudioPlayer`, which **cannot play live streams** — the
 * radio needs an `AVPlayer` wrapper there. Known gap of the iOS track, unchanged
 * by this refactor.
 *
 * The port is push-based (`onStatus`) because that is how expo-audio works.
 * MediaPlayer is not, so this file polls once a second and synthesises the ticks —
 * along with the two quirks that used to live in the shared store and had no
 * business being there:
 *
 *  - positions come back in milliseconds on Android and seconds on iOS,
 *  - MediaPlayer sometimes resets the position to 0 on completion without ever
 *    calling its completion callback, so a position that regresses after real
 *    playback IS the end of the track.
 */

const POLL_MS = 1000;

let player: TNSPlayer | null = null;
let listener: ((status: PlaybackStatus) => void) | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
let live = false;
/** Highest position seen for the current track — the regression detector's baseline. */
let maxPosition = 0;
let playing = false;

function instance(): TNSPlayer {
  if (!player) player = new TNSPlayer();
  return player;
}

function positionSec(): number {
  if (!player) return 0;
  return __ANDROID__ ? player.currentTime / 1000 : player.currentTime;
}

function durationSec(): number {
  if (!player) return 0;
  const raw = __ANDROID__ ? player.duration / 1000 : player.duration;
  return Number.isFinite(raw) && raw > 0 ? raw : 0;
}

function emit(status: Partial<PlaybackStatus>): void {
  listener?.({
    playing,
    loaded: true,
    buffering: false,
    positionSec: positionSec(),
    durationSec: live ? 0 : durationSec(),
    finished: false,
    live,
    error: null,
    ...status,
  });
}

function stopTimer(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

function startTimer(): void {
  stopTimer();
  timer = setInterval(() => {
    if (!playing) return;
    const position = positionSec();
    // See the note at the top: a position that falls back to ~0 after real
    // playback is MediaPlayer's silent way of saying "finished".
    if (!live && maxPosition > 5 && position < 1) {
      playing = false;
      stopTimer();
      emit({ playing: false, finished: true, positionSec: 0 });
      return;
    }
    maxPosition = Math.max(maxPosition, position);
    emit({});
  }, POLL_MS);
}

/** A core track url → something TNSPlayer can open. */
function resolve(url: string): { kind: 'url' | 'file'; value: string } {
  if (/^https?:\/\//.test(url)) return { kind: 'url', value: url };
  return {
    kind: 'file',
    value: path.join(knownFolders.currentApp().path, url.replace(/^~\//, '')),
  };
}

function callbacks() {
  return {
    completeCallback: () => {
      playing = false;
      stopTimer();
      emit({ playing: false, finished: true, positionSec: 0 });
    },
    errorCallback: (args: unknown) => {
      playing = false;
      stopTimer();
      emit({ playing: false, error: String((args as { error?: unknown })?.error ?? args) });
    },
  };
}

export const nativeScriptAudio: AudioBackend = {
  async load(url, nowPlaying: NowPlaying) {
    const p = instance();
    await p.stop().catch(() => undefined);
    stopTimer();
    maxPosition = 0;
    playing = false;
    // Icecast has no length; asking for one and getting 0 must not read as an error.
    live = /icecast/.test(url);

    const source = resolve(url);
    const options = {
      audioFile: source.value,
      loop: false,
      // The core calls play() right after load(); autoPlay keeps MediaPlayer from
      // buffering twice.
      autoPlay: true,
      // iOS: keep playing when the app goes to the background.
      sessionCategory: 'AVAudioSessionCategoryPlayback',
      ...callbacks(),
    };
    // Lock-screen metadata: TNSPlayer offers none, so `nowPlaying` is accepted and
    // dropped here. It is not a silent gap — the Expo backend uses it, and this is
    // the one place that says NativeScript cannot. See adr/0005.
    void nowPlaying;

    if (source.kind === 'url') await p.playFromUrl(options);
    else await p.playFromFile(options);

    playing = true;
    emit({});
    startTimer();
  },

  play() {
    instance().resume();
    playing = true;
    emit({});
    startTimer();
  },

  pause() {
    void instance().pause();
    playing = false;
    stopTimer();
    emit({ playing: false });
  },

  async seekTo(seconds) {
    await instance().seekTo(seconds);
    maxPosition = Math.max(maxPosition, seconds);
    emit({ positionSec: seconds });
  },

  setRate(rate) {
    instance().changePlayerSpeed(rate);
  },

  release() {
    stopTimer();
    playing = false;
    maxPosition = 0;
    void instance()
      .stop()
      .catch(() => undefined);
  },

  onStatus(next) {
    listener = next;
  },
};
