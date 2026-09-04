import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

import { COMBINATIONS, type Status } from '../api';
import type { Level, LogEntry } from '../frame/console';
import { frameLabel, frameShort, handover } from '../handover';
import type { Located } from '../frame/locate';
import type { Finding } from '../frame/measure';
import { FIXTURES } from '../frame/seed';
import { asCss, PALETTE, TOKENS, type Overrides, type Scheme } from '../frame/tokens';
import type { PreviewState, ThemeSetting } from '../state';

export interface ToolBindings {
  scheme: Scheme;
  tokens: {
    overrides: Overrides;
    set: (next: Overrides) => void;
    textPass: boolean;
    setTextPass: (on: boolean) => void;
  };
  measure: {
    outline: boolean;
    setOutline: (on: boolean) => void;
    report: { findings: Finding[]; scheme: Scheme; scanned: number } | null;
    run: () => void;
  };
  inspect: {
    picking: boolean;
    setPicking: (on: boolean) => void;
    hit: { label: string; frames: Located[] } | null;
    /** Which frame of the owner chain the person meant. */
    selected: number;
    setSelected: (index: number) => void;
    open: (frame: Located) => void;
  };
}

interface Props {
  state: PreviewState;
  status: Status;
  logs: LogEntry[];
  tools: ToolBindings;
  onChange: (patch: Partial<PreviewState>) => void;
  onClearLogs: () => void;
}

type PanelName = 'appearance' | 'state' | 'console' | 'tokens' | 'measure' | 'inspect';

/**
 * Which panels are open the first time the tools appear.
 *
 * The three whose readouts hold in any build, as in the design. Which panels are
 * open is local to this component rather than part of `PreviewState`: the design
 * carries them in its address, and `state.ts` has no field for that, so a link
 * reproduces which tools are on and not which drawers were pulled out.
 */
const OPEN_AT_FIRST: PanelName[] = ['appearance', 'console', 'measure'];

interface Disclosure {
  open: boolean;
  onToggle: () => void;
}

/**
 * The workbench half of the page: everything the demo audience does not get.
 *
 * It is always mounted, and `data-tools` on the page root is what decides
 * whether it is on screen: the stylesheet hides it and widens `main` by a
 * column in the same transition, which is what makes the switch between the two
 * audiences read as one page opening rather than as a second page. `display:
 * none` keeps it out of the accessibility tree while it is closed, so nothing
 * behind the switch is announced to someone who has not opened it.
 */
export function Panels(props: Props) {
  const { status, tools } = props;
  const [open, setOpen] = useState<ReadonlySet<PanelName>>(() => new Set(OPEN_AT_FIRST));

  const toggle = useCallback(
    (name: PanelName) =>
      setOpen((current) => {
        const next = new Set(current);
        if (!next.delete(name)) next.add(name);
        return next;
      }),
    [],
  );
  const reveal = useCallback(
    (name: PanelName) => setOpen((current) => new Set(current).add(name)),
    [],
  );
  const disclosure = (name: PanelName): Disclosure => ({
    open: open.has(name),
    onToggle: () => toggle(name),
  });

  const findings = tools.measure.report?.findings.length ?? null;

  return (
    <aside className="dock" aria-labelledby="wb-dock-heading">
      <div className="dock-head">
        <h2 id="wb-dock-heading">Tools</h2>
        <div className="summary">
          <button type="button" onClick={() => reveal('console')}>
            <Badge n={status.warnings} tone="warn" /> warnings
          </button>
          <button type="button" onClick={() => reveal('console')}>
            <Badge n={status.errors} tone="err" /> errors
          </button>
          <button type="button" onClick={() => reveal('measure')}>
            {findings === null ? (
              'findings not run'
            ) : (
              <>
                <Badge n={findings} tone="warn" /> findings
              </>
            )}
          </button>
        </div>
      </div>

      {/*
        The design offers a select here, to switch between "published, static
        export" and "development server" for the sake of the demonstration. This
        is not a choice anyone makes on this page: it is read out of the frame,
        and it decides whether half the controls below can do anything. So it is
        stated, not offered.
      */}
      <div className="build">
        <span className="muted">Build</span>
        <b>{status.handle ? 'Development server' : 'Published, static export'}</b>
        <span className="note right">
          {status.handle
            ? 'Store handle present, every panel live.'
            : 'Store handle absent, the appearance setting and the inspector are inert.'}
        </span>
      </div>

      <div className="panels">
        <Appearance {...props} panel={disclosure('appearance')} />
        <State {...props} panel={disclosure('state')} />
        <Console {...props} panel={disclosure('console')} />
        <Tokens {...props} panel={disclosure('tokens')} />
        <Measure {...props} panel={disclosure('measure')} />
        <Inspect {...props} panel={disclosure('inspect')} />
      </div>
    </aside>
  );
}

