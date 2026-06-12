import type { FeedKey } from '../types/models';

/** Topic chips from the concept (onboarding step 2). */
export interface Interest {
  id: string;
  label: string;
  /** Feed whose content additionally appears on Home when selected */
  feed?: FeedKey;
  /** Home module that moves up when selected */
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
