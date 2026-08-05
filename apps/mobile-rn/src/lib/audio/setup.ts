import { setAudioModeAsync } from 'expo-audio';

let configured = false;

/**
 * Setzt den Audio-Modus einmalig: Wiedergabe im Stumm-Modus, Hintergrund-Audio
 * und `doNotMix` — Letzteres ist Voraussetzung für funktionierende Lockscreen-Controls.
 */
export async function ensureAudioMode(): Promise<void> {
  if (configured) return;
  await setAudioModeAsync({
    playsInSilentMode: true,
    shouldPlayInBackground: true,
    interruptionMode: 'doNotMix',
  });
  configured = true;
}
