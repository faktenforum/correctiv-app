import { useStore } from 'zustand';

import { audioStore, isLive, type AudioState, type PlayerStatus } from './player';

/**
 * React-Bindung an den Audio-Singleton.
 *
 * Der Status tickt zweimal pro Sekunde (`updateInterval: 500`), deshalb gibt es
 * hier absichtlich schmale Selektoren, die **primitive Werte** liefern: nur wer die
 * Position wirklich anzeigt, soll auch zweimal pro Sekunde neu rendern. Ein
 * Selektor, der ein frisches Objekt baut, wäre außerdem ein Problem für sich —
 * zustand v5 gibt ihn ohne Vergleichsfunktion an `useSyncExternalStore` weiter
 * (siehe die Notiz in lib/store/core.ts).
 */

/** Voller Zustand — für die Player-Oberflächen, die Position und Länge zeigen. */
export const useAudio = (): AudioState => useStore(audioStore);

export const useAudioIsActive = (): boolean => useStore(audioStore, (s) => s.track !== null);

export const useAudioIsLive = (): boolean => useStore(audioStore, isLive);

/** Ist die Club-Vorschau abgelaufen? Öffnet die Einladung (Phase 4e). */
export const usePreviewEnded = (): boolean => useStore(audioStore, (s) => s.previewEnded);

/** Radio-Zustand als ein Wort — `off`, sobald etwas anderes läuft. */
export type RadioState = 'off' | 'loading' | 'playing' | 'paused' | 'error';

export const useRadioState = (): RadioState =>
  useStore(audioStore, (s) =>
    s.track?.kind !== 'radio' || s.status === 'idle' ? 'off' : (s.status as RadioState),
  );

/** Spielt gerade DIESE Folge? Primitiv, also kein Render pro Positionstick. */
export const useEpisodeStatus = (episodeId: string): PlayerStatus | 'off' =>
  useStore(audioStore, (s) => (s.track?.episodeId === episodeId ? s.status : 'off'));
