import { Fragment, useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';

import {
  COUNTS,
  FEEDS,
  MEASURED_ON,
  QUESTIONS,
  SOURCES,
  UNUSED,
} from '../../content/sources.manifest';
import type { Feed, Kind, SourceEntry, Status } from '../../content/sources.manifest';

type GlyphName = 'live' | 'sample' | 'none' | 'stale' | 'broken' | 'unused';
type Severity = 'stale' | 'broken';
type GroupBy = 'state' | 'kind';
type Gap = (typeof UNUSED)[number];

/** One symbol from the sprite. The glyph is what makes a state readable without colour. */
function Glyph({ name }: { name: GlyphName }) {
  return (
    <svg className="glyph" aria-hidden="true" focusable="false">
      <use href={`#g-${name}`} />
    </svg>
  );
}

/**
 * The manifest writes endpoints and file names in Markdown's backticks.
 *
 * It has to: the same sentences are read as prose in `SOURCES.md`, which is the
 * document of record. Printing them here as plain text would print the backticks
 * too, so they become the `code` element they were always standing for.
 */
function prose(text: string): ReactNode[] {
  const parts = text.split('`');
  // Keyed by where the piece starts in the sentence, which is stable and unique
  // for a string that never changes between renders.
  let offset = 0;
  return parts.map((part, index) => {
    const key = offset;
    offset += part.length + 1;
    return index % 2 === 1 ? <code key={key}>{part}</code> : <Fragment key={key}>{part}</Fragment>;
  });
}

/** An anchor fragment for a label, so a link and its target cannot be typed apart. */
function slug(text: string): string {
  return text
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replaceAll(/^-|-$/g, '');
}

const KIND_LABEL: Record<Kind, string> = {
  articles: 'Articles',
  newsletter: 'Newsletter',
  search: 'Search',
  audio: 'Audio',
  video: 'Video',
  community: 'Community',
  club: 'Club',
  directory: 'Directory',
};

const KIND_ORDER: Kind[] = [
  'articles',
  'newsletter',
  'search',
  'audio',
  'video',
  'community',
  'club',
  'directory',
];

const STATE_GROUPS: { key: Status; label: string; word: string }[] = [
  { key: 'live', label: 'Live', word: 'live' },
  { key: 'sample', label: 'Sample data', word: 'sample' },
  { key: 'no-source', label: 'No source', word: 'no source' },
];

/**
 * The entry every article feed belongs to.
 *
 * `SOURCES` models the seven feeds as one thing, because they are one endpoint
 * read by category id. The board draws one row per feed, because a feed is what
 * stops delivering, and a row that says "articles: live" would hide the two that
 * are not. Found by shape rather than by id, so renaming the entry cannot quietly
 * turn seven rows back into one.
 */
const ARTICLE_FAMILY = SOURCES.find((s) => s.kind === 'articles' && s.status === 'live');

/**
 * Which row each partly-used source in `UNUSED` belongs beside.
 *
 * The manifest names that source in prose ("Castopod shows") and names the same
 * source by id in `SOURCES`, and nothing joins the two. The name is the join.
 * Deriving it beats typing the four pairs out, because a typed pair is a second
 * place to be wrong and the manifest exists so there is only one.
 *
 * What the source is called comes first and its note only after, because a note
 * can name another source: the YouTube entry mentions PeerTube, and a single pass
 * over both hands the PeerTube figures to the YouTube row. A source already
 * claimed is out of the running for the same reason.
 */
const GAP_PAIRS: { gap: Gap; sourceId: string }[] = [];
for (const gap of UNUSED) {
  const word = gap.label.toLowerCase().split(' ')[0];
  const claimed = new Set(GAP_PAIRS.map((pair) => pair.sourceId));
  const live = SOURCES.filter((s) => s.status === 'live' && !claimed.has(s.id));
  const entry =
    live.find((s) => [s.id, s.label, s.endpoint ?? ''].join(' ').toLowerCase().includes(word)) ??
    live.find((s) => s.note.toLowerCase().includes(word));
  if (entry) GAP_PAIRS.push({ gap, sourceId: entry.id });
}
const GAP_BY_SOURCE = new Map(GAP_PAIRS.map((pair) => [pair.sourceId, pair.gap]));
const SOURCE_BY_GAP = new Map(GAP_PAIRS.map((pair) => [pair.gap.label, pair.sourceId]));

interface BoardRow {
  /** The anchor a finding, a gap or a question links to. */
  id: string;
  detailId: string;
  status: Status;
  kind: Kind;
  name: string;
  sub?: string;
  /** Only a live source can have one, and it is what paints the row. */
  severity?: Severity;
  /** Carries a finding: stale, broken, unused or invented. */
  attention: boolean;
  questions: number[];
  reads: ReactNode;
  measured: ReactNode;
  chips: ReactNode;
  detail: ReactNode;
  /** Lower-cased haystack for the text filter. */
  text: string;
}

function questionChips(numbers: number[]): ReactNode {
  return numbers.map((n) => (
    <a className="chip q" href={`#q${n}`} key={n}>
      Q{n}
      <span className="sr-only">, open question {n}</span>
    </a>
  ));
}

function questionLinks(numbers: number[]): ReactNode {
  if (numbers.length === 0) return null;
  return (
    <p className="links">
      {numbers.map((n) => (
        <a href={`#q${n}`} key={n}>
          Open question {n}
        </a>
      ))}
    </p>
  );
}

/**
 * The questions a single feed raises, out of the ones the family carries.
 *
 * Handing all of the family's questions to all seven feeds would tell a reader
 * that the healthy five raise the Europe question too. A question names the feed
 * it is about, in the same word the manifest uses for that feed, so the naming is
 * the link and no pairing has to be typed here.
 */
function feedQuestions(feed: Feed, family: SourceEntry): number[] {
  const name = (feed.label.split('.').pop() ?? feed.label).toLowerCase();
  return (family.questions ?? []).filter((n) => QUESTIONS[n - 1].toLowerCase().includes(name));
}

function feedRow(feed: Feed, index: number, family: SourceEntry): BoardRow {
  const key = slug(feed.label);
  const severity: Severity | undefined = feed.health === 'healthy' ? undefined : feed.health;
  const questions = feedQuestions(feed, family);

  return {
    id: `row-${key}`,
    detailId: `det-${key}`,
    status: 'live',
    kind: 'articles',
    name: feed.label,
    sub: feed.category,
    severity,
    attention: severity !== undefined,
    questions,
    reads: <code>{family.endpoint}</code>,
    measured: (
      <>
        <span className="date">{feed.posts}</span>
        <span className="sub">
          newest: <span className="date">{feed.newest}</span>
        </span>
      </>
    ),
    chips: (
      <>
        {severity && (
          <span className={`chip ${severity}`}>
            <Glyph name={severity} />
            {severity === 'broken' ? 'Broken' : 'Stale'}
          </span>
        )}
        {questionChips(questions)}
      </>
    ),
    detail: (
      <>
        <p>
          {feed.category}. Measured on <span className="date">{MEASURED_ON}</span>: {feed.posts},
          newest {feed.newest}.
        </p>
        {feed.note && <p>{prose(feed.note)}</p>}
        {/* The family note holds for all seven feeds, so it sits on the first, where the group starts. */}
        {index === 0 && <p>{prose(family.note)}</p>}
        {index === 0 && family.module && (
          <p>
            Configured in <code>{family.module}</code>.
          </p>
        )}
        {questionLinks(questions)}
      </>
    ),
    text: [
      feed.label,
      feed.category,
      feed.posts,
      feed.newest,
      feed.health,
      family.endpoint ?? '',
      family.module ?? '',
      family.note,
      feed.note ?? '',
      ...questions.map((n) => QUESTIONS[n - 1]),
      'articles',
    ]
      .join(' ')
      .toLowerCase(),
  };
}

function readsCell(entry: SourceEntry): ReactNode {
  if (entry.endpoint) {
    return (
      <>
        <code>{entry.endpoint}</code>
        {entry.module && (
          <span className="sub">
            <code>{entry.module}</code>
          </span>
        )}
      </>
    );
  }
  if (entry.module) return <code>{entry.module}</code>;
  return <span className="muted">none, no source named</span>;
}

function sourceRow(entry: SourceEntry): BoardRow {
  const gap = GAP_BY_SOURCE.get(entry.id);
  // The one sample that stands in for nothing real says so in its own note, and
  // that sentence is the whole finding: on screen it is a series that does not exist.
  const invented = entry.status === 'sample' && /\binvents\b/i.test(entry.note);
  const questions = entry.questions ?? [];

  return {
    id: `row-${entry.id}`,
    detailId: `det-${entry.id}`,
    status: entry.status,
    kind: entry.kind,
    name: entry.label,
    sub: entry.standsIn ? `stands in for ${entry.standsIn}` : undefined,
    attention: gap !== undefined || invented,
    questions,
    reads: readsCell(entry),
    measured: gap ? (
      <span className="date">
        {gap.used} of {gap.available} used
      </span>
    ) : (
      <span className="muted">no figure taken</span>
    ),
    chips: (
      <>
        {gap && (
          <span className="chip unused">
            <Glyph name="unused" />
            Unused, {gap.available - gap.used} of {gap.available}
          </span>
        )}
        {invented && (
          <span className="chip invented">
            <Glyph name="sample" />
            Invented
          </span>
        )}
        {entry.mvp !== undefined && (
          <span className="chip mvp">{entry.mvp ? 'MVP' : 'Not MVP'}</span>
        )}
        {questionChips(questions)}
      </>
    ),
    detail: (
      <>
        <p>{prose(entry.note)}</p>
        {gap && <p>{prose(gap.note)}</p>}
        {questionLinks(questions)}
      </>
    ),
    text: [
      entry.id,
      entry.label,
      entry.kind,
      entry.status,
      entry.endpoint ?? '',
      entry.module ?? '',
      entry.standsIn ?? '',
      entry.note,
      gap?.note ?? '',
      gap ? 'unused' : '',
      invented ? 'invented' : '',
      entry.mvp ? 'mvp' : '',
      ...questions.map((n) => QUESTIONS[n - 1]),
    ]
      .join(' ')
      .toLowerCase(),
  };
}

/** Every row on the board, in the manifest's own order, with the feeds spread in place. */
const ROWS: BoardRow[] = SOURCES.flatMap((entry) =>
  entry === ARTICLE_FAMILY
    ? FEEDS.map((feed, index) => feedRow(feed, index, entry))
    : [sourceRow(entry)],
);

const ROW_BY_ID = new Map(ROWS.map((row) => [row.id, row]));
const AILING = FEEDS.filter((feed) => feed.health !== 'healthy');
const LIVE_ROWS = ROWS.filter((row) => row.status === 'live').length;
const MVP_WANTED = SOURCES.filter((s) => s.status === 'no-source' && s.mvp).length;

function stateCell(row: BoardRow): ReactNode {
  if (row.severity === 'stale') {
    return (
      <span className="state stale">
        <Glyph name="stale" />
        Live, stale
      </span>
    );
  }
  if (row.severity === 'broken') {
    return (
      <span className="state broken">
        <Glyph name="broken" />
        Live, broken
      </span>
    );
  }
  if (row.status === 'live') {
    return (
      <span className="state live">
        <Glyph name="live" />
        Live
      </span>
    );
  }
  if (row.status === 'sample') {
    return (
      <span className="state sample">
        <Glyph name="sample" />
        Sample
      </span>
    );
  }
  return (
    <span className="state none">
      <Glyph name="none" />
      No source
    </span>
  );
}

/** The count beside a group heading, and, when grouping by kind, what it is made of. */
function groupMeta(members: BoardRow[], shown: BoardRow[], by: GroupBy): string {
  const base =
    shown.length === members.length
      ? `${members.length} ${members.length === 1 ? 'row' : 'rows'}`
      : `${shown.length} of ${members.length} rows`;
  if (by === 'state' || shown.length === 0) return base;

  const parts = STATE_GROUPS.map((group) => ({
    n: shown.filter((row) => row.status === group.key).length,
    word: group.word,
  }))
    .filter((part) => part.n > 0)
    .map((part) => `${part.n} ${part.word}`);
  return `${base} · ${parts.join(', ')}`;
}

/**
 * The sprite the glyphs are drawn from.
 *
 * Every state on this page is a glyph plus a written label, never a colour on its
 * own: the six status colours are the one thing a reader with a colour vision
 * deficiency, or a printer, cannot be relied on to receive.
 */
function Sprite() {
  return (
    <svg className="sprite" aria-hidden="true" focusable="false">
      <symbol id="g-live" viewBox="0 0 16 16">
        <circle cx="8" cy="8" r="5.6" fill="currentColor" />
      </symbol>
      <symbol id="g-sample" viewBox="0 0 16 16">
        <rect
          x="2.8"
          y="2.8"
          width="10.4"
          height="10.4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
        />
        <path d="M2.8 13.2 13.2 2.8" stroke="currentColor" strokeWidth="1.6" />
      </symbol>
      <symbol id="g-none" viewBox="0 0 16 16">
        <circle
          cx="8"
          cy="8"
          r="5.6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeDasharray="2.4 2.3"
        />
      </symbol>
      <symbol id="g-stale" viewBox="0 0 16 16">
        <circle cx="8" cy="8" r="6.2" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path d="M6.1 5.2v5.6M9.9 5.2v5.6" stroke="currentColor" strokeWidth="1.9" />
      </symbol>
      <symbol id="g-broken" viewBox="0 0 16 16">
        <path d="M5.2 1.5h5.6l3.7 3.7v5.6l-3.7 3.7H5.2L1.5 10.8V5.2z" fill="currentColor" />
        <path
          d="M5.5 5.5l5 5M10.5 5.5l-5 5"
          style={{ stroke: 'var(--canvas)' }}
          strokeWidth="1.7"
        />
      </symbol>
      <symbol id="g-unused" viewBox="0 0 16 16">
        <rect
          x="2.8"
          y="2.8"
          width="10.4"
          height="10.4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
        />
        <rect x="2.8" y="2.8" width="4.2" height="10.4" fill="currentColor" />
      </symbol>
    </svg>
  );
}

/**
 * The sources status board: what the app reads, what it stands in for, what it wants.
 *
 * Every figure, row, flag and question on the page is read out of
 * `content/sources.manifest.ts`, which a test checks against the core's data
 * directory. Nothing here is typed twice, because the failure this page exists to
 * prevent is the one where the website and the code quietly disagree and the
 * website is the confident one.
 *
 * The board is thirty rows over twenty-four manifest entries: the seven article
 * feeds get a row each, since a feed is the thing that goes stale, and one row
 * reading "articles: live" would hide the two that have stopped.
 *
 * Filtering is React state rather than a class on the DOM, so the group counts,
 * the row count and the disclosures cannot drift out of step with what is on
 * screen. The one behaviour worth naming: following a link into a row clears
 * whichever filter would have hidden it, because a link that lands on nothing is
 * worse than no link.
 */
export function Sources() {
  const [stateFilter, setStateFilter] = useState<'all' | Status>('all');
  const [query, setQuery] = useState('');
  const [attentionOnly, setAttentionOnly] = useState(false);
  const [groupBy, setGroupBy] = useState<GroupBy>('state');
  const [open, setOpen] = useState<ReadonlySet<string>>(() => new Set());

  const revealRow = useCallback((rowId: string) => {
    const row = ROW_BY_ID.get(rowId);
    if (!row) return;

    setOpen((current) => new Set(current).add(rowId));
    // Each filter is cleared only if it is the one hiding the target, so a reader
    // who arrives by link keeps as much of their own view as still shows the row.
    setStateFilter((current) => (current === 'all' || current === row.status ? current : 'all'));
    setAttentionOnly((current) => (current && !row.attention ? false : current));
    setQuery((current) =>
      current.trim() === '' || row.text.includes(current.trim().toLowerCase()) ? current : '',
    );
  }, []);

  // A reader can arrive on a row anchor from another page, or from a reload.
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.startsWith('#row-')) revealRow(hash.slice(1));
  }, [revealRow]);

  const toggle = (rowId: string) =>
    setOpen((current) => {
      const next = new Set(current);
      if (!next.delete(rowId)) next.add(rowId);
      return next;
    });

  const needle = query.trim().toLowerCase();
  const visible = ROWS.filter((row) => {
    if (stateFilter !== 'all' && row.status !== stateFilter) return false;
    if (attentionOnly && !row.attention) return false;
    if (needle !== '' && !row.text.includes(needle)) return false;
    return true;
  });
  const visibleIds = new Set(visible.map((row) => row.id));

  const groups: { key: string; label: string }[] =
    groupBy === 'state'
      ? STATE_GROUPS.map((group) => ({ key: group.key, label: group.label }))
      : KIND_ORDER.map((kind) => ({ key: kind, label: KIND_LABEL[kind] }));

  return (
    <main className="content page sources" id="content">
      <Sprite />

      <header>
        <p className="eyebrow">CORRECTIV community app · internal documentation</p>
        <h1>Sources status board</h1>
        <p className="lede">
          For every kind of content the app shows: is it live data, sample data standing in for an
          API that does not exist yet, or a wanted feature with nothing to read.
        </p>
        <div className="measured" role="note" aria-label="How these figures were measured">
          <p>
            <strong>
              Every figure on this page was measured by hand on{' '}
              <span className="date">{MEASURED_ON}</span>
            </strong>
            , against the live sources, and typed into the manifest. This page cannot re-measure
            them. The RSS feeds send no CORS header, so a browser cannot fetch them, and nothing
            here refreshes on its own.
          </p>
          <p>
            If a figure looks wrong, measure again and edit the manifest. It is a record of one day,
            not a monitor.
          </p>
        </div>
      </header>

      <fieldset className="states">
        <legend>Show</legend>
        {/*
          Each tile is a radio, and its label is the whole card. Without the
          `aria-label` the radio would announce as its own count and its own
          three-clause summary, which is a paragraph where a name belongs. The
          name repeats the heading word for word, so what is heard and what is
          read are the same thing, and the figures stay on screen as evidence.
        */}
        <div className="tiles">
          <label className="tile" aria-label="All rows">
            <input
              type="radio"
              name="state"
              value="all"
              checked={stateFilter === 'all'}
              onChange={() => setStateFilter('all')}
            />
            <span className="tile-body">
              <span className="tile-head">All rows</span>
              <span className="tile-count" aria-hidden="true">
                {ROWS.length}
              </span>
              <span className="tile-meta">
                {ROWS.length} rows over {SOURCES.length} manifest entries, with the article family
                drawn as its {FEEDS.length} feeds.
              </span>
            </span>
          </label>

          <label className="tile" aria-label="Live">
            <input
              type="radio"
              name="state"
              value="live"
              checked={stateFilter === 'live'}
              onChange={() => setStateFilter('live')}
            />
            <span className="tile-body">
              <span className="tile-head live">
                <Glyph name="live" />
                Live
              </span>
              <span className="tile-count" aria-hidden="true">
                {LIVE_ROWS}
              </span>
              <span className="tile-meta">
                {LIVE_ROWS} live. {LIVE_ROWS - COUNTS.stale - COUNTS.broken} reading as expected,{' '}
                <span className="inl stale">
                  <Glyph name="stale" />
                  {COUNTS.stale} stale
                </span>
                ,{' '}
                <span className="inl broken">
                  <Glyph name="broken" />
                  {COUNTS.broken} broken
                </span>
              </span>
            </span>
          </label>

          <label className="tile" aria-label="Sample data">
            <input
              type="radio"
              name="state"
              value="sample"
              checked={stateFilter === 'sample'}
              onChange={() => setStateFilter('sample')}
            />
            <span className="tile-body">
              <span className="tile-head sample">
                <Glyph name="sample" />
                Sample data
              </span>
              <span className="tile-count" aria-hidden="true">
                {COUNTS.sample}
              </span>
              <span className="tile-meta">
                {COUNTS.sample} files typed in the shape of the API that will replace them. On
                screen they look like live content.
              </span>
            </span>
          </label>

          <label className="tile" aria-label="No source">
            <input
              type="radio"
              name="state"
              value="no-source"
              checked={stateFilter === 'no-source'}
              onChange={() => setStateFilter('no-source')}
            />
            <span className="tile-body">
              <span className="tile-head none">
                <Glyph name="none" />
                No source
              </span>
              <span className="tile-count" aria-hidden="true">
                {COUNTS.noSource}
              </span>
              <span className="tile-meta">
                {COUNTS.noSource} wanted features with nothing to read. {MVP_WANTED} of them are
                MVP.
              </span>
            </span>
          </label>
        </div>
      </fieldset>

      <section className="section" aria-labelledby="h-findings">
        <h2 id="h-findings">Bad news first</h2>
        <p className="section-lede">
          A sample file is honest about what it is. A live feed that has stopped, or points at
          nothing, is not, because the app presents it as content. {AILING.length} of the{' '}
          {FEEDS.length} article feeds are in that state.
        </p>
        <ul className="findings">
          {AILING.map((feed) => {
            const rowId = `row-${slug(feed.label)}`;
            const row = ROW_BY_ID.get(rowId);
            return (
              <li className={`finding ${feed.health}`} key={feed.label}>
                <p className="finding-head">
                  <Glyph name={feed.health === 'broken' ? 'broken' : 'stale'} />
                  {feed.label}, {feed.health}
                </p>
                <p>
                  {feed.category}: {feed.posts}, newest <span className="date">{feed.newest}</span>.
                </p>
                {feed.note && <p>{prose(feed.note)}</p>}
                <p className="links">
                  {row && (
                    <a href={`#${rowId}`} onClick={() => revealRow(rowId)}>
                      Row
                    </a>
                  )}
                  {(row?.questions ?? []).map((n) => (
                    <a href={`#q${n}`} key={n}>
                      Open question {n}
                    </a>
                  ))}
                </p>
              </li>
            );
          })}
        </ul>
        <p className="aside">
          The other {FEEDS.length - AILING.length} article feeds were reading as expected on{' '}
          <span className="date">{MEASURED_ON}</span>. A feed can be stale for a good reason, which
          is what the note on each card is for.
        </p>
      </section>

      <section className="section" aria-labelledby="h-gaps">
        <h2 id="h-gaps">Connected but unused</h2>
        <p className="section-lede">
          {UNUSED.length} sources are live and reachable, and the app reads a fraction of each. This
          is neither a broken source nor a missing one. It is a decision nobody has taken. Filled
          squares are what the app shows.
        </p>
        <ul className="gaps">
          {UNUSED.map((gap) => {
            const sourceId = SOURCE_BY_GAP.get(gap.label);
            return (
              <li className="gap" key={gap.label}>
                <p className="gap-name">{gap.label}</p>
                <p className="gap-ratio">
                  <strong>{gap.used}</strong> of {gap.available} used
                </p>
                <div className="dots" aria-hidden="true">
                  {Array.from({ length: gap.available }, (_, index) => (
                    <i className={index < gap.used ? 'on' : undefined} key={index} />
                  ))}
                </div>
                <p className="gap-note">
                  {prose(gap.note)}
                  {sourceId && (
                    <>
                      {' '}
                      <a href={`#row-${sourceId}`} onClick={() => revealRow(`row-${sourceId}`)}>
                        Row
                      </a>
                    </>
                  )}
                </p>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="section" aria-labelledby="h-board">
        <h2 id="h-board">The board</h2>
        <p className="section-lede">
          One row per source, per article feed, or per wanted source. A row expands to its full
          detail; nothing on this page is truncated. The state tiles above filter the board as well.
        </p>

        <div className="toolbar">
          <div className="field">
            <label htmlFor="sources-query">Filter rows</label>
            <input
              type="search"
              id="sources-query"
              placeholder="name, endpoint, file, question"
              autoComplete="off"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>

          <fieldset className="field">
            <legend>Group by</legend>
            <div className="seg">
              <label>
                <input
                  type="radio"
                  name="group"
                  value="state"
                  checked={groupBy === 'state'}
                  onChange={() => setGroupBy('state')}
                />
                <span>State</span>
              </label>
              <label>
                <input
                  type="radio"
                  name="group"
                  value="kind"
                  checked={groupBy === 'kind'}
                  onChange={() => setGroupBy('kind')}
                />
                <span>Content kind</span>
              </label>
            </div>
          </fieldset>

          <label className="check">
            <input
              type="checkbox"
              checked={attentionOnly}
              onChange={(event) => setAttentionOnly(event.target.checked)}
            />
            Only rows with a finding: stale, broken, unused, invented
          </label>

          <div className="actions">
            <button
              type="button"
              className="plain"
              onClick={() => setOpen(new Set(ROWS.map((row) => row.id)))}
            >
              Expand all
            </button>
            <button type="button" className="plain" onClick={() => setOpen(new Set())}>
              Collapse all
            </button>
          </div>

          <output className="count">
            Showing {visible.length} of {ROWS.length} rows
          </output>
        </div>

        <div className="table-wrap">
          <table>
            <caption>
              Every content source the app reads, stands in for, or still wants. Figures measured by
              hand on <span className="date">{MEASURED_ON}</span>.
            </caption>
            <thead>
              <tr>
                <th scope="col">State</th>
                <th scope="col">Kind</th>
                <th scope="col">Source</th>
                <th scope="col">Reads from</th>
                <th scope="col">
                  Measured <span className="date">{MEASURED_ON}</span>
                </th>
                <th scope="col">Flags</th>
                <th scope="col">
                  <span className="sr-only">Details</span>
                </th>
              </tr>
            </thead>

            {groups.map((group) => {
              const members = ROWS.filter(
                (row) => (groupBy === 'state' ? row.status : row.kind) === group.key,
              );
              if (members.length === 0) return null;
              const shown = members.filter((row) => visibleIds.has(row.id));

              return (
                <tbody key={group.key} hidden={shown.length === 0}>
                  <tr>
                    <th scope="rowgroup" colSpan={7}>
                      {group.label}
                      <span className="group-meta">{groupMeta(members, shown, groupBy)}</span>
                    </th>
                  </tr>
                  {members.map((row) => {
                    const isVisible = visibleIds.has(row.id);
                    const isOpen = open.has(row.id);
                    return (
                      <Fragment key={row.id}>
                        <tr
                          className="row"
                          id={row.id}
                          hidden={!isVisible}
                          data-severity={row.severity}
                        >
                          <td>{stateCell(row)}</td>
                          <td>{KIND_LABEL[row.kind]}</td>
                          <td>
                            <span className="name">{row.name}</span>
                            {row.sub && <span className="sub">{row.sub}</span>}
                          </td>
                          <td className="reads">{row.reads}</td>
                          <td className="measured-cell">{row.measured}</td>
                          <td>
                            <div className="flags">{row.chips}</div>
                          </td>
                          <td>
                            <button
                              type="button"
                              className="toggle"
                              aria-expanded={isOpen}
                              aria-controls={row.detailId}
                              onClick={() => toggle(row.id)}
                            >
                              {isOpen ? 'Hide' : 'Details'}
                            </button>
                          </td>
                        </tr>
                        <tr className="detail" id={row.detailId} hidden={!isVisible || !isOpen}>
                          <td colSpan={7}>
                            <div className="detail-body">{row.detail}</div>
                          </td>
                        </tr>
                      </Fragment>
                    );
                  })}
                </tbody>
              );
            })}
          </table>
        </div>
      </section>

      <section className="section" aria-labelledby="h-questions">
        <h2 id="h-questions">{COUNTS.questions} open editorial questions</h2>
        <p className="section-lede">
          This page exists to get these answered. Each one is raised by a row above, and each row
          carries its question as a Q chip.
        </p>
        <ol className="questions">
          {QUESTIONS.map((question, index) => {
            const n = index + 1;
            const raisedBy = ROWS.filter((row) => row.questions.includes(n));
            return (
              <li id={`q${n}`} key={question}>
                <span className="qnum">Q{n}</span>
                <div>
                  <p className="qtext">{prose(question)}</p>
                  <p className="qlinks">
                    {raisedBy.map((row) => (
                      <a href={`#${row.id}`} key={row.id} onClick={() => revealRow(row.id)}>
                        {row.name}
                      </a>
                    ))}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      <footer>
        <p>
          Measured by hand on <span className="date">{MEASURED_ON}</span>. The browser that renders
          this page has not checked a single source, and cannot, because the RSS feeds send no CORS
          header.
        </p>
        <p>
          Every row, count and figure above is read from{' '}
          <code>apps/handbook/content/sources.manifest.ts</code>, which a test checks against the
          core's data directory. When a figure changes, change it there.
        </p>
      </footer>
    </main>
  );
}
