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
      { route: '/reference', label: 'Reference' },
    ],
  },
  {
    label: 'Content',
    open: true,
    items: [{ route: '/sources', label: 'Sources', blurb: doc('/sources')?.blurb }],
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

/** Every route the site answers, for the router and for the search index. */
export const ROUTES = new Set<string>([
  '/',
  '/diagrams',
  '/reference',
  '/workbench',
  ...docs.docs.map((d) => d.route),
]);
