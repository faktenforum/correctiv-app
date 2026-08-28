import { isLive, type AudioState, type PlayerStatus } from '@correctiv/app-core/stores/audio';

import { useAppSelector } from '@/lib/store/core';

/**
 * React bindings for the core's audio slice.
 *
 * The status ticks twice a second (`updateInterval: 500` in `./backend.ts`), so
 * the selectors here deliberately return **primitive values**: only whoever
 * actually displays the position should re-render twice a second. `useSelector`
 * compares by reference, so a selector building a fresh object would re-render its
 * component on every one of those ticks (see the note in lib/store/core.ts).
 */

/** Full state — for the player surfaces that show position and duration. */
export const useAudio = (): AudioState => useAppSelector((s) => s.audio);

export const useAudioIsActive = (): boolean => useAppSelector((s) => s.audio.track !== null);

export const useAudioIsLive = (): boolean => useAppSelector((s) => isLive(s.audio));

/** The radio's state in one word — `off` as soon as something else is playing. */
export type RadioState = 'off' | 'loading' | 'playing' | 'paused' | 'error';

export const useRadioState = (): RadioState =>
  useAppSelector((s) =>
    s.audio.track?.kind !== 'radio' || s.audio.status === 'idle'
      ? 'off'
      : (s.audio.status as RadioState),
  );

/** Is THIS episode playing? Primitive, so no render per position tick. */
export const useEpisodeStatus = (episodeId: string): PlayerStatus | 'off' =>
  useAppSelector((s) => (s.audio.track?.episodeId === episodeId ? s.audio.status : 'off'));
