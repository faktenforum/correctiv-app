/**
 * Typisierte Loader für die Beispieldaten (data/*.json). Bewusst dieselben
 * Rückgabetypen wie die künftigen API-Clients — beim Phase-3-Wechsel auf echte
 * Anbindungen ändert sich nur diese Schicht, nicht die UI.
 */
import type { SpotlightIssue } from '@/lib/models';

import spotlightJson from '../../../data/spotlight.json';

export function getSpotlightIssues(): SpotlightIssue[] {
  return spotlightJson as SpotlightIssue[];
}

export function getLatestSpotlight(): SpotlightIssue {
  return getSpotlightIssues()[0];
}
