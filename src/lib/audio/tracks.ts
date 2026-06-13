import { SALON5_STREAM_URL } from '@/lib/feeds/sources';

/** Metadaten + Quelle des Salon5-Live-Streams (Icecast). Für Player + Lockscreen. */
export const SALON5_RADIO = {
  id: 'salon5-radio',
  url: SALON5_STREAM_URL,
  title: 'Salon5 Radio',
  artist: '24/7 aus Bottrop',
} as const;
