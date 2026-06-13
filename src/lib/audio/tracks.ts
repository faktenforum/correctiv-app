import type { Track } from 'react-native-track-player';

/**
 * Salon5-Radio: verifizierter Icecast-Stream (audio/mpeg, 64 kbit/s). Als
 * Live-Stream markiert — kein Progress/Seek, nie per HEAD prüfen (Icecast → 400).
 */
export const SALON5_RADIO: Track = {
  id: 'salon5-radio',
  url: 'https://icecast.correctiv.net/salon5low',
  title: 'Salon5 Radio',
  artist: '24/7 aus Bottrop',
  isLiveStream: true,
};
