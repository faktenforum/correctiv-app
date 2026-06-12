/**
 * Backstage-Inhalte — SAMPLE (redaktionelle Club-Inhalte existieren noch nicht
 * als API). Beispiele aus dem Konzept, verknüpft mit echten Artikeln aus dem
 * Offline-Bundle, damit Early-Access nach dem Status-Flip wirklich öffnet.
 */

export interface EarlyAccessItem {
  id: string;
  title: string;
  teaser: string;
  /** Wochentag-Label für „Für alle ab …“ */
  publicFromLabel: string;
  /** ISO-Zeitpunkt für den Countdown */
  publicFromIso: string;
  articleUrl: string;
}

export interface DiaryEntry {
  id: string;
  series: string;
  title: string;
  teaser: string;
  date: string;
  body: string[];
}

export interface BonusMedia {
  id: string;
  kind: 'audio' | 'video';
  title: string;
  teaser: string;
  durationLabel: string;
  /** Pfad relativ zum App-Ordner oder URL */
  source: string;
  club: true;
}

function nextMonday(): Date {
  const d = new Date();
  const day = d.getDay();
  const diff = (8 - day) % 7 || 7;
  d.setDate(d.getDate() + diff);
  d.setHours(6, 0, 0, 0);
  return d;
}

export const earlyAccess: EarlyAccessItem = {
  id: 'early-pensionskassen',
  title: 'Pension um jeden Preis: Wie Pensionskassen in Waffen investieren',
  teaser:
    'Beiträge von Versicherten fließen in Rüstungsgeschäfte — oft ohne deren Wissen. Die ganze Recherche, für Clubmitglieder schon jetzt.',
  publicFromLabel: 'Montag',
  publicFromIso: nextMonday().toISOString(),
  articleUrl:
    'https://correctiv.org/aktuelles/sicherheit-und-verteidigung/2026/06/12/pension-um-jeden-preis-pensionskasse-investitionen-waffen/',
};

export const diaries: DiaryEntry[] = [
  {
    id: 'diary-bern-3',
    series: 'Pensionskassen-Recherche',
    title: 'Woche 3: Die Spur führt nach Bern',
    teaser:
      'Ein anonymer Hinweis, ein Aktenordner und eine Adresse in der Bundesstadt — wie wir den Verbindungen der Fonds nachgegangen sind.',
    date: new Date(Date.now() - 2 * 864e5).toISOString(),
    body: [
      'Der Umschlag lag am Dienstag im Briefkasten der Redaktion: keine Absenderin, kein Begleitschreiben, nur Kontoauszüge eines Anlagevehikels mit Sitz in Bern.',
      'Wir haben die Nummern mit den Jahresberichten dreier Pensionskassen abgeglichen. Zwei Treffer. Die dritte Spur führt zu einer Briefkastenfirma, deren Verwaltungsrat uns bekannt vorkam — aus einer ganz anderen Recherche.',
      'Nächste Woche: Was die Aufsichtsbehörde wusste, und seit wann.',
    ],
  },
  {
    id: 'diary-bern-2',
    series: 'Pensionskassen-Recherche',
    title: 'Woche 2: Zahlen, die nicht zusammenpassen',
    teaser: 'Die Renditeangaben im Geschäftsbericht widersprechen den internen Unterlagen. Wir rechnen nach.',
    date: new Date(Date.now() - 9 * 864e5).toISOString(),
    body: [
      'Wer Geschäftsberichte liest, braucht Geduld — und ein gutes Tabellenprogramm. Die ausgewiesene Rendite von 4,2 Prozent hält der Überprüfung nicht stand.',
      'Drei unabhängige Fachleute kommen auf Werte zwischen 2,8 und 3,1 Prozent. Die Differenz: genau jene Posten, die in den Fußnoten verschwinden.',
    ],
  },
];

export const bonusMedia: BonusMedia[] = [
  {
    id: 'bonus-pensionskassen-audio',
    kind: 'audio',
    title: 'Bonusfolge: Wie wir an die Pensionskassen-Daten kamen',
    teaser:
      'Die Reporterinnen erzählen, wie aus einem anonymen Umschlag eine Recherche wurde — und warum der schwierigste Teil die Verifikation war.',
    durationLabel: '23 Min.',
    source: 'assets/audio/sample-episode.mp3',
    club: true,
  },
];

export const clubNewsletter = {
  subject: 'Backstage-Brief: Was diese Woche im Newsroom passiert ist',
  date: new Date(Date.now() - 864e5).toISOString(),
  paragraphs: [
    'Liebe Clubmitglieder, diese Woche war laut: Die Pensionskassen-Recherche ist online gegangen, und die ersten Reaktionen aus der Politik ließen keine 24 Stunden auf sich warten.',
    'Hinter den Kulissen arbeiten wir an zwei neuen Projekten — eines davon führt uns in die Schweiz, mehr dazu im Recherchetagebuch.',
    'Danke, dass Sie das möglich machen.',
  ],
};

export const qa = {
  title: 'Fragen Sie die Pensionskassen-Reporterinnen',
  description:
    'Sophie Timmermann und das Rechercheteam beantworten Ihre Fragen zur Recherche — die Antworten erscheinen hier im Backstage.',
  deadlineLabel: 'Fragen bis Sonntag einreichen',
};

export const events = [
  {
    id: 'event-buchpremiere',
    title: 'Buchpremiere: „Akten des Missbrauchs“',
    date: '2026-06-25T19:00:00+02:00',
    location: 'CORRECTIV-Buchhandlung, Essen',
    description: 'Lesung und Gespräch mit dem Rechercheteam. Clubmitglieder erhalten bevorzugt Plätze.',
  },
];

export const verlagPerk = {
  title: 'Ihr Bookzine des Quartals',
  description:
    'Als Clubmitglied liegt das aktuelle Bookzine des CORRECTIV Verlags für Sie bereit — dazu 20 % Rabatt im Shop mit dem Code CLUB20.',
  shopUrl: 'https://shop.correctiv.org',
  code: 'CLUB20',
};
