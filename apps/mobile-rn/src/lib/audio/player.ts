import { createAudioPlayer, type AudioPlayer, type AudioStatus } from 'expo-audio';
import { createStore } from 'zustand/vanilla';

import { RADIO_STREAM_URL } from '@correctiv/app-core/data/feeds.config';
import { stopOtherMedia } from '@correctiv/app-core/media/exclusive-playback';
import type { AudioTrack } from '@correctiv/app-core/types/models';

import { ensureAudioMode } from './setup';
import { toAudioSource } from './sources';

/**
 * Der eine Audio-Player der App.
 *
 * Bewusst `createAudioPlayer` und NICHT der `useAudioPlayer`-Hook: der Hook bindet
 * die Player-Instanz an die Lebensdauer einer Komponente und gibt sie beim Unmount
 * frei. Genau das darf hier nicht passieren — Wiedergabe soll Navigation, Tabwechsel
 * und den Hintergrund überleben. Also lebt die Instanz im Modul, und React
 * abonniert nur den Zustand.
 *
 * Der NativeScript-Stand brauchte an dieser Stelle zwei Notbehelfe, die hier
 * entfallen: eine Positions-Rückschritt-Erkennung (Androids MediaPlayer sprang bei
 * Ende auf 0, ohne den Complete-Callback zu feuern) und einen 1-Sekunden-Timer,
 * der die Position pollte. expo-audio meldet `didJustFinish`, `isLoaded`,
 * `isBuffering` und `error` von selbst.
 */

export type PlayerStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'error';

/** Club-Bonus für Nicht-Mitglieder: 60 Sekunden. Eine Einladung, keine Sperre. */
export const PREVIEW_LIMIT_SEC = 60;

/**
 * expo-audio meldet Fehler zwar über `status.error`, aber die Lektion aus dem
 * NativeScript-Stand war, dass Netzfehler manchmal *gar nicht* ankommen — und ein
 * ewiger Spinner ist die schlechteste Auskunft. Deshalb bleibt ein Wachhund.
 */
const LOADING_TIMEOUT_MS = 12000;

const NETWORK_HINT = 'Prüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.';

export interface AudioState {
  track: AudioTrack | null;
  status: PlayerStatus;
  positionSec: number;
  /** 0 für Live-Streams — Icecast hat keine Länge. */
  durationSec: number;
  /** Wiedergabegeschwindigkeit; im Zustand, weil der Vollplayer sie anzeigt. */
  speed: number;
  /** Gesetzt, sobald die 60-Sekunden-Vorschau abgelaufen ist (→ Club-Einladung). */
  previewEnded: boolean;
  errorMessage: string | null;
}

const IDLE: AudioState = {
  track: null,
  status: 'idle',
  positionSec: 0,
  durationSec: 0,
  speed: 1,
  previewEnded: false,
  errorMessage: null,
};

export const audioStore = createStore<AudioState>(() => ({ ...IDLE }));

/** Reine Selektoren — Live-Wiedergabe kennt keine Länge und keine Position. */
export function isLive(state: Pick<AudioState, 'track'>): boolean {
  return state.track?.kind === 'radio';
}
export function isActive(state: Pick<AudioState, 'track'>): boolean {
  return state.track !== null;
}

// --- Player-Instanz -----------------------------------------------------------

let player: AudioPlayer | null = null;
let watchdog: ReturnType<typeof setTimeout> | null = null;

function ensurePlayer(): AudioPlayer {
  if (!player) {
    player = createAudioPlayer(null, { updateInterval: 500 });
    player.addListener('playbackStatusUpdate', onStatus);
  }
  return player;
}

function clearWatchdog(): void {
  if (watchdog) {
    clearTimeout(watchdog);
    watchdog = null;
  }
}

function fail(message: string): void {
  clearWatchdog();
  player?.pause();
  audioStore.setState({ status: 'error', errorMessage: message });
}

function onStatus(status: AudioStatus): void {
  const { track, previewEnded, status: current } = audioStore.getState();
  if (!track) return; // gestoppt — nachlaufende Meldungen ignorieren

  if (status.error) {
    console.warn('[audio] Wiedergabefehler:', status.error);
    fail(`Wiedergabe unterbrochen. ${NETWORK_HINT}`);
    return;
  }

  /**
   * Ein Fehler bleibt stehen, bis ein neuer Start ihn löscht.
   *
   * Ohne diese Zeile kippt der nächste Status-Tick die Anzeige zurück auf
   * „Lädt …“: `status.error` ist dann wieder null und `isLoaded` weiter false, also
   * mappt die Zuordnung unten auf `loading`. Ergebnis ist genau der ewige Spinner,
   * gegen den der Wachhund existiert — auf dem Gerät gesehen, als der
   * Icecast-Stream am SSL-Handshake scheiterte und die Mini-Leiste danach
   * unverändert „Lädt …“ zeigte.
   */
  if (current === 'error') return;

  // Das Vorschau-Tor. Muss VOR der normalen Zustandsübernahme greifen, sonst
  // läuft die Folge weiter, während die Einladung eingeblendet wird.
  if (track.kind === 'preview' && status.currentTime >= PREVIEW_LIMIT_SEC) {
    player?.pause();
    audioStore.setState({
      status: 'paused',
      positionSec: PREVIEW_LIMIT_SEC,
      durationSec: status.duration,
      previewEnded: true,
    });
    return;
  }

  if (status.isLoaded) clearWatchdog();

  if (status.didJustFinish) {
    audioStore.setState({ status: 'paused', positionSec: 0 });
    return;
  }

  audioStore.setState({
    status: status.playing
      ? 'playing'
      : !status.isLoaded || status.isBuffering
        ? 'loading'
        : 'paused',
    positionSec: status.currentTime,
    durationSec: status.isLive ? 0 : status.duration,
    // Ein neuer Lauf nach der Vorschau setzt das Flag in `start` zurück; hier nur
    // durchreichen, damit die Einladung nicht bei jedem Status-Tick neu aufgeht.
    previewEnded,
  });
}

