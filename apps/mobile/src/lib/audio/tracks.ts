import { RADIO_STREAM_URL } from '@correctiv/app-core/data/feeds.config';

/** Metadata and source of the Salon5 live stream (Icecast). For player and lock screen. */
export const SALON5_RADIO = {
  id: 'salon5-radio',
  url: RADIO_STREAM_URL,
  title: 'Salon5 Radio',
  artist: '24/7 aus Bottrop',
} as const;
