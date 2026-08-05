import type { AudioSource } from 'expo-audio';

import sampleEpisode from '@/assets/audio/sample-episode.mp3';

/**
 * Die Beispieldaten des Core zeigen auf `assets/audio/sample-episode.mp3` — ein
 * NativeScript-App-Pfad, der zur Laufzeit dort mit `knownFolders` aufgelöst wurde.
 * Metro kennt keine App-Ordner, sondern Asset-IDs, also wird der Pfad hier auf das
 * gebündelte Asset abgebildet.
 *
 * Warum überhaupt lokales Audio: der Backstage-Bonus und der Podcast-Seed sind der
 * Club-Vorschau-Fluss („60 Sek. anspielen"), und der muss auch ohne Netz spielen —
 * sonst ist der einzige Weg, das Angebot zu zeigen, ein toter Play-Knopf.
 */
const BUNDLED: Record<string, number> = {
  'assets/audio/sample-episode.mp3': sampleEpisode,
};

/** Track-URL des Core → expo-audio-Quelle. */
export function toAudioSource(url: string): AudioSource {
  if (/^https?:\/\//.test(url)) return { uri: url };
  const assetId = BUNDLED[url];
  if (assetId !== undefined) return assetId;
  // Kein Rätselraten: eine unbekannte relative Quelle ist ein Datenfehler, und
  // sie stumm als URI weiterzugeben endet in einem Player, der nie lädt.
  throw new Error(
    `Unbekannte lokale Audio-Quelle „${url}“ — in apps/mobile-rn/src/lib/audio/sources.ts eintragen oder in den Daten auf eine https-URL ändern.`,
  );
}
