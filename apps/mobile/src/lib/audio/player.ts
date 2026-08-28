import type { AudioTrack } from '@correctiv/app-core/types/models';

import { coreActions } from '@/lib/store/core';

/**
 * The app's audio actions.
 *
 * All of the logic — the state machine, the watchdog, the German error copy — is in
 * `@correctiv/app-core/stores/audio`. expo-audio sits behind `AudioBackend` in
 * `./backend.ts`.
 *
 * This file is the seam that keeps the call sites plain: `playRadio()` reads
 * better in a component than `coreActions.audio.playRadio()`, and the actions'
 * identities are stable, so calling them outside React costs no render.
 */

export type { AudioState, PlayerStatus } from '@correctiv/app-core/stores/audio';

/** The Salon5 live stream (Icecast). */
export const playRadio = (): Promise<void> => coreActions.audio.playRadio();

/** A podcast episode or bonus audio, in full. */
export const playEpisode = (track: Omit<AudioTrack, 'kind'>): Promise<void> =>
  coreActions.audio.playEpisode(track);

export const togglePlay = (): void => coreActions.audio.togglePlay();
export const seekTo = (seconds: number): Promise<void> => coreActions.audio.seekTo(seconds);
export const setSpeed = (rate: number): void => coreActions.audio.setSpeed(rate);
export const stop = (): void => coreActions.audio.stop();
