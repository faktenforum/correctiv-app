import type { Project } from '@correctiv/app-core/data/projects';

export type ProjectTarget =
  /** Querverweis in einen anderen Tab (CrowdNewsroom, Faktenforum, Abriss-Atlas). */
  | { kind: 'tab'; path: '/(tabs)/mitmachen' }
  /** Rein externes Projekt — System-Browser. */
  | { kind: 'external'; url: string }
  /** Projekt- oder Themenseite in dieser App. */
  | { kind: 'project'; id: string };

/**
 * Was ein Tippen auf einen Verzeichnis-Eintrag bedeutet — als reine Funktion,
 * weil zwei Stellen dieselbe Antwort brauchen: der Bildschirm zum Navigieren und
 * die Zeile für ihr Pfeil-Icon. Als zwei Bedingungen waren das zwei Wahrheiten,
 * die auseinanderlaufen können.
 *
 * Die Reihenfolge ist die Entscheidung: `tab` schlägt `url`, und ein Projekt mit
 * Feed UND url (Salon5) bleibt in der App — dort ist die url eine Zusatzquelle,
 * kein Ersatz für die Projektseite mit Feed und eigener Aktion.
 */
export function projectTarget(project: Project): ProjectTarget {
  if (project.tab === 'participate') return { kind: 'tab', path: '/(tabs)/mitmachen' };
  if (project.url && !project.feed) return { kind: 'external', url: project.url };
  return { kind: 'project', id: project.id };
}
