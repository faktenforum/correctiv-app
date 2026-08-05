/**
 * Artikel-Extraktion gegen eine echte, gespeicherte correctiv.org-Seite. Erkennt
 * Markup-Drift im WordPress-Theme (`.detail__*`) und prüft das Sanitizing.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { extractArticle } from '../src/lib/articles/extract';

const html = readFileSync(resolve(__dirname, '..', '__fixtures__', 'articles', 'faktencheck-1.html'), 'utf8');
const article = extractArticle(html);

describe('extractArticle (correctiv.org Faktencheck)', () => {
  it('liest Titel, Lead, Autor:innen und Datum', () => {
    expect(article.title).toContain('Deutschlandfahne');
    expect(article.excerpt.length).toBeGreaterThan(20);
    expect(article.authors).toContain('Steffen Kutzner');
    expect(article.publishedAt).toMatch(/^2026-06-12T/);
  });

  it('zieht das Titelbild aus og:image', () => {
    expect(article.heroImageUrl).toMatch(/^https:\/\/correctiv\.org\/wp-content\/uploads\//);
  });

  it('extrahiert bereinigten Body ohne script/style/iframe und ohne Attribute-Müll', () => {
    expect(article.bodyHtml.length).toBeGreaterThan(500);
    expect(article.bodyHtml).not.toMatch(/<script|<style|<iframe|<form/i);
    expect(article.bodyHtml).not.toMatch(/style="/i); // Style-Attribute entfernt
    expect(article.bodyHtml).not.toMatch(/ class="/i); // Klassen entfernt
    expect(article.bodyHtml).toMatch(/<p>/); // echte Absätze erhalten
  });

  it('berechnet eine plausible Lesezeit', () => {
    expect(article.readingMinutes).toBeGreaterThanOrEqual(1);
    expect(article.readingMinutes).toBeLessThan(60);
  });
});
