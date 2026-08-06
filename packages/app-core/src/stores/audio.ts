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
 * both implementing the same seven-field state, the same watchdog and the same
 * 60-second club preview — and neither knowing about the bugs the other had
 * found. Everything platform-specific now sits behind `AudioBackend`
 * (`ports/index.ts`), which each host implements over its own SDK.
 *
 * Two fixes the Expo version had and the NativeScript one did not, now shared:
 *
 *  - The preview gate holds on the SECOND tap too. The old NativeScript check was
 *    `>= limit && !previewEnded`, so acknowledging the invitation and pressing
 *    play again ran the episode to the end and gave away club content.
 *  - An error state is sticky until the next start. Without that, the following
 *    status tick — no error, not loaded yet — mapped straight back to "loading",
 *    which is exactly the endless spinner the watchdog exists to prevent.
 */

export type PlayerStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'error';

/** Club bonus content for non-members: 60 seconds. An invitation, not a lock. */
export const PREVIEW_LIMIT_SEC = 60;

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
  /** Set once the 60-second preview has run out (→ club invitation). */
  previewEnded: boolean;
  errorMessage: string | null;

  playRadio: () => Promise<void>;
  playEpisode: (track: Omit<AudioTrack, 'kind'>) => Promise<void>;
  playPreview: (track: Omit<AudioTrack, 'kind'>) => Promise<void>;
  togglePlay: () => void;
  seekTo: (seconds: number) => Promise<void>;
  setSpeed: (rate: number) => void;
  stop: () => void;
  /** The invitation has been seen — clear the flag, keep the track loaded. */
  acknowledgePreviewEnd: () => void;
}

const IDLE = {
  track: null,
  status: 'idle',
  positionSec: 0,
  durationSec: 0,
  speed: 1,
  previewEnded: false,
  errorMessage: null,
} satisfies Omit<
  AudioState,
  | 'playRadio'
  | 'playEpisode'
  | 'playPreview'
  | 'togglePlay'
  | 'seekTo'
  | 'setSpeed'
  | 'stop'
  | 'acknowledgePreviewEnd'
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

    if (status.error) {
      console.warn('[audio] playback error:', status.error);
      fail(`Wiedergabe unterbrochen. ${NETWORK_HINT}`);
      return;
    }
    // An error stays until the next start clears it. See the note at the top.
    if (state.status === 'error') return;

    // The preview gate applies BEFORE the normal mapping, or the episode keeps
    // playing underneath the invitation.
    //
    // `previewEnded` is already true on a re-entrant tick, so the guard above sends
    // the second call straight back out — which is what stops the recursion this
    // pairing used to produce. Setting state before pausing is the other half.
    if (
      state.track.kind === 'preview' &&
      !state.previewEnded &&
      status.positionSec >= PREVIEW_LIMIT_SEC
    ) {
      set({
        status: 'paused',
        positionSec: PREVIEW_LIMIT_SEC,
        durationSec: status.durationSec,
        previewEnded: true,
      });
      platform().audio?.pause();
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
    playPreview: (track) => start({ ...track, kind: 'preview' }),

    togglePlay: () => {
      const state = get();
      const audio = backend();
      if (!state.track || !audio) return;

      if (state.status === 'playing') {
        set({ status: 'paused' });
        audio.pause();
        return;
      }
      // Past the 60-second mark a preview does not resume — it re-offers the club.
      if (state.track.kind === 'preview' && state.positionSec >= PREVIEW_LIMIT_SEC) {
        set({ previewEnded: true });
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

    acknowledgePreviewEnd: () => set({ previewEnded: false }),
  };
});

/** Test helper — drops the watchdog, the listener registration and the state. */
export function resetAudioStore(): void {
  clearWatchdog();
  listening = null;
  audioStore.setState({ ...IDLE });
}