// --- Aktionen ----------------------------------------------------------------

async function start(track: AudioTrack): Promise<void> {
  // Abstimmung: es spielt immer nur ein Medium.
  stopOtherMedia('audio');
  clearWatchdog();
  audioStore.setState({ ...IDLE, track, status: 'loading' });

  try {
    await ensureAudioMode();
    const active = ensurePlayer();
    active.replace(toAudioSource(track.url));
    active.play();
    // Lockscreen/Notification. Braucht `interruptionMode: 'doNotMix'`, das
    // ensureAudioMode setzt — ohne das ordnet das OS die Steuerung nicht zu.
    active.setActiveForLockScreen(true, {
      title: track.title,
      artist: track.subtitle ?? 'CORRECTIV',
      artworkUrl: track.artworkUrl,
    });
  } catch (err) {
    console.warn('[audio] Start fehlgeschlagen:', err);
    fail(`Wiedergabe nicht möglich. ${NETWORK_HINT}`);
    return;
  }

  watchdog = setTimeout(() => {
    if (audioStore.getState().status === 'loading') {
      fail(`Keine Verbindung zum Stream. ${NETWORK_HINT}`);
    }
  }, LOADING_TIMEOUT_MS);
}

/** Salon5-Live-Stream (Icecast). */
export function playRadio(): Promise<void> {
  return start({
    kind: 'radio',
    title: 'Salon5 Radio',
    subtitle: '● LIVE — 24/7 aus Bottrop',
    url: RADIO_STREAM_URL,
  });
}

/** Podcast-Folge oder Bonus-Audio in voller Länge. */
export function playEpisode(track: Omit<AudioTrack, 'kind'>): Promise<void> {
  return start({ ...track, kind: 'episode' });
}

/** Dasselbe als 60-Sekunden-Vorschau (Nicht-Mitglieder, Club-Inhalt). */
export function playPreview(track: Omit<AudioTrack, 'kind'>): Promise<void> {
  return start({ ...track, kind: 'preview' });
}

/**
 * Play/Pause.
 *
 * Sonderfall Vorschau: nach Ablauf der 60 Sekunden wird nicht fortgesetzt, sondern
 * die Einladung erneut gezeigt. Der NativeScript-Stand hatte hier ein Loch — sein
 * Limit feuerte einmal (`!this.previewEnded`), danach spielte ein zweiter Druck auf
 * Play die Folge zu Ende und gab Club-Inhalt frei.
 */
export function togglePlay(): void {
  const state = audioStore.getState();
  if (!state.track || !player) return;

  if (state.status === 'playing') {
    player.pause();
    audioStore.setState({ status: 'paused' });
    return;
  }
  if (state.track.kind === 'preview' && state.positionSec >= PREVIEW_LIMIT_SEC) {
    audioStore.setState({ previewEnded: true });
    return;
  }
  player.play();
}

export async function seekTo(seconds: number): Promise<void> {
  const state = audioStore.getState();
  if (!player || !state.track || isLive(state)) return;
  await player.seekTo(Math.max(0, seconds));
  audioStore.setState({ positionSec: seconds });
}

export function setSpeed(rate: number): void {
  player?.setPlaybackRate(rate);
  audioStore.setState({ speed: rate });
}

export function stop(): void {
  clearWatchdog();
  if (player) {
    player.pause();
    player.clearLockScreenControls();
    // Quelle freigeben, sonst puffert ein pausierter Live-Stream weiter.
    player.replace(null);
  }
  audioStore.setState({ ...IDLE });
}

/** Die Club-Einladung wurde gesehen — Flag zurücksetzen, Track bleibt geladen. */
export function acknowledgePreviewEnd(): void {
  audioStore.setState({ previewEnded: false });
}

/** Nur für Tests: Instanz und Zustand zurücksetzen. */
export function resetAudioForTests(): void {
  clearWatchdog();
  player?.remove();
  player = null;
  audioStore.setState({ ...IDLE });
}
