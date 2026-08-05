import type { AudioSource } from 'expo-audio';

import sampleEpisode from '@/assets/audio/sample-episode.mp3';

/**
 * The core's sample data points at `assets/audio/sample-episode.mp3` — a
 * NativeScript app path that was resolved at runtime with `knownFolders`. Metro has
 * no app folders, only asset ids, so the path is mapped to the bundled asset here.
 *
 * Why bundle local audio at all: the Backstage bonus and the podcast seed are the
 * club preview flow ("60 Sek. anspielen"), and that has to play without a network —
 * otherwise the only way to show the offer is a dead play button.
 */
const BUNDLED: Record<string, number> = {
  'assets/audio/sample-episode.mp3': sampleEpisode,
};

/** A core track url → an expo-audio source. */
export function toAudioSource(url: string): AudioSource {
  if (/^https?:\/\//.test(url)) return { uri: url };
  const assetId = BUNDLED[url];
  if (assetId !== undefined) return assetId;
  // No guessing: an unknown relative source is a data error, and silently passing
  // it on as a uri ends in a player that never loads.
  throw new Error(
    `Unknown local audio source "${url}" — add it to apps/mobile-rn/src/lib/audio/sources.ts, or point the data at an https url.`,
  );
}
