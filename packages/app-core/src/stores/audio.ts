import { RADIO_STREAM_URL } from '../data/feeds.config';
import { stopOtherMedia } from '../media/exclusive-playback';
import { platform, type AudioBackend, type PlaybackStatus } from '../ports';
import type { AudioTrack } from '../types/models';
import { createStore } from './create-store';

/**
 * The player's state machine — one of them, for both apps.
 *
 * This was the largest duplication in the repo: 280 lines of Pinia store plus
 * service in the NativeScript app, 270 lines of zustand store in the Expo app,
 * both implementing the same state, the same watchdog and the same club preview —
 * and neither knowing about the bugs the other had found. Everything
 * platform-specific now sits behind `AudioBackend` (`ports/index.ts`), which each
 * host implements over its own SDK.
 *
 * There is no length limit on club content: bonus episodes play in full for
 * everyone. Both apps used to stop a non-member at 60 seconds and offer the club —
 * dropped on 2026-08-06, which also puts audio in line with "closeness, not a
 * paywall". The `CLUB` badge stays as a label; it no longer withholds anything.
 *
 * One fix the Expo version had and the NativeScript one did not, now shared: an
 * error state is sticky until the next start. Without that, the following status
 * tick — no error, not loaded yet — maps straight back to "loading", which is
 * exactly the endless spinner the watchdog exists to prevent.
 */

export type PlayerStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'error';

/**
 * Both SDKs report playback errors — and on both, a network failure sometimes
 * never arrives at all. An endless spinner is the worst available answer, so a
 * timer decides when to stop believing in the stream.
 */
const LOADING_TIMEOUT_MS = 12000;

/** User-facing copy stays German, in the formal register: this is product voice. */
const NETWORK_HINT = 'Prüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.';

export interface AudioState {
  track: AudioTrack | null;
  status: PlayerStatus;
  positionSec: number;
  /** 0 for live streams — Icecast has no length. */
  durationSec: number;
  /** Playback rate; in state because the full player shows it. */
  speed: number;
  errorMessage: string | null;

  playRadio: () => Promise<void>;
  playEpisode: (track: Omit<AudioTrack, 'kind'>) => Promise<void>;
  togglePlay: () => void;
  seekTo: (seconds: number) => Promise<void>;
  setSpeed: (rate: number) => void;
  stop: () => void;
}

const IDLE = {
  track: null,
  status: 'idle',
  positionSec: 0,
  durationSec: 0,
  speed: 1,
  errorMessage: null,
} satisfies Omit<
  AudioState,
  'playRadio' | 'playEpisode' | 'togglePlay' | 'seekTo' | 'setSpeed' | 'stop'
>;

/** Pure selectors — live playback has neither a length nor a position. */
export function isLive(state: Pick<AudioState, 'track'>): boolean {
  return state.track?.kind === 'radio';
}
export function isActive(state: Pick<AudioState, 'track'>): boolean {
  return state.track !== null;
}

let watchdog: ReturnType<typeof setTimeout> | null = null;
/** The backend the status listener is attached to, so it is attached exactly once. */
let listening: AudioBackend | null = null;

function clearWatchdog(): void {
  if (watchdog) {
    clearTimeout(watchdog);
    watchdog = null;
  }
}

export const audioStore = createStore<AudioState>((set, get) => {
  function fail(message: string): void {
    clearWatchdog();
    // State first, command second: a backend that emits from `pause()` re-enters
    // this handler, and it has to find the new state when it does. See the note on
    // `AudioBackend` in ports/index.ts.
    set({ status: 'error', errorMessage: message });
    platform().audio?.pause();
  }

  function onStatus(status: PlaybackStatus): void {
    const state = get();
    if (!state.track) return; // stopped — ignore trailing updates

    /**
     * An error stays until the next start clears it, and this guard comes FIRST.
     *
     * Two reasons, both learned the hard way. A tick that merely looks unloaded
     * would otherwise map back to "loading" — the endless spinner the watchdog
     * exists to prevent. And `fail()` below calls `AudioBackend.pause()`: a backend
     * that reports back from inside that call arrives here with the same error still
     * attached, so anything after the `status.error` branch is too late to stop the
     * recursion. That was a real crash on a device, and moving this line up is what
     * makes it structurally impossible rather than merely unlikely.
     */
    if (state.status === 'error') return;

    if (status.error) {
      console.warn('[audio] playback error:', status.error);
      fail(`Wiedergabe unterbrochen. ${NETWORK_HINT}`);
      return;
    }

    if (status.loaded) clearWatchdog();

    if (status.finished) {
      set({ status: 'paused', positionSec: 0 });
      return;
    }

    set({
      status: status.playing
        ? 'playing'
        : !status.loaded || status.buffering
          ? 'loading'
          : 'paused',
      positionSec: status.positionSec,
      durationSec: status.live ? 0 : status.durationSec,
    });
  }

  /**
   * The host may register its platform after this module is imported, so the
   * listener is attached on first use rather than at construction.
   */
  function backend(): AudioBackend | null {
    const audio = platform().audio ?? null;
    if (audio && audio !== listening) {
      audio.onStatus(onStatus);
      listening = audio;
    }
    return audio;
  }

  async function start(track: AudioTrack): Promise<void> {
    // Coordinate: only one medium plays at a time.
    stopOtherMedia('audio');
    clearWatchdog();
    set({ ...IDLE, track, status: 'loading' });

    const audio = backend();
    if (!audio) {
      set({ status: 'error', errorMessage: 'Auf dieser Plattform ist keine Wiedergabe möglich.' });
      return;
    }

    try {
      await audio.load(track.url, {
        title: track.title,
        artist: track.subtitle ?? 'CORRECTIV',
        artworkUrl: track.artworkUrl,
      });
      audio.play();
    } catch (err) {
      console.warn('[audio] start failed:', err);
      fail(`Wiedergabe nicht möglich. ${NETWORK_HINT}`);
      return;
    }

    watchdog = setTimeout(() => {
      if (get().status === 'loading') fail(`Keine Verbindung zum Stream. ${NETWORK_HINT}`);
    }, LOADING_TIMEOUT_MS);
  }

  return {
    ...IDLE,

    playRadio: () =>
      start({
        kind: 'radio',
        title: 'Salon5 Radio',
        subtitle: '● LIVE — 24/7 aus Bottrop',
        url: RADIO_STREAM_URL,
      }),

    playEpisode: (track) => start({ ...track, kind: 'episode' }),

    togglePlay: () => {
      const state = get();
      const audio = backend();
      if (!state.track || !audio) return;

      if (state.status === 'playing') {
        set({ status: 'paused' });
        audio.pause();
        return;
      }
      audio.play();
    },

    seekTo: async (seconds) => {
      const state = get();
      const audio = backend();
      if (!audio || !state.track || isLive(state)) return;
      await audio.seekTo(Math.max(0, seconds));
      set({ positionSec: seconds });
    },

    setSpeed: (rate) => {
      backend()?.setRate(rate);
      set({ speed: rate });
    },

    stop: () => {
      clearWatchdog();
      backend()?.release();
      set({ ...IDLE });
    },
  };
});

/** Test helper — drops the watchdog, the listener registration and the state. */
export function resetAudioStore(): void {
  clearWatchdog();
  listening = null;
  audioStore.setState({ ...IDLE });
}