/** A count, always with its number written out, never a colour on its own. */
function Badge({ n, tone }: { n: number | null; tone: 'warn' | 'err' }) {
  if (n === null) return <span className="badge zero">not run</span>;
  return <span className={n > 0 ? `badge ${tone}` : 'badge zero'}>{n}</span>;
}

function Panel({
  name,
  title,
  panel,
  tags,
  children,
}: {
  name: PanelName;
  title: string;
  panel: Disclosure;
  tags?: ReactNode;
  children: ReactNode;
}) {
  const bodyId = `wb-panel-${name}`;
  return (
    <section className="panel">
      <h3 className="sr">{title}</h3>
      <button
        type="button"
        className="panel-head"
        aria-expanded={panel.open}
        aria-controls={bodyId}
        onClick={panel.onToggle}
      >
        <span className="chev" aria-hidden="true">
          ▸
        </span>
        <span className="name">
          {title}
          {tags}
        </span>
      </button>
      <div className="panel-body" id={bodyId} hidden={!panel.open}>
        {children}
      </div>
    </section>
  );
}

/** The one thing on this page a person needs a development build to change. */
function InertHere() {
  return <span className="tag dev">inert here</span>;
}

const SETTINGS: ThemeSetting[] = ['light', 'dark', 'system'];

/** The two grounds a device scheme means. Fixed, because they stand for the
 *  device's scheme and must not follow this page's own. */
const SWATCH = { light: '#ffffff', dark: '#1a1a1a' };

/**
 * All four combinations of appearance setting and device scheme, named.
 *
 * `TROUBLESHOOTING.md`: "Check a colour change in all three settings, and check
 * `'system'` against both device schemes. That is four combinations, and only the
 * fourth was broken." The fourth is also the app's default, which is why it is
 * marked here rather than left to be counted.
 *
 * The shell can only set the inner half. `prefers-color-scheme` cannot be forced
 * per iframe, so 3 and 4 need the browser's own emulation, and this panel says
 * which one is on screen rather than pretending to have got you there. The four
 * are a readout for that reason; the setting, which is the half this page can
 * write, is the segmented control above them.
 */
