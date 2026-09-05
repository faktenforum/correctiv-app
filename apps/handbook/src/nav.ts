import docs from 'virtual:docs';

export interface NavItem {
  route: string;
  label: string;
  /** The record number, where this is one. Rendered in its own column. */
  number?: string;
  blurb?: string;
}

export interface NavGroup {
  label: string;
  /** Open in the sidebar without a click. Decisions is long and worth scanning. */
  open: boolean;
  items: NavItem[];
}

const doc = (route: string) => docs.docs.find((d) => d.route === route);

/** The records, in number order, titled by their own h1 rather than by a list here. */
export const RECORDS: NavItem[] = docs.docs
  .filter((d) => d.route.startsWith('/decisions/'))
  .map((d) => ({
    route: d.route,
    number: d.route.slice('/decisions/'.length),
    // "ADR 0022 — Three tiers of colour" reads as the number twice in a row once
    // the number has its own column, so the prefix comes off here.
    label: d.title.replace(/^ADR\s*0\d{3}\s*[—–-]\s*/, ''),
  }));

export const NAV: NavGroup[] = [
  {
    label: 'Start',
    open: true,
    items: [
      { route: '/', label: 'Overview' },
      { route: '/architecture', label: 'Architecture', blurb: doc('/architecture')?.blurb },
      { route: '/diagrams', label: 'Diagrams' },
      { route: '/design', label: 'Design' },
      { route: '/reference', label: 'Reference' },
    ],
  },
  {
    label: 'Content',
    open: true,
    items: [
      { route: '/sources', label: 'Sources' },
      {
        route: '/sources/measured',
        label: 'Sources, measured',
        blurb: doc('/sources/measured')?.blurb,
      },
    ],
  },
  { label: 'Decisions', open: true, items: RECORDS },
  {
    label: 'Working here',
    open: false,
    items: [
      { route: '/conventions', label: 'Conventions' },
      { route: '/traps', label: 'Traps' },
      { route: '/readme', label: 'Readme' },
      { route: '/release', label: 'Release' },
    ],
  },
  { label: 'The app', open: false, items: [{ route: '/workbench', label: 'Workbench' }] },
];

/**
 * What each self-answered route is called, for the browser tab and the palette.
 *
 * The document routes take their title from the document's own h1. These have no
 * document, and deriving a title from the path gave "workbench — Handbook" in
 * lower case, which is what a route is named and not what a page is called.
 */
export const PAGE_TITLES: Record<string, string> = {
  '/': 'CORRECTIV app handbook',
  '/design': 'Design, the Figma file',
  '/diagrams': 'Architecture diagrams',
  '/reference': 'Reference',
  '/sources': 'Sources status board',
  '/workbench': 'Workbench',
};

/** Every route the site answers, for the router and for the search index. */
export const ROUTES = new Set<string>([
  '/',
  '/design',
  '/diagrams',
  '/reference',
  '/workbench',
  ...docs.docs.map((d) => d.route),
]);

/**
 * The anchor the reference gives each symbol, and the palette jumps to.
 *
 * Here rather than in either of them: two places deriving the same id is how a
 * search result quietly stops landing anywhere.
 */
export function symbolId(subpath: string, name: string): string {
  return `s-${subpath.replace(/\//g, '-')}-${name}`;
}
