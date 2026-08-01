/**
 * Search sample hits for content that is not in the live feeds
 * (podcasts, callouts, backstage, publisher) — real titles throughout.
 */
export interface SearchSample {
  id: string;
  kind: 'podcast' | 'callout' | 'backstage' | 'verlag' | 'projekt';
  title: string;
  subtitle: string;
}

export const searchSamples: SearchSample[] = [
  { id: 'ss-pausenbrot', kind: 'podcast', title: 'Pausenbrot — der Nachrichten-Snack', subtitle: 'Salon5 · Podcast-Serie' },
  { id: 'ss-deeptalk', kind: 'podcast', title: 'Deeptalk', subtitle: 'Salon5 · Podcast-Serie' },
  { id: 'ss-mission-klima', kind: 'podcast', title: 'Mission Klima', subtitle: 'Salon5 · Podcast-Serie' },
  { id: 'ss-zukunft', kind: 'callout', title: 'Die Zukunft von CORRECTIV: Wir fragen Sie', subtitle: 'CrowdNewsroom · Aufruf' },
  { id: 'ss-stadt', kind: 'callout', title: 'Wem gehört die Stadt?', subtitle: 'CrowdNewsroom · Aufruf' },
  { id: 'ss-tagebuch', kind: 'backstage', title: 'Woche 3: Die Spur führt nach Bern', subtitle: 'Backstage · Recherchetagebuch' },
  { id: 'ss-bonus', kind: 'backstage', title: 'Bonusfolge: Wie wir an die Pensionskassen-Daten kamen', subtitle: 'Backstage · Audio' },
  { id: 'ss-akten', kind: 'verlag', title: 'Akten des Missbrauchs', subtitle: 'CORRECTIV Verlag · Buch' },
  { id: 'ss-karten', kind: 'verlag', title: '100 Karten über Rechtsextremismus', subtitle: 'CORRECTIV Verlag · Buch' },
];
