/**
 * CORRECTIV Verlag products — SAMPLE; real titles from shop.correctiv.org.
 * Shop integration stays a deep link (teaser scope per the concept).
 */

export interface VerlagProduct {
  id: string;
  title: string;
  kind: 'Buch' | 'Bookzine' | 'E-Book';
  price: string;
  url: string;
}

export const verlagProducts: VerlagProduct[] = [
  {
    id: 'akten-des-missbrauchs',
    title: 'Akten des Missbrauchs',
    kind: 'Buch',
    price: '26 €',
    url: 'https://shop.correctiv.org',
  },
  {
    id: '100-karten-rechtsextremismus',
    title: '100 Karten über Rechtsextremismus',
    kind: 'Buch',
    price: '22 €',
    url: 'https://shop.correctiv.org',
  },
  {
    id: 'bookzine-q2',
    title: 'CORRECTIV Bookzine — Ausgabe 2/2026',
    kind: 'Bookzine',
    price: '15 €',
    url: 'https://shop.correctiv.org',
  },
];
