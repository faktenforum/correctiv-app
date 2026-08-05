import { RADIO_STREAM_URL } from '@correctiv/app-core/data/feeds.config';

/** Metadaten + Quelle des Salon5-Live-Streams (Icecast). Für Player + Lockscreen. */
export const SALON5_RADIO = {
  id: 'salon5-radio',
  url: RADIO_STREAM_URL,
  title: 'Salon5 Radio',
  artist: '24/7 aus Bottrop',
} as const;
