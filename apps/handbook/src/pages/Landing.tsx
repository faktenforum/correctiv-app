import { COUNTS, MEASURED_ON } from '../../content/sources.manifest';
import docsModule from 'virtual:docs';
import { href } from '../router';

interface Door {
  route: string;
  kind: string;
  title: string;
  blurb: string;
  primary?: boolean;
}

const DOORS: Door[] = [
  {
    route: '/sources',
    kind: 'Inventory',
    title: 'Sources',
    blurb:
      'For everything the app shows: whether it is a live source, a file standing in for an API that does not exist yet, or a wanted feature with nothing to read at all.',
    primary: true,
  },
  {
    route: '/workbench',
    kind: 'The app',
    title: 'Workbench',
    blurb:
      'The app itself in a device frame, with an inspector for its state, its console, its palette and its layout.',
    primary: true,
  },
  {
    route: '/architecture',
    kind: 'Explanation',
    title: 'Architecture',
    blurb: 'One core, four ports, and the article path end to end.',
  },
  {
    route: '/decisions',
    kind: 'Records',
    title: 'Decisions',
    blurb: 'Why the repository is the way it is, and which of its claims have since expired.',
  },
  {
    route: '/diagrams',
    kind: 'Drawn',
    title: 'Diagrams',
    blurb: 'The core and its host, the decisions and what they retire, and the core’s own layers.',
  },
];

const RECORDS = docsModule.docs.filter((d) => d.route.startsWith('/decisions/')).length;
const RETIRED = docsModule.docs.reduce((n, d) => n + d.retired.length, 0);

/**
 * The front page, which is an introduction and not a dashboard.
 *
 * Every figure on it comes from `content/sources.manifest.ts` or from the parsed
 * documents, never from a number typed here. Two of them were typed by hand in
 * the first draft and disagreed with the sources page by four, which is exactly
 * the failure a website makes easy: two pages, two counts, both confident.
 */
export function Landing() {
  return (
    <main className="wrap landing" id="content">
      <section className="intro">
        <h1 id="title">The CORRECTIV app, and everything written down about it</h1>
        <p className="lead">
          A community app for CORRECTIV members, built as one platform-free core with the Expo app
          as its host. The core holds every piece of behaviour and imports no UI framework and no
          platform SDK, which is why replacing the whole view layer once cost no behaviour at all.
        </p>
        <p className="bridge">
          This handbook publishes the repository’s own documents, unchanged and in place, and puts
          the running app next to them.
        </p>
      </section>

      <section className="status" aria-labelledby="status-heading">
        <div className="status-about">
          <h2 id="status-heading">What the app reads</h2>
          <p className="caption">
            Counted from the source manifest. The underlying figures were measured by hand against
            the live sources on {MEASURED_ON} and nothing here refreshes: a browser cannot re-take
            them, because the feeds send no CORS header.
          </p>
        </div>
        <dl className="figures">
          <div className="figure">
            <dt>Live sources</dt>
            <dd>{COUNTS.live}</dd>
          </div>
          <div className="figure">
            <dt>Sample data sets</dt>
            <dd>{COUNTS.sample}</dd>
          </div>
          <div className="figure">
            <dt>Wanted, with no source</dt>
            <dd>{COUNTS.noSource}</dd>
          </div>
          <div className="figure">
            <dt>Open editorial questions</dt>
            <dd>{COUNTS.questions}</dd>
          </div>
        </dl>
      </section>

      <nav className="doors" aria-labelledby="doors-heading">
        <h2 className="section-label" id="doors-heading">
          Where to go
        </h2>
        <ul>
          {DOORS.map((door) => (
            <li key={door.route} className={door.primary ? 'primary' : undefined}>
              <a className={`door${door.primary ? ' is-primary' : ''}`} href={href(door.route)}>
                <span className={`kind${door.primary ? ' chip' : ''}`}>{door.kind}</span>
                <h3>{door.title}</h3>
                <p>{door.blurb}</p>
                <span className="go" aria-hidden="true">
                  &rarr;
                </span>
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <section className="layout" aria-labelledby="layout-heading">
        <h2 className="section-label" id="layout-heading">
          How the repository is laid out
        </h2>
        <dl>
          <dt>
            <code>packages/app-core</code>
          </dt>
          <dd>
            The model, the parsers, the services, the caches and all of the state. It imports no UI
            framework and no platform SDK, and a test fails the build if that ever changes.
          </dd>
          <dt>
            <code>apps/mobile</code>
          </dt>
          <dd>
            The Expo app: iOS, Android and a web target. It holds the screens and one file
            implementing the four ports.
          </dd>
          <dt>
            <code>packages/design-tokens</code>
          </dt>
          <dd>
            The shared palette. CORRECTIV’s WordPress CMS consumes the same values, and so does this
            handbook, which is why no page here can fork the colours.
          </dd>
          <dt>
            <code>adr/</code>
          </dt>
          <dd>
            {RECORDS} records. A record is never rewritten to look right in hindsight: a claim a
            later decision made false is struck through where it stands, and {RETIRED} of them are.
          </dd>
        </dl>
      </section>

      <footer className="site-footer">
        <p>
          AGPL-3.0-or-later ·{' '}
          <a href={docsModule.repo} target="_blank" rel="noreferrer noopener">
            faktenforum/correctiv-app
          </a>{' '}
          · built from{' '}
          <a
            href={`${docsModule.repo}/commit/${docsModule.commit}`}
            target="_blank"
            rel="noreferrer noopener"
          >
            <code>{docsModule.commit.slice(0, 7)}</code>
          </a>
        </p>
      </footer>
    </main>
  );
}
