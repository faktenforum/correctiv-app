/**
 * Discover directory — the CORRECTIV ecosystem ordered into 7 groups
 * (per concept). Live projects reference feed keys; external ones deep-link.
 */
import type { FeedKey } from '../types/models';

export interface Project {
  id: string;
  name: string;
  description: string;
  /** live feed on correctiv.org */
  feed?: FeedKey;
  /** external target */
  url?: string;
  /** project-specific action on the project page */
  action?: 'whatsapp-tip' | 'radio' | 'local-network';
  /** no content yet — show a teaser instead of an empty list */
  teaserOnly?: boolean;
  /** in-app cross link */
  tab?: 'participate';
}

export interface ProjectGroup {
  id: string;
  title: string;
  projects: Project[];
}

export const projectGroups: ProjectGroup[] = [
  {
    id: 'recherchieren',
    title: 'Recherchieren',
    projects: [
      { id: 'recherchen', name: 'Recherchen', description: 'Investigative Recherchen für die Gesellschaft.', feed: 'recherchen' },
      { id: 'faktencheck', name: 'CORRECTIV.Faktencheck', description: 'Desinformation aufdecken, Behauptungen prüfen.', feed: 'faktencheck', action: 'whatsapp-tip' },
      { id: 'schweiz', name: 'CORRECTIV.Schweiz', description: 'Recherchen aus und für die Schweiz.', feed: 'schweiz' },
      { id: 'lokal', name: 'CORRECTIV.Lokal', description: 'Netzwerk für Lokaljournalismus in ganz Deutschland.', feed: 'lokal', action: 'local-network' },
      { id: 'klima', name: 'Klima', description: 'Die Klimakrise und ihre Folgen — datenbasiert recherchiert.', feed: 'klima' },
      { id: 'europe', name: 'CORRECTIV.Europe', description: 'Grenzüberschreitende Recherchen in Europa — bald mit eigenem Feed.', teaserOnly: true },
    ],
  },
  {
    id: 'junge-formate',
    title: 'Junge Formate',
    projects: [
      { id: 'salon5', name: 'Salon5', description: 'Die Jugendredaktion: Radio, Podcasts und mehr aus Bottrop.', feed: 'salon5', action: 'radio' },
      { id: 'funfacts', name: 'FunFacts', description: 'Wissen kurz und überprüfbar — bekannt von TikTok und YouTube.', url: 'https://www.youtube.com/@funfacts' },
    ],
  },
  {
    id: 'mitmachen',
    title: 'Mitmachen',
    projects: [
      { id: 'crowdnewsroom', name: 'CrowdNewsroom', description: 'Gemeinsam recherchieren — Ihre Hinweise zählen.', tab: 'participate' },
      { id: 'faktenforum', name: 'Faktenforum', description: 'Die Community prüft Behauptungen.', tab: 'participate' },
      { id: 'abriss-atlas', name: 'Abriss-Atlas', description: 'Abrisse dokumentieren in DE und CH.', tab: 'participate' },
    ],
  },
  {
    id: 'lernen',
    title: 'Lernen',
    projects: [
      { id: 'reporterfabrik', name: 'Reporterfabrik', description: 'Die Journalismusschule für alle — Workshops und Webinare.', url: 'https://reporterfabrik.org' },
      { id: 'reporter4you', name: 'Reporter4You', description: 'Medienbildung für Schulen.', url: 'https://reporter4you.de' },
    ],
  },
  {
    id: 'werkzeuge',
    title: 'Datenbanken & Werkzeuge',
    projects: [
      { id: 'sunlight', name: 'Sunlight', description: 'Lobbyismus und Einflussnahme transparent gemacht.', url: 'https://correctiv.org/sunlight' },
      { id: 'nsdap-kartei', name: 'NSDAP-Mitgliederkartei', description: 'Historische Datenbank zur NS-Mitgliedschaft.', url: 'https://correctiv.org' },
    ],
  },
  {
    id: 'verlag',
    title: 'Verlag & Bühne',
    projects: [
      { id: 'shop', name: 'CORRECTIV Shop & Verlag', description: 'Bücher und Bookzines aus dem Recherchezentrum.', url: 'https://shop.correctiv.org' },
      { id: 'theater', name: 'Theater', description: 'Recherchen auf der Bühne erleben.', url: 'https://correctiv.org' },
    ],
  },
  {
    id: 'exil',
    title: 'Exile-Medien',
    projects: [
      { id: 'radio-sakharov', name: 'Radio Sakharov', description: 'Unabhängige Stimmen für Belarus und Russland.', url: 'https://radiosakharov.org' },
      { id: 'oezgueruez', name: 'Özgürüz', description: 'Unabhängiger Journalismus auf Türkisch.', url: 'https://ozguruz1.org' },
    ],
  },
];
