import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useEffect } from 'react';

import { ensureAudioMode } from './setup';
import { SALON5_RADIO } from './tracks';

/**
 * Minimaler Radio-Hook (expo-audio): lädt den Salon5-Live-Stream und schaltet
 * Play/Pause. Seed für den persistenten Mini-Player in M3 (dann als App-Singleton).
 */
export function useRadio() {
  const player = useAudioPlayer(SALON5_RADIO.url);
  const status = useAudioPlayerStatus(player);

  useEffect(() => {
    ensureAudioMode();
  }, []);

  const toggle = () => {
    if (status.playing) player.pause();
    else player.play();
  };

  return { playing: status.playing, isBuffering: !status.isLoaded, toggle };
}
