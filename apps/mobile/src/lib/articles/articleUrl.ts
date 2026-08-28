/**
 * Paths on correctiv.org that list or serve rather than read: taxonomy pages, the
 * WordPress plumbing, and file downloads. Everything else with at least a section
 * and a slug is an article.
 */
const LISTING =
  /^\/(?:category|thema|tag|autor|author|suche|search|seite|page|feed|wp-json|wp-content|wp-admin)(?:\/|$)/;
const FILE = /\.(?:pdf|jpe?g|png|gif|svg|zip|csv|xlsx?|docx?|mp3|mp4)$/i;

/**
 * Whether a link inside an article should open in the reader rather than the
 * system browser.
 *
 * The rule used to require a date in the path (`/faktencheck/2026/08/04/…`), which
 * is what most articles look like — but not all of them: Spotlight pieces live at
 * `correctiv.org/spotlight-newsletter/<slug>/` with no date, and those are exactly
 * the articles this app links to most, from the briefing on Home. Every one of them
 * left the app.
 *
 * So the test is inverted: internal unless the path is a listing, a file, or too
 * short to be an article. A bare section (`/lokal/`) is a landing page and belongs
 * in the browser. Should this still guess wrong, the reader's error state offers
 * "im Browser öffnen" — a misjudgement costs one tap, not the article.
 */
export function isInternalArticleUrl(target: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(target);
  } catch {
    return false;
  }
  if (parsed.protocol !== 'https:' || parsed.hostname !== 'correctiv.org') return false;
  if (LISTING.test(parsed.pathname) || FILE.test(parsed.pathname)) return false;
  return parsed.pathname.split('/').filter(Boolean).length >= 2;
}
