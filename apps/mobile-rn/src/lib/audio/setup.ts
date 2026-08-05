import { setAudioModeAsync } from 'expo-audio';

let configured = false;

/**
 * Sets the audio mode once: playback in silent mode, background audio, and
 * `doNotMix` — the last one is a precondition for working lock-screen controls,
 * because without exclusive focus the OS does not associate them with our player.
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
