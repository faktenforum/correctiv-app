import { useStore } from 'zustand';

import {
  audioStore,
  isLive,
  type AudioState,
  type PlayerStatus,
} from '@correctiv/app-core/stores/audio';

/**
 * React bindings for the core's audio store.
 *
 * The status ticks twice a second (`updateInterval: 500` in `./backend.ts`), so
 * the selectors here deliberately return **primitive values**: only whoever
 * actually displays the position should re-render twice a second. A selector that
 * built a fresh object would be a problem of its own — zustand v5 hands it to
 * `useSyncExternalStore` with no equality function (see the note in
 * lib/store/core.ts).
 */

/** Full state — for the player surfaces that show position and duration. */
export const useAudio = (): AudioState => useStore(audioStore);

export const useAudioIsActive = (): boolean => useStore(audioStore, (s) => s.track !== null);

export const useAudioIsLive = (): boolean => useStore(audioStore, isLive);

/** Has the club preview run out? Opens the invitation. */
export const usePreviewEnded = (): boolean => useStore(audioStore, (s) => s.previewEnded);

/** The radio's state in one word — `off` as soon as something else is playing. */
export type RadioState = 'off' | 'loading' | 'playing' | 'paused' | 'error';

export const useRadioState = (): RadioState =>
  useStore(audioStore, (s) =>
    s.track?.kind !== 'radio' || s.status === 'idle' ? 'off' : (s.status as RadioState),
  );

/** Is THIS episode playing? Primitive, so no render per position tick. */
export const useEpisodeStatus = (episodeId: string): PlayerStatus | 'off' =>
  useStore(audioStore, (s) => (s.track?.episodeId === episodeId ? s.status : 'off'));
