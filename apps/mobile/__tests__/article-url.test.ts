import { isInternalArticleUrl } from '@/lib/articles/articleUrl';

/**
 * The URL shapes below were read off the live feeds on 2026-08-05, not invented:
 * `curl https://correctiv.org/category/<slug>/feed/`. That matters, because the rule
 * this tests replaced one that had been written from the shape of a single article
 * and silently sent every date-less article to the system browser.
 */
const ARTICLES = [
  // Fact checks and section articles carry a date.
  'https://correctiv.org/faktencheck/2026/08/04/video-zeigt-feiernde-fussballfans-keine-menschen-in-ceuta/',
  'https://correctiv.org/aktuelles/sicherheit-und-verteidigung/2026/06/12/pension-um-jeden-preis-pensionskasse-investitionen-waffen/',
  'https://correctiv.org/wohnen/2026/06/04/wo-reicht-ihr-geld-zum-wohnen-schweiz-miete-kauf-preise/',
  // Spotlight pieces do not — and the briefing on Home links to these.
  'https://correctiv.org/spotlight-newsletter/helfen-sanktionen/',
  'https://correctiv.org/spotlight-newsletter/das-maerchen-von-den-5-prozent/',
];

const NOT_ARTICLES = [
  'https://correctiv.org/', // front page
  'https://correctiv.org/lokal/', // section landing page
  'https://correctiv.org/thema/aktuelles/', // taxonomy
  'https://correctiv.org/category/faktencheck/feed/',
  'https://correctiv.org/wp-json/wp/v2/posts?search=klima',
  'https://correctiv.org/wp-content/uploads/2026/06/bericht.pdf',
  'https://salon5.correctiv.net/podcast/pausenbrot/', // another host
  'https://example.org/aktuelles/2026/08/04/etwas/',
  'http://correctiv.org/faktencheck/2026/08/04/etwas/', // no TLS
  'correctiv://join',
  'not a url at all',
];

describe('links inside an article', () => {
  it.each(ARTICLES)('opens %s in the reader', (url) => {
    expect(isInternalArticleUrl(url)).toBe(true);
  });

  it.each(NOT_ARTICLES)('leaves %s to the browser', (url) => {
    expect(isInternalArticleUrl(url)).toBe(false);
  });
});
