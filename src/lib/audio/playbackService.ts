import TrackPlayer, { Event } from 'react-native-track-player';

/**
 * Hintergrund-Service: verbindet die Notification-/Lockscreen-Controls mit dem
 * Player. Wird in index.js via registerPlaybackService registriert und läuft
 * unabhängig vom UI-Thread (auch bei gesperrtem Bildschirm).
 *
 * In M3 kommt hier der Preview-Guard für Bonusfolgen hinzu (60-s-Schwelle →
 * Pause + Club-Einladung), damit er auch bei Steuerung über die Notification greift.
 */
export default async function playbackService(): Promise<void> {
  TrackPlayer.addEventListener(Event.RemotePlay, () => TrackPlayer.play());
  TrackPlayer.addEventListener(Event.RemotePause, () => TrackPlayer.pause());
  TrackPlayer.addEventListener(Event.RemoteStop, () => TrackPlayer.stop());
  TrackPlayer.addEventListener(Event.RemoteSeek, ({ position }) => TrackPlayer.seekTo(position));
}
