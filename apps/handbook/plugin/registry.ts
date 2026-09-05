/**
 * Which documents the handbook publishes, and at what address.
 *
 * The handbook renders the repository's own Markdown in place. It never holds a
 * copy: two copies of `ARCHITECTURE.md` would disagree within a month, and the
 * one on the website would be the one nobody edits. So this file maps a path in
 * the repository to a route on the site, and everything else follows from it,
 * including the link rewriting, which needs the mapping in reverse.
 */

export interface DocumentSource {
  /** Stable id, used as the module key and the anchor namespace. */
  id: string;
  /** Repository-relative path. The single source of truth for the content. */
  file: string;
  /** Where it answers on the site. */
  route: string;
  /** What the navigation calls it, which is not always what its h1 says. */
  nav: string;
  /** One line for the navigation and the landing page. */
  blurb: string;
}

/**
 * The fixed documents. Every `adr/0NNN-*.md` is added on top of these by the
 * plugin, because they are a growing set and listing them here would be a second
 * place to forget.
 *
 * `README.md` and `RELEASE.md` are published because they are the two documents
 * that describe how to run and ship the thing, and a developer arriving at the
 * handbook should not have to go back to the repository for them. `AGENTS.md` is
 * published as "Conventions" because that is what it is; its filename is an
 * artefact of which tool reads it first.
 */
export const DOCUMENTS: DocumentSource[] = [
  {
    id: 'architecture',
    file: 'ARCHITECTURE.md',
    route: '/architecture',
    nav: 'Architecture',
    blurb: 'What the system is: one core, four ports, and the article path end to end.',
  },
  {
    id: 'sources',
    file: 'SOURCES.md',
    // Not `/sources`: that is the board built from `content/sources.manifest.ts`,
    // and a route the handbook answers itself shadows a document silently. This
    // document is the record the board is built from, and it carries the part a
    // manifest cannot: the argument, the measurements and their date, and the ten
    // questions somebody has to answer. `test/routes.test.ts` keeps the two sets
    // from colliding again.
    route: '/sources/measured',
    nav: 'Sources, measured',
    blurb: 'The figures behind the board, taken by hand, and the questions they raise.',
  },
  {
    id: 'decisions',
    file: 'adr/README.md',
    route: '/decisions',
    nav: 'Decisions',
    blurb: 'Why the repository is the way it is, and which claims have since expired.',
  },
  {
    id: 'traps',
    file: 'TROUBLESHOOTING.md',
    route: '/traps',
    nav: 'Traps',
    blurb: 'The failures that pass every check, and why a green check is not evidence.',
  },
  {
    id: 'conventions',
    file: 'AGENTS.md',
    route: '/conventions',
    nav: 'Conventions',
    blurb: 'Where code goes, how colour works, and which language goes where.',
  },
  {
    id: 'readme',
    file: 'README.md',
    route: '/readme',
    nav: 'Readme',
    blurb: 'Getting the repository running.',
  },
  {
    id: 'release',
    file: 'RELEASE.md',
    route: '/release',
    nav: 'Release',
    blurb: 'How a build reaches a device and a store.',
  },
];

/** `adr/0022-three-tiers-of-colour.md` and `0022-three-tiers-of-colour.md` both give `0022`. */
export function adrNumber(file: string): string | null {
  return /(?:^|\/)(0\d{3})-[^/]*\.md$/.exec(file)?.[1] ?? null;
}

export function adrRoute(number: string): string {
  return `/decisions/${number}`;
}
