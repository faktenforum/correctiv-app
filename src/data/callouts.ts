/**
 * CrowdNewsroom-Callouts — SAMPLE im Beabee-CalloutDto-Schema
 * (https://github.com/beabee-communityrm — formSchema mit Formio-artigen
 * Slides/Components), damit Phase 3 nur den Daten-Layer tauschen muss.
 * Inhalte: echte bzw. konzeptgetreue CORRECTIV-Aufrufe.
 */

export interface CalloutComponent {
  key: string;
  type: 'radio' | 'selectboxes' | 'textarea' | 'textfield' | 'file';
  label: string;
  description?: string;
  required?: boolean;
  values?: { label: string; value: string }[];
  placeholder?: string;
}

export interface CalloutSlide {
  id: string;
  title: string;
  components: CalloutComponent[];
}

export interface Callout {
  slug: string;
  title: string;
  excerpt: string;
  intro: string[];
  image: string | null;
  starts: string;
  expires: string | null;
  status: 'open' | 'ended';
  responseCount: number;
  /** Wer fragt, und was passiert mit den Daten — Datenschutz-Klartext */
  whoAsks: string;
  dataUse: string;
  formSchema: { slides: CalloutSlide[] };
}

export const callouts: Callout[] = [
  {
    slug: 'zukunft-von-correctiv',
    title: 'Die Zukunft von CORRECTIV: Wir fragen Sie',
    excerpt:
      'CORRECTIV verändert sich — und Sie gestalten mit. Was sollen wir recherchieren, welche Formate fehlen Ihnen?',
    intro: [
      'CORRECTIV gehört niemandem. Außer allen. Deshalb fragen wir Sie: Wohin soll sich CORRECTIV entwickeln?',
      'Ihre Antworten fließen direkt in unsere Strategie ein — von der Themenwahl bis zu neuen Formaten wie dieser App.',
    ],
    image: null,
    starts: '2026-06-12T00:00:00+02:00',
    expires: null,
    status: 'open',
    responseCount: 2143,
    whoAsks: 'Das CORRECTIV-Team, Redaktionsleitung',
    dataUse:
      'Ihre Antworten werden anonym ausgewertet. Kontaktdaten sind freiwillig und werden nur für Rückfragen genutzt, nie veröffentlicht.',
    formSchema: {
      slides: [
        {
          id: 'themen',
          title: 'Was sollen wir recherchieren?',
          components: [
            {
              key: 'themen',
              type: 'selectboxes',
              label: 'Welche Themen sind Ihnen am wichtigsten?',
              required: true,
              values: [
                { label: 'Rechtsextremismus & Demokratie', value: 'demokratie' },
                { label: 'Klima & Umwelt', value: 'klima' },
                { label: 'Gesundheit & Pflege', value: 'gesundheit' },
                { label: 'Desinformation & Faktenchecks', value: 'faktencheck' },
                { label: 'Lokales aus meiner Region', value: 'lokal' },
              ],
            },
          ],
        },
        {
          id: 'formate',
          title: 'Wie möchten Sie CORRECTIV nutzen?',
          components: [
            {
              key: 'wunsch',
              type: 'textarea',
              label: 'Was fehlt Ihnen bei CORRECTIV bisher?',
              placeholder: 'Ihre Antwort …',
              required: true,
            },
          ],
        },
        {
          id: 'kontakt',
          title: 'Fast geschafft',
          components: [
            {
              key: 'kontakt',
              type: 'textfield',
              label: 'E-Mail für Rückfragen (optional)',
              placeholder: 'name@beispiel.de',
              required: false,
            },
          ],
        },
      ],
    },
  },
  {
    slug: 'wem-gehoert-die-stadt',
    title: 'Wem gehört die Stadt?',
    excerpt:
      'Steigende Mieten, anonyme Eigentümer: Helfen Sie uns aufzudecken, wem die Häuser in Ihrer Nachbarschaft gehören.',
    intro: [
      'In vielen Städten wissen nicht einmal die Mieter:innen, wem ihr Haus gehört. Briefkastenfirmen verschleiern die Besitzverhältnisse.',
      'Mit Ihren Hinweisen kartieren wir die Eigentumsstrukturen — Grundlage für lokale Recherchen im ganzen Land.',
    ],
    image: null,
    starts: '2026-05-02T00:00:00+02:00',
    expires: null,
    status: 'open',
    responseCount: 1857,
    whoAsks: 'CORRECTIV.Lokal mit Partnerredaktionen',
    dataUse:
      'Adressdaten nutzen wir ausschließlich für die Recherche. Persönliche Daten werden vor Veröffentlichung entfernt; Ihre Identität bleibt auf Wunsch geschützt.',
    formSchema: {
      slides: [
        {
          id: 'objekt',
          title: 'Um welches Haus geht es?',
          components: [
            {
              key: 'situation',
              type: 'radio',
              label: 'Was beschreibt Ihre Situation am besten?',
              required: true,
              values: [
                { label: 'Meine Miete ist stark gestiegen', value: 'miete' },
                { label: 'Eigentümer ist nicht auffindbar', value: 'anonym' },
                { label: 'Haus steht absichtlich leer', value: 'leerstand' },
                { label: 'Anderes', value: 'anderes' },
              ],
            },
            {
              key: 'beschreibung',
              type: 'textarea',
              label: 'Was haben Sie beobachtet?',
              placeholder: 'Beschreiben Sie die Situation …',
              required: true,
            },
          ],
        },
        {
          id: 'beleg',
          title: 'Haben Sie Unterlagen?',
          components: [
            {
              key: 'foto',
              type: 'file',
              label: 'Foto oder Dokument anhängen (optional)',
              description: 'Z. B. Schreiben der Hausverwaltung — hilft bei der Verifikation.',
              required: false,
            },
          ],
        },
        {
          id: 'kontakt',
          title: 'Fast geschafft',
          components: [
            {
              key: 'kontakt',
              type: 'textfield',
              label: 'E-Mail für Rückfragen (optional)',
              placeholder: 'name@beispiel.de',
              required: false,
            },
          ],
        },
      ],
    },
  },
  {
    slug: 'klimaanpassung-vor-ort',
    title: 'Hitze, Starkregen, Dürre: Wie gut ist Ihr Ort vorbereitet?',
    excerpt:
      'Klimafolgen treffen Kommunen unterschiedlich hart. Berichten Sie uns, was vor Ihrer Haustür passiert — oder eben nicht.',
    intro: [
      'Hitzeaktionspläne, Versickerungsflächen, Trinkbrunnen: Auf dem Papier sind viele Kommunen vorbereitet. Und in der Realität?',
      'Ihre Beobachtungen fließen in die Datenrecherche unserer Klima-Redaktion ein.',
    ],
    image: null,
    starts: '2026-04-14T00:00:00+02:00',
    expires: '2026-07-31T23:59:00+02:00',
    status: 'open',
    responseCount: 612,
    whoAsks: 'CORRECTIV-Klimaredaktion',
    dataUse: 'Ortsangaben werden nur auf Gemeindeebene ausgewertet und veröffentlicht.',
    formSchema: {
      slides: [
        {
          id: 'beobachtung',
          title: 'Ihre Beobachtung',
          components: [
            {
              key: 'kategorie',
              type: 'radio',
              label: 'Worum geht es?',
              required: true,
              values: [
                { label: 'Hitze in der Stadt', value: 'hitze' },
                { label: 'Überflutung / Starkregen', value: 'starkregen' },
                { label: 'Dürre / Wassermangel', value: 'duerre' },
              ],
            },
            {
              key: 'beschreibung',
              type: 'textarea',
              label: 'Was haben Sie beobachtet?',
              required: true,
            },
          ],
        },
        {
          id: 'kontakt',
          title: 'Fast geschafft',
          components: [
            {
              key: 'ort',
              type: 'textfield',
              label: 'Ihre Gemeinde',
              placeholder: 'z. B. Bottrop',
              required: true,
            },
          ],
        },
      ],
    },
  },
];
