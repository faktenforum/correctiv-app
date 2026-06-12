/**
 * Podcast series — SAMPLE (Salon5 series RSS not findable, see
 * DATENQUELLEN.md §open issues). Real series and episode titles;
 * audio points to the bundled sample episode so that the player
 * and the preview gate can be demonstrated offline.
 */

export interface PodcastEpisode {
  id: string;
  title: string;
  date: string;
  durationLabel: string;
  /** Path relative to the app folder, or a URL */
  audio: string;
  club?: boolean;
}

export interface PodcastSeries {
  id: string;
  title: string;
  publisher: string;
  description: string;
  episodes: PodcastEpisode[];
}

const SAMPLE_AUDIO = 'assets/audio/sample-episode.mp3';

export const podcastSeries: PodcastSeries[] = [
  {
    id: 'correctiv-podcast',
    title: 'CORRECTIV Podcast',
    publisher: 'CORRECTIV',
    description: 'Hintergründe zu unseren Recherchen — von den Reporter:innen selbst erzählt.',
    episodes: [
      {
        id: 'cp-pensionskassen',
        title: 'Pension um jeden Preis: Die Spur des Geldes',
        date: '2026-06-10T06:00:00+02:00',
        durationLabel: '34 Min.',
        audio: SAMPLE_AUDIO,
      },
      {
        id: 'cp-autokraten',
        title: 'Die perfekte Frau: Propaganda und Geschlechterbilder',
        date: '2026-06-03T06:00:00+02:00',
        durationLabel: '28 Min.',
        audio: SAMPLE_AUDIO,
      },
    ],
  },
  {
    id: 'pausenbrot',
    title: 'Pausenbrot',
    publisher: 'Salon5',
    description: 'Der Nachrichten-Snack von Jugendlichen für Jugendliche — jeden Schultag neu.',
    episodes: [
      {
        id: 'pb-emoji',
        title: 'Wenn ein Emoji den Hitlergruß symbolisiert',
        date: '2026-06-11T07:00:00+02:00',
        durationLabel: '9 Min.',
        audio: SAMPLE_AUDIO,
      },
      {
        id: 'pb-ki-schule',
        title: 'KI im Klassenzimmer — Hilfe oder Schummelei?',
        date: '2026-06-10T07:00:00+02:00',
        durationLabel: '11 Min.',
        audio: SAMPLE_AUDIO,
      },
    ],
  },
  {
    id: 'deeptalk',
    title: 'Deeptalk',
    publisher: 'Salon5',
    description: 'Junge Menschen reden über das, was sie wirklich bewegt.',
    episodes: [
      {
        id: 'dt-zukunftsangst',
        title: 'Zukunftsangst — und was dagegen hilft',
        date: '2026-06-08T16:00:00+02:00',
        durationLabel: '42 Min.',
        audio: SAMPLE_AUDIO,
      },
    ],
  },
  {
    id: 'mission-klima',
    title: 'Mission Klima',
    publisher: 'Salon5',
    description: 'Klimakrise verstehen, ohne zu verzweifeln.',
    episodes: [
      {
        id: 'mk-duerre',
        title: 'Dürre in Europa: Was Wassermangel für uns bedeutet',
        date: '2026-06-05T12:00:00+02:00',
        durationLabel: '25 Min.',
        audio: SAMPLE_AUDIO,
      },
    ],
  },
];
