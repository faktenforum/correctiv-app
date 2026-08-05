import { formatDateDe } from '@correctiv/app-core/lib/format';

import { THEME_CSS } from '@/lib/theme/readerCss.generated';
import { READER_FONTS_CSS } from '@/lib/theme/readerFonts.generated';
import type { FactcheckRating } from '@/lib/articles/types';

export interface ReaderArticle {
  title: string;
  badge?: string;
  authors: string[];
  publishedAt: string;
  readingMinutes: number;
  heroImageUrl?: string;
  excerpt: string;
  bodyHtml: string;
  rating?: FactcheckRating;
}

const RATING_LABEL: Record<FactcheckRating, string> = {
  falsch: 'Falsch',
  'groesstenteils-falsch': 'Größtenteils falsch',
  'fehlender-kontext': 'Fehlender Kontext',
  unbelegt: 'Unbelegt',
  manipuliert: 'Manipuliert',
  'groesstenteils-richtig': 'Größtenteils richtig',
  richtig: 'Richtig',
};
// Plaketten-Farbe je Bewertung (Rot = Marke; übrige aus Grau/Gelb-Logik).
const RATING_BG: Record<FactcheckRating, string> = {
  falsch: '#ff5064',
  'groesstenteils-falsch': '#ff5064',
  manipuliert: '#ff5064',
  'fehlender-kontext': '#fde162',
  unbelegt: '#fde162',
  'groesstenteils-richtig': '#707070',
  richtig: '#707070',
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Reader-Layout auf Basis der --var-*-Tokens (24-px-Raster, Merriweather-Body,
// Source-Sans-Zwischenüberschriften, keine Schatten — Hairlines + Flächen).
const LAYOUT_CSS = `
*{margin:0;padding:0;box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{background:var(--var-color-grey-100);color:var(--var-color-grey-700);
  font-family:'Merriweather',Georgia,serif;
  font-size:var(--var-font-size-text-article);line-height:var(--var-leading-looser);
  letter-spacing:var(--var-letter-spacing-wider);padding:0 var(--var-spacing-m) var(--var-spacing-3xl)}
.hero{width:calc(100% + 2*var(--var-spacing-m));margin:0 calc(-1*var(--var-spacing-m)) var(--var-spacing-m);
  display:block;aspect-ratio:16/9;object-fit:cover;background:var(--var-color-grey-200)}
.badge{display:inline-block;font-family:'SourceSans3',sans-serif;font-weight:600;font-size:11px;
  letter-spacing:.4px;text-transform:uppercase;color:#fff;background:var(--var-color-emphasis);
  padding:3px 8px;border-radius:var(--var-radius-s);margin-bottom:var(--var-spacing-xs)}
.plaque{display:inline-block;font-family:'SourceSans3',sans-serif;font-weight:700;font-size:13px;
  letter-spacing:.3px;text-transform:uppercase;padding:6px 12px;border-radius:var(--var-radius-md);
  margin-bottom:var(--var-spacing-s)}
h1{font-family:'Merriweather',Georgia,serif;font-weight:700;font-size:var(--var-font-size-headline-xl);
  line-height:var(--var-leading-tight);letter-spacing:var(--var-letter-spacing-tighter);
  margin-bottom:var(--var-spacing-s)}
.meta{font-family:'SourceSans3',sans-serif;font-size:var(--var-font-size-text-s);
  color:var(--var-color-grey-600);letter-spacing:0;margin-bottom:var(--var-spacing-m);
  padding-bottom:var(--var-spacing-m);border-bottom:1px solid var(--var-color-grey-300)}
.lead{font-family:'Merriweather',Georgia,serif;font-style:italic;color:var(--var-color-grey-600);
  font-size:var(--var-font-size-text-l);line-height:var(--var-leading-relaxed);
  margin-bottom:var(--var-spacing-m)}
.content p{margin-bottom:var(--var-spacing-m)}
.content h2{font-family:'SourceSans3',sans-serif;font-weight:700;font-size:var(--var-font-size-headline-m);
  line-height:var(--var-leading-snug);letter-spacing:0;margin:var(--var-spacing-l) 0 var(--var-spacing-xs)}
.content h3{font-family:'SourceSans3',sans-serif;font-weight:700;font-size:var(--var-font-size-headline-s);
  margin:var(--var-spacing-m) 0 var(--var-spacing-2xs)}
.content a{color:var(--var-color-emphasis);text-decoration:none}
.content img{max-width:100%;height:auto;border-radius:var(--var-radius-md);margin:var(--var-spacing-xs) 0}
.content figure{margin:var(--var-spacing-m) 0}
.content figcaption{font-family:'SourceSans3',sans-serif;font-size:var(--var-font-size-text-s);
  color:var(--var-color-grey-600);margin-top:var(--var-spacing-2xs)}
.content ul,.content ol{margin:0 0 var(--var-spacing-m) var(--var-spacing-m)}
.content li{margin-bottom:var(--var-spacing-2xs)}
.content blockquote{border-left:3px solid var(--var-color-emphasis);
  padding-left:var(--var-spacing-s);margin:var(--var-spacing-m) 0;color:var(--var-color-grey-600)}
.support{margin-top:var(--var-spacing-xl);background:var(--var-color-grey-200);
  border-radius:var(--var-radius-md);padding:var(--var-spacing-l);text-align:center}
.support p{font-family:'SourceSans3',sans-serif;color:var(--var-color-grey-700);
  font-size:var(--var-font-size-text-m);line-height:var(--var-leading-loose);margin-bottom:var(--var-spacing-s)}
.support a{display:inline-block;font-family:'SourceSans3',sans-serif;font-weight:700;
  background:var(--var-color-emphasis);color:#fff;text-decoration:none;
  padding:var(--var-spacing-s) var(--var-spacing-m);border-radius:var(--var-radius-md)}
`;

/** Baut das vollständige HTML-Dokument für die Reader-WebView (offline-fähig). */
export function buildReaderHtml(article: ReaderArticle): string {
  const meta = [
    article.authors.length ? `von ${article.authors.join(', ')}` : '',
    formatDateDe(article.publishedAt),
    `${article.readingMinutes} Min. Lesezeit`,
  ]
    .filter(Boolean)
    .join('  ·  ');

  const hero = article.heroImageUrl
    ? `<img class="hero" src="${escapeHtml(article.heroImageUrl)}" alt="">`
    : '';
  const badge = article.badge ? `<span class="badge">${escapeHtml(article.badge)}</span>` : '';
  const plaque = article.rating
    ? `<div class="plaque" style="background:${RATING_BG[article.rating]};color:${
        article.rating === 'fehlender-kontext' || article.rating === 'unbelegt' ? '#333' : '#fff'
      }">Bewertung: ${RATING_LABEL[article.rating]}</div>`
    : '';
  const lead = article.excerpt ? `<p class="lead">${escapeHtml(article.excerpt)}</p>` : '';

  return `<!DOCTYPE html><html lang="de"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<style>${READER_FONTS_CSS}${THEME_CSS}${LAYOUT_CSS}</style>
</head><body>
<article>
${hero}
${badge}
${plaque}
<h1>${escapeHtml(article.title)}</h1>
<div class="meta">${escapeHtml(meta)}</div>
${lead}
<div class="content">${article.bodyHtml}</div>
<div class="support">
<p>Diese Recherche war nur möglich durch Unterstützer:innen wie Sie.</p>
<a href="correctiv://join">Unterstützer:in werden</a>
</div>
</article>
</body></html>`;
}
