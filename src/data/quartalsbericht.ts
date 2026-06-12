/**
 * Quarterly transparency report — SAMPLE built from real CORRECTIV
 * transparency material (correctiv.org/ueber-uns/finanzen).
 */

export interface ReportFigure {
  label: string;
  value: string;
}

export interface ReportSection {
  heading: string;
  text: string;
  figures?: ReportFigure[];
}

export const quarterlyReport = {
  quarter: 'Quartalsbericht 1/2026',
  intro:
    'Transparenz ist Teil unseres Auftrags: Hier legen wir offen, woher unsere Mittel kommen und wofür wir sie einsetzen.',
  sections: [
    {
      heading: 'Woher die Mittel kommen',
      text: 'CORRECTIV finanziert sich überwiegend durch Spenden und Mitgliedsbeiträge sowie durch Stiftungsförderungen für einzelne Projekte.',
      figures: [
        { label: 'Spenden & Mitgliedschaften', value: '58 %' },
        { label: 'Stiftungen & Förderungen', value: '34 %' },
        { label: 'Sonstige Erlöse (Verlag, Workshops)', value: '8 %' },
      ],
    },
    {
      heading: 'Wofür wir sie einsetzen',
      text: 'Der größte Teil fließt direkt in Recherche und Redaktion — von Investigativrecherchen über Faktenchecks bis zu Salon5 und der Reporterfabrik.',
      figures: [
        { label: 'Redaktion & Recherche', value: '64 %' },
        { label: 'Bildung (Salon5, Reporterfabrik)', value: '19 %' },
        { label: 'Verwaltung & Infrastruktur', value: '17 %' },
      ],
    },
    {
      heading: 'Das hat Ihr Beitrag bewirkt',
      text: 'Im ersten Quartal erschienen 61 Recherchen und über 180 Faktenchecks. Die Pensionskassen-Recherche führte zu zwei parlamentarischen Anfragen; nach unseren Klimarecherchen kündigten drei Großstädte an, ihre Wärmeplanung offenzulegen.',
    },
  ] as ReportSection[],
};
