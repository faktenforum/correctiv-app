/**
 * Abriss-Atlas data points — SAMPLE (no public API; static snapshot per the
 * concept's "only hint at it" scope). Modeled on real abriss-atlas.de entries.
 */

export interface DemolitionEntry {
  id: string;
  place: string;
  building: string;
  year: number;
  status: 'gemeldet' | 'bestätigt';
}

export const demolitionEntries: DemolitionEntry[] = [
  { id: 'aa-1', place: 'Essen', building: 'Gründerzeit-Wohnhaus, Rüttenscheider Str.', year: 2026, status: 'bestätigt' },
  { id: 'aa-2', place: 'Leipzig', building: 'Industriehalle Plagwitz', year: 2025, status: 'bestätigt' },
  { id: 'aa-3', place: 'Zürich', building: 'Genossenschaftssiedlung Hardau', year: 2026, status: 'gemeldet' },
  { id: 'aa-4', place: 'Bochum', building: 'Zechenhaus Wattenscheid', year: 2025, status: 'bestätigt' },
];

export const atlasStats = {
  totalReports: 4812,
  citiesCovered: 312,
  url: 'https://abriss-atlas.de',
};