function Appearance({ status, onChange, panel }: Props & { panel: Disclosure }) {
  return (
    <Panel
      name="appearance"
      title="Appearance"
      panel={panel}
      tags={
        <>
          <span className="tag mono">
            {status.combination === null
              ? 'combination unknown'
              : `combination ${status.combination}`}
          </span>
          {!status.handle && <InertHere />}
        </>
      }
    >
      <div className="facts">
        <div className="fact">
          <div className="lbl">App setting says</div>
          <div className="val">{status.appTheme ?? 'unknown'}</div>
        </div>
        <div className="fact">
          <div className="lbl">Device reports</div>
          <div className="val">
            <span
              className="dot"
              style={{ background: SWATCH[status.scheme ?? 'light'] }}
              aria-hidden="true"
            />
            {status.scheme ?? 'unknown'}
          </div>
        </div>
      </div>

      <fieldset disabled={!status.handle}>
        <legend>App setting, written to the app's own store</legend>
        <div className="seg">
          {SETTINGS.map((setting) => (
            <button
              key={setting}
              type="button"
              aria-pressed={status.appTheme === setting}
              onClick={() => onChange({ theme: setting })}
            >
              {setting}
            </button>
          ))}
        </div>
      </fieldset>

      {/* Hidden by the stylesheet under `.workbench[data-build='dev']`. Two
          children, because `.needs-dev` is a grid and every child of it is a row. */}
      <div className="needs-dev">
        <b>Needs a development build.</b>
        <span>
          The published site is a static export, and <code>expo export</code> sets{' '}
          <code>__DEV__</code> false, so the app leaves no dev handle and the setting cannot be
          written from here. Run the handbook against <code>npm run web</code>. Everything read out
          above and below still holds.
        </span>
      </div>

      <p className="note">
        The device half is the browser's to set, not this page's: emulate{' '}
        <code>prefers-color-scheme</code> in DevTools, under Rendering. An iframe cannot be given a
        scheme of its own, so combinations 3 and 4 are reached there and only reported here.
      </p>

      <div className="combos">
        {COMBINATIONS.map((c) => {
          const active = status.combination === c.n;
          return (
            <div
              key={c.n}
              className={`combo${c.isDefault ? ' four' : ''}${active ? ' active' : ''}`}
              aria-current={active}
            >
              <span className="n">{c.n}</span>
              <div>
                {c.label}
                {c.isDefault && (
                  <>
                    {' '}
                    <span className="tag accent">default</span>
                  </>
                )}
                <div className="sub">
                  {c.scheme === undefined
                    ? 'Forceable from here, with a development build.'
                    : `Not forceable from this page. Emulate a ${c.scheme} device in the browser.`}
                </div>
              </div>
              {active && <span className="tag">on screen</span>}
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

/**
 * Storage fixtures. Each is a whole state rather than a patch, and each costs a
 * reload: `onboardingDone` and the feed cache are both read before the first
 * render, so neither can be dispatched after the fact.
 *
 * The design marks this panel as needing a development build, and it does not:
 * a fixture is written to `window.localStorage`, which same-origin makes the
 * app's own, before the frame is pointed at a route. That works in the static
 * export, so there is no `.needs-dev` block here.
 */
function State({ state, onChange, panel }: Props & { panel: Disclosure }) {
  return (
    <Panel
      name="state"
      title="State"
      panel={panel}
      tags={<span className="tag mono">{state.seed ?? 'untouched'}</span>}
    >
      <fieldset>
        <legend>Fixture, seeded before the app boots. Choosing one reloads the frame.</legend>
        <div className="fixtures">
          {/*
            First, and the default, because the plain demo link carries no
            fixture: `preview` with no `s` must not wipe what the last visit left
            in storage on its way in.
          */}
          <label className="fixture" aria-label="Leave alone">
            <input
              type="radio"
              name="wb-fixture"
              value=""
              checked={state.seed === null}
              onChange={() => onChange({ seed: null })}
            />
            <div>
              <b>Leave alone</b>
              <div className="h">Whatever the last visit left in storage.</div>
            </div>
          </label>
          {FIXTURES.map((f) => (
            <label key={f.id} className="fixture" aria-label={f.label}>
              <input
                type="radio"
                name="wb-fixture"
                value={f.id}
                checked={state.seed === f.id}
                onChange={() => onChange({ seed: f.id })}
              />
              <div>
                <b>{f.label}</b>
                <div className="h">{f.hint}</div>
              </div>
            </label>
          ))}
        </div>
      </fieldset>
      <p className="note">
        The fixture is in the link, so whoever opens it starts where you started.
      </p>
    </Panel>
  );
}

const LEVELS: Level[] = ['warn', 'error'];

/**
 * What the app said. A screenshot cannot show this, which is why it is here.
 *
 * The frame's console is patched for two levels only, so the design's third
 * filter has nothing to filter: an `error` and a `warn` are what
 * `frame/console.ts` collects, and a button for `log` would switch a category
 * that can never arrive.
 */
function Console({ status, logs, onClearLogs, panel }: Props & { panel: Disclosure }) {
  const [levels, setLevels] = useState<ReadonlySet<Level>>(() => new Set(LEVELS));
  const [filter, setFilter] = useState('');

  const needle = filter.trim().toLowerCase();
  const shown = logs.filter(
    (entry) =>
      levels.has(entry.level) && (needle === '' || entry.text.toLowerCase().includes(needle)),
  );

  return (
    <Panel
      name="console"
      title="Console"
      panel={panel}
      tags={
        <>
          <Badge n={status.warnings} tone="warn" />
          <span className="sr"> warnings</span>
          <Badge n={status.errors} tone="err" />
          <span className="sr"> errors</span>
        </>
      }
    >
      <div className="row">
        <div className="seg">
          {LEVELS.map((level) => (
            <button
              key={level}
              type="button"
              aria-pressed={levels.has(level)}
              onClick={() =>
                setLevels((current) => {
                  const next = new Set(current);
                  if (!next.delete(level)) next.add(level);
                  return next;
                })
              }
            >
              {level}
            </button>
          ))}
        </div>
        <input
          type="search"
          className="mono"
          style={{ flex: 1, minWidth: 80 }}
          placeholder="filter"
          aria-label="Filter console lines"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <button
          type="button"
          className="btn small"
          onClick={onClearLogs}
          disabled={logs.length === 0}
        >
          Clear
        </button>
      </div>

      <div className="console-log" role="log" aria-live="polite" aria-label="App console">
        {shown.length === 0 ? (
          <p className="empty">
            {logs.length === 0
              ? 'Nothing since the last navigation.'
              : 'Nothing matches the filter.'}
          </p>
        ) : (
          shown.map((entry) => (
            <div key={entry.id} className={`line ${entry.level}`}>
              <span className="lvl">{entry.level}</span>
              <span>{entry.text}</span>
            </div>
          ))
        )}
      </div>

      <p className="note">
        {shown.length} of {logs.length} lines shown, {status.warnings} warnings, {status.errors}{' '}
        errors.
      </p>
    </Panel>
  );
}

/**
 * The palette, live. Changing a value here recolours the running app; nothing is
 * written to `tokens/theme.css`, which is vendored from `wp-design-tokens` and
 * stays the source of truth. Copy takes the result there.
 *
 * No `.needs-dev` block, unlike the design: the override is a stylesheet
 * appended to the frame's own document, which same-origin allows in any build.
 */
function Tokens({ tools, panel }: Props & { panel: Disclosure }) {
  const { scheme, tokens } = tools;
  const changed = TOKENS.filter((t) => tokens.overrides[t]?.[scheme]);

  const setToken = (token: (typeof TOKENS)[number], value: string | null) => {
    const next: Overrides = { ...tokens.overrides, [token]: { ...tokens.overrides[token] } };
    if (value) next[token]![scheme] = value;
    else delete next[token]![scheme];
    tokens.set(next);
  };

  return (
    <Panel
      name="tokens"
      title="Tokens"
      panel={panel}
      tags={<span className="tag mono">{scheme} scheme</span>}
    >
      <p className="note">
        Overrides apply to the <b>{scheme}</b> scheme, the one the app is painting with. Nothing is
        written to the repository; Copy CSS is how a proposal leaves this page.
      </p>

      <div className="tokens">
        {TOKENS.map((token) => {
          const override = tokens.overrides[token]?.[scheme];
          const value = override ?? PALETTE[scheme][token];
          return (
            <label key={token} className={override ? 'tok changed' : 'tok'}>
              <input type="color" value={value} onChange={(e) => setToken(token, e.target.value)} />
              <code>--color-{token}</code>
              <span className="v">{value}</span>
            </label>
          );
        })}
      </div>

      <div className="row">
        <button
          type="button"
          className="btn small"
          disabled={!changed.length}
          onClick={() => tokens.set({})}
        >
          Reset overrides
        </button>
        <button
          type="button"
          className="btn small"
          disabled={!changed.length}
          onClick={() => void navigator.clipboard.writeText(asCss(tokens.overrides))}
        >
          Copy CSS
        </button>
        <span className="note">{changed.length} changed</span>
      </div>

      <label className="row">
        <input
          type="checkbox"
          checked={tokens.textPass}
          onChange={(e) => tokens.setTextPass(e.target.checked)}
        />
        Text too
      </label>
      <p className="note">
        Surfaces and borders follow the variable. Text and icons are resolved in JavaScript and land
        in inline styles, so <b>Text too</b> chases them by value: a best effort, not a guarantee.
      </p>
    </Panel>
  );
}

const CHECKS: { kind: Finding['kind']; title: string; detail: string }[] = [
  {
    kind: 'overflow',
    title: 'Horizontal overflow',
    detail: 'Anything wider than the frame it is drawn in.',
  },
  {
    kind: 'tap-target',
    title: 'Tap targets under 44 px',
    detail: 'Declared controls shorter or narrower than 44 CSS px.',
  },
  {
    kind: 'off-palette',
    title: 'Colours off the palette',
    detail: 'Fills and text no token of the painted scheme names.',
  },
];

const KIND_LABEL: Record<Finding['kind'], string> = {
  overflow: 'overflow',
  'tap-target': 'tap target',
  'off-palette': 'colour',
};

/** The mechanical half of looking: overflow, tap targets, colours off the palette. */
function Measure({ tools, panel }: Props & { panel: Disclosure }) {
  const { measure } = tools;
  const report = measure.report;
  const count = (kind: Finding['kind']) =>
    report ? report.findings.filter((f) => f.kind === kind).length : null;

  return (
    <Panel
      name="measure"
      title="Measure"
      panel={panel}
      tags={<Badge n={report?.findings.length ?? null} tone="warn" />}
    >
      <div className="row">
        <button type="button" className="btn small primary" onClick={measure.run}>
          Run checks
        </button>
        <button
          type="button"
          className="btn small"
          aria-pressed={measure.outline}
          onClick={() => measure.setOutline(!measure.outline)}
        >
          Outline boxes in the frame
        </button>
        <span className="note right">
          {report
            ? `Ran across ${report.scanned} elements.`
            : "Runs against the frame's own DOM, and works in any build."}
        </span>
      </div>

      <div className="checks">
        {CHECKS.map((check) => (
          <div key={check.kind} className="check">
            <div>
              <b>{check.title}</b>
              <div className="d">{check.detail}</div>
            </div>
            <Badge n={count(check.kind)} tone="warn" />
          </div>
        ))}
      </div>

      <div className="findings">
        {report === null && <p className="note">No run yet. Press Run checks.</p>}
        {report !== null && report.findings.length === 0 && (
          <p className="note">Nothing found across {report.scanned} elements.</p>
        )}
        {report?.findings.map((f) => (
          <div key={`${f.kind}:${f.where}:${f.text}`} className="finding">
            <div>
              <span className="tag">{KIND_LABEL[f.kind]}</span> <span className="m">{f.text}</span>
              {f.where && <code title={f.where}>{f.where}</code>}
            </div>
          </div>
        ))}
      </div>

      {report?.scheme === 'light' && (
        <p className="note">
          Colours are ambiguous in light: #ffffff and #333333 each name two tokens. Re-run in dark.
        </p>
      )}
    </Panel>
  );
}

/**
 * Click a thing, get the line that drew it, and hand both to someone else.
 *
 * The owner chain is offered rather than resolved, because only the person
 * looking knows which level they mean: "this chip" and "the row of chips" are two
 * entries of the same chain. The selected one becomes `Source:` in the block
 * below, the rest become `Context:`.
 */
function Inspect({ status, tools, panel }: Props & { panel: Disclosure }) {
  const { inspect } = tools;
  const section = useRef<HTMLDivElement>(null);

  // The dock scrolls, and this panel is the one that grows: on a laptop the
  // result of a pick lands below the fold, which would hide the only part of the
  // interaction that matters.
  useEffect(() => {
    if (inspect.hit) section.current?.scrollIntoView({ block: 'nearest' });
  }, [inspect.hit]);

  const frames = inspect.hit?.frames ?? [];
  const chosen = frames[inspect.selected] ?? frames[0];
  const block =
    inspect.hit && frames.length > 0
      ? handover({
          label: inspect.hit.label,
          frames,
          selected: inspect.selected,
          view: location.href,
        })
      : '';

  return (
    <div ref={section}>
      <Panel
        name="inspect"
        title="Inspect"
        panel={panel}
        tags={!status.handle ? <InertHere /> : undefined}
      >
        {/* Hidden by the stylesheet under `.workbench[data-build='dev']`. */}
        <div className="needs-dev">
          <b>Needs a development build.</b>
          <span>
            The source line comes from the owner stack React keeps beside each node, and a
            production bundle keeps none. The picker stays disarmed here.
          </span>
        </div>

        <fieldset disabled={!status.handle}>
          <div className="row">
            <button
              type="button"
              className="btn small"
              aria-pressed={inspect.picking}
              onClick={() => inspect.setPicking(!inspect.picking)}
            >
              {inspect.picking ? 'Picker armed, click in the frame' : 'Pick element'}
            </button>
          </div>

          <div className="chosen-label">
            {inspect.hit
              ? inspect.hit.label
                ? `"${inspect.hit.label}"`
                : 'Element with no label'
              : 'Nothing chosen.'}
          </div>

          {inspect.hit && frames.length === 0 && (
            <p className="note">
              No source: either nothing in this node's owner chain is app code, or the bundle keeps
              no owner stacks at all, which is every production build.
            </p>
          )}

          {frames.length > 0 && (
            <>
              <fieldset>
                <legend>Source stack, innermost first</legend>
                <div className="stack">
                  {frames.map((f, index) => (
                    <label
                      key={`${f.file}:${f.lineNumber}:${f.column}`}
                      className="lvl-row"
                      aria-label={frameLabel(f)}
                    >
                      <input
                        type="radio"
                        name="wb-frame"
                        checked={index === inspect.selected}
                        onChange={() => inspect.setSelected(index)}
                      />
                      <span>
                        <code>
                          {frameShort(f)}
                          {f.methodName ? ` · ${f.methodName}` : ''}
                        </code>
                        <span className="src">{frameLabel(f)}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>

              {/* `.chosen-label` is the sheet's mono box and this block is one.
                  A textarea rather than a `pre`, so the text can be selected and
                  scrolled by someone who would rather not press the button. */}
              <textarea
                className="chosen-label"
                style={{ width: '100%', color: 'inherit', resize: 'vertical' }}
                readOnly
                rows={5}
                value={block}
                aria-label="Handover block"
              />
              <div className="row">
                <button
                  type="button"
                  className="btn small primary"
                  onClick={() => void navigator.clipboard.writeText(block)}
                >
                  Copy for agent
                </button>
                <button
                  type="button"
                  className="btn small"
                  disabled={!chosen}
                  onClick={() => chosen && inspect.open(chosen)}
                >
                  Open in editor
                </button>
              </div>
              <p className="note">
                Paste it, then say what should be different. The view address is in there, so
                whoever picks this up can put the same thing back on screen before and after.
              </p>
            </>
          )}
        </fieldset>
      </Panel>
    </div>
  );
}
