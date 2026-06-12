import type { FeedKey } from '../types/models';

/** Themen-Chips aus dem Konzept (Onboarding Schritt 2). */
export interface Interest {
  id: string;
  label: string;
  /** Feed, dessen Inhalte bei Auswahl zusätzlich auf Home erscheinen */
  feed?: FeedKey;
  /** Home-Modul, das bei Auswahl nach oben rückt */
  boostModule?: 'factcheckRail' | 'mediaRow';
}

export const interests: Interest[] = [
  { id: 'afd', label: 'AfD & Rechtsextremismus' },
  { id: 'klima', label: 'Klima', feed: 'klima' },
  { id: 'gesundheit', label: 'Gesundheit' },
  { id: 'russland', label: 'Russland & Ukraine' },
  { id: 'faktenchecks', label: 'Faktenchecks', boostModule: 'factcheckRail' },
  { id: 'lokal', label: 'Lokal', feed: 'lokal' },
  { id: 'schweiz', label: 'Schweiz', feed: 'schweiz' },
  { id: 'jugend', label: 'Jugend & Salon5', feed: 'salon5', boostModule: 'mediaRow' },
];
