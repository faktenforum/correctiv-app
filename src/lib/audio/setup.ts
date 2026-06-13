import TrackPlayer, {
  AppKilledPlaybackBehavior,
  Capability,
} from 'react-native-track-player';

import { colors } from '@/lib/theme';

let setupPromise: Promise<void> | null = null;

/** Akzentfarbe der Notification als 24-bit-Integer (RNTP erwartet keine #-Strings). */
const accent = parseInt(colors.emphasis.slice(1), 16);

/**
 * Initialisiert den Player idempotent (mehrfacher Aufruf ist sicher). Capabilities
 * inkl. Stop für den Live-Stream; Hintergrund-Audio + Notification-Controls.
 */
export function setupPlayer(): Promise<void> {
  if (!setupPromise) {
    setupPromise = (async () => {
      await TrackPlayer.setupPlayer();
      await TrackPlayer.updateOptions({
        android: {
          appKilledPlaybackBehavior: AppKilledPlaybackBehavior.StopPlaybackAndRemoveNotification,
        },
        capabilities: [Capability.Play, Capability.Pause, Capability.Stop, Capability.SeekTo],
        compactCapabilities: [Capability.Play, Capability.Pause, Capability.Stop],
        color: accent,
        progressUpdateEventInterval: 1,
      });
    })().catch((err) => {
      // Bei Fehler erneut versuchbar machen.
      setupPromise = null;
      throw err;
    });
  }
  return setupPromise;
}
