/**
 * Spotlight briefing — SAMPLE (the newsletter archive is not public, see
 * DATENQUELLEN.md). Modeled on the structure and tone of real Spotlight issues;
 * article links point to actually existing correctiv.org articles from the
 * offline bundle so the briefing is clickable offline as well.
 */
export interface SpotlightItem {
  time: string;
  title: string;
  text: string;
  articleUrl?: string;
}

export interface SpotlightIssue {
  id: string;
  /** ISO date */
  date: string;
  subject: string;
  items: SpotlightItem[];
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(7, 30, 0, 0);
  return d.toISOString();
}

export const spotlightIssues: SpotlightIssue[] = [
  {
    id: 'spotlight-heute',
    date: daysAgo(0),
    subject: 'Das Wichtigste heute',
    items: [
      {
        time: '06:58',
        title: 'KI-Fake zur US-Botschaft in Kiew',
        text: 'Ein Bild soll die Evakuierung der US-Botschaft in Kiew zeigen — Grok hält es für echt, Community Notes auch. Beide liegen falsch: Das Bild ist KI-generiert.',
        articleUrl:
          'https://correctiv.org/faktencheck/2026/06/12/usa-botschaft-in-kiew-wurde-nicht-evakuiert-grok-und-community-notes-liegen-bei-ki-fake-falsch/',
      },
      {
        time: '07:12',
        title: 'Pensionskassen investieren in Rüstung',
        text: 'Unsere Recherche zeigt, wie Pensionskassen Beiträge in Waffengeschäfte stecken — oft ohne Wissen der Versicherten.',
        articleUrl:
          'https://correctiv.org/aktuelles/sicherheit-und-verteidigung/2026/06/12/pension-um-jeden-preis-pensionskasse-investitionen-waffen/',
      },
      {
        time: '07:25',
        title: 'Großstädte warnen vor neuem Heizungsgesetz',
        text: 'Mehrere Großstädte sehen die kommunale Wärmeplanung durch die Reform gefährdet. Die Dokumente liegen CORRECTIV vor.',
        articleUrl: 'https://correctiv.org/aktuelles/klimawandel/2026/06/10/grossstaedte-warnen-vor-reiches-heizungsgesetz/',
      },
    ],
  },
  {
    id: 'spotlight-gestern',
    date: daysAgo(1),
    subject: 'Das Wichtigste gestern',
    items: [
      {
        time: '07:02',
        title: 'Deepfakes mit ZDF-Moderator weiter online',
        text: 'Trotz Hinweisen bleiben gefälschte Videos mit Christian Sievers auf TikTok abrufbar. Die Plattform reagiert schleppend.',
        articleUrl:
          'https://correctiv.org/faktencheck/2026/06/12/deepfakes-mit-zdf-moderator-christian-sievers-weiter-bei-tiktok-online/',
      },
      {
        time: '07:18',
        title: 'Die perfekte Frau der Autokraten',
        text: 'Wie autoritäre Bewegungen ein Frauenideal konstruieren — und was das über ihre Gesellschaftsbilder verrät.',
        articleUrl: 'https://correctiv.org/aktuelles/international/2026/06/12/die-perfekte-frau-wie-autokraten-ein-ideal-erschaffen/',
      },
      {
        time: '07:31',
        title: 'Neuer Höchststand bei Förderschülern',
        text: 'Immer mehr Kinder besuchen Förderschulen — die Inklusion stockt. Die Zahlen im Überblick.',
        articleUrl: 'https://correctiv.org/aktuelles/bildung/2026/06/12/neuer-hoechststand-bei-foerderschuelern/',
      },
    ],
  },
  {
    id: 'spotlight-vorgestern',
    date: daysAgo(2),
    subject: 'Das Wichtigste am Mittwoch',
    items: [
      {
        time: '07:05',
        title: 'Dürre bedroht Europas Landwirtschaft',
        text: 'Wassermangel setzt Bauern in ganz Europa zu. Unsere Klima-Redaktion hat die Daten ausgewertet.',
        articleUrl: 'https://correctiv.org/aktuelles/klimawandel/2026/06/11/duerre-trockenheit-wassermangel-landwirtschaft-europa/',
      },
      {
        time: '07:20',
        title: 'Wo reicht Ihr Geld zum Wohnen?',
        text: 'CORRECTIV.Schweiz hat Miet- und Kaufpreise verglichen — ein interaktiver Überblick.',
        articleUrl: 'https://correctiv.org/wohnen/2026/06/04/wo-reicht-ihr-geld-zum-wohnen-schweiz-miete-kauf-preise/',
      },
      {
        time: '07:33',
        title: 'Sieben Forderungen für den Lokaljournalismus',
        text: 'Was sich ändern muss, damit lokale Recherchen überleben — das Netzwerk CORRECTIV.Lokal legt vor.',
        articleUrl: 'https://correctiv.org/in-eigener-sache/2025/05/28/sieben-forderungen-um-lokaljournalismus-zu-verbessern/',
      },
    ],
  },
];
