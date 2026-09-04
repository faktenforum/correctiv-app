import { useEffect, useRef } from 'react';

import { COMBINATIONS, type Status } from '../api';
import type { LogEntry } from '../frame/console';
import { frameLabel, frameShort, handover } from '../handover';
import type { Located } from '../frame/locate';
import type { Finding } from '../frame/measure';
import { FIXTURES } from '../frame/seed';
import { asCss, PALETTE, TOKENS, type Overrides, type Scheme } from '../frame/tokens';
import type { PreviewState } from '../state';

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

export function Panels(props: Props) {
  return (
    <div className="panels">
      <Appearance {...props} />
      <State {...props} />
      <Console {...props} />
      <Tokens {...props} />
      <Measure {...props} />
      <Inspect {...props} />
    </div>
  );
}

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
 * which one is on screen rather than pretending to have got you there.
 */
function Appearance({ status, onChange }: Props) {
  const missing = !status.handle;
  return (
    <section className="panel">
      <h2>Appearance</h2>
      <div className="combos">
        {COMBINATIONS.map((c) => (
          <button
            key={c.n}
            className={`combo${c.isDefault ? ' default' : ''}`}
            aria-current={status.combination === c.n}
            disabled={missing}
            onClick={() => onChange({ theme: c.theme })}
            title={c.scheme ? `Needs the device on ${c.scheme}` : undefined}
          >
            <span className="n">{c.n}</span>
            {c.label}
          </button>
        ))}
      </div>
      {missing && (
        <p className="note warn">
          No dev handle in this build, so the setting cannot be changed from here.{' '}
          <code>expo export</code> sets <code>__DEV__</code> false: run the shell against{' '}
          <code>npm run web</code>.
        </p>
      )}
      {!missing && status.appTheme === 'system' && (
        <p className="note">
          The device reports <b>{status.scheme ?? 'unknown'}</b>. To reach the other one, emulate{' '}
          <code>prefers-color-scheme</code> in DevTools (Rendering). An iframe cannot be given a
          scheme of its own.
        </p>
      )}
    </section>
  );
}

/**
 * Storage fixtures. Each is a whole state rather than a patch, and each costs a
 * reload: `onboardingDone` and the feed cache are both read before the first
 * render, so neither can be dispatched after the fact.
 */
function State({ state, onChange }: Props) {
  const active = FIXTURES.find((f) => f.id === state.seed);
  return (
    <section className="panel">
      <h2>State</h2>
      <div className="row">
        {FIXTURES.map((f) => (
          <button
            key={f.id}
            aria-pressed={state.seed === f.id}
            onClick={() => onChange({ seed: f.id })}
          >
            {f.label}
          </button>
        ))}
        <button onClick={() => onChange({ seed: null })} disabled={state.seed === null}>
          Leave alone
        </button>
      </div>
      <p className="note">{active ? active.hint : 'Whatever the last visit left in storage.'}</p>
    </section>
  );
}

/** What the app said. A screenshot cannot show this, which is why it is here. */
function Console({ logs, onClearLogs }: Props) {
  return (
    <section className="panel">
      <h2>
        Console
        <button
          style={{ float: 'right', height: 20 }}
          onClick={onClearLogs}
          disabled={logs.length === 0}
        >
          Clear
        </button>
      </h2>
      {logs.length === 0 ? (
        <p className="note">Nothing since the last navigation.</p>
      ) : (
        <ul className="log">
          {logs.map((entry) => (
            <li key={entry.id} className={entry.level}>
              {entry.text}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/**
 * The palette, live. Changing a value here recolours the running app; nothing is
 * written to `tokens/theme.css`, which is vendored from `wp-design-tokens` and
 * stays the source of truth. Copy takes the result there.
 */
function Tokens({ tools }: Props) {
  const { scheme, tokens } = tools;
  const changed = TOKENS.filter((t) => tokens.overrides[t]?.[scheme]);

  const setToken = (token: (typeof TOKENS)[number], value: string | null) => {
    const next: Overrides = { ...tokens.overrides, [token]: { ...tokens.overrides[token] } };
    if (value) next[token]![scheme] = value;
    else delete next[token]![scheme];
    tokens.set(next);
  };

  return (
    <section className="panel">
      <h2>Tokens · {scheme}</h2>
      <div className="tokens">
        {TOKENS.map((token) => {
          const override = tokens.overrides[token]?.[scheme];
          return (
            <label key={token} className="token">
              <input
                type="color"
                value={override ?? PALETTE[scheme][token]}
                onChange={(e) => setToken(token, e.target.value)}
              />
              <span className={override ? 'changed' : undefined}>{token}</span>
            </label>
          );
        })}
      </div>
      <div className="row">
        <label>
          <input
            type="checkbox"
            checked={tokens.textPass}
            onChange={(e) => tokens.setTextPass(e.target.checked)}
          />{' '}
          Text too
        </label>
        <button disabled={!changed.length} onClick={() => tokens.set({})}>
          Reset
        </button>
        <button
          disabled={!changed.length}
          onClick={() => void navigator.clipboard.writeText(asCss(tokens.overrides))}
        >
          Copy CSS
        </button>
      </div>
      <p className="note">
        Surfaces and borders follow the variable. Text and icons are resolved in JavaScript and land
        in inline styles, so <b>Text too</b> chases them by value: a best effort, not a guarantee.
      </p>
    </section>
  );
}

/** The mechanical half of looking: overflow, tap targets, colours off the palette. */
function Measure({ tools }: Props) {
  const { measure } = tools;
  return (
    <section className="panel">
      <h2>Measure</h2>
      <div className="row">
        <button aria-pressed={measure.outline} onClick={() => measure.setOutline(!measure.outline)}>
          Outline boxes
        </button>
        <button onClick={measure.run}>Run checks</button>
      </div>
      {measure.report && (
        <>
          <p className="note">
            {measure.report.findings.length === 0
              ? `Nothing found across ${measure.report.scanned} elements.`
              : `${measure.report.findings.length} in ${measure.report.scanned} elements.`}
            {measure.report.scheme === 'light' &&
              ' Colours are ambiguous in light: #ffffff and #333333 each name two tokens. Re-run in dark.'}
          </p>
          <ul className="log">
            {measure.report.findings.map((f) => (
              <li
                key={`${f.kind}:${f.where}:${f.text}`}
                className={f.kind === 'overflow' ? 'error' : 'warn'}
              >
                {f.text}
                {f.where ? ` — ${f.where}` : ''}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
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
function Inspect({ tools }: Props) {
  const { inspect } = tools;
  const panel = useRef<HTMLElement>(null);

  // The panels row scrolls, and this panel is the one that grows: on a laptop
  // the result of a pick lands below the fold, which would hide the only part of
  // the interaction that matters.
  useEffect(() => {
    if (inspect.hit) panel.current?.scrollIntoView({ block: 'nearest' });
  }, [inspect.hit]);
  const block =
    inspect.hit && inspect.hit.frames.length > 0
      ? handover({
          label: inspect.hit.label,
          frames: inspect.hit.frames,
          selected: inspect.selected,
          view: location.href,
        })
      : '';

  return (
    <section className="panel" ref={panel}>
      <h2>Inspect</h2>
      <div className="row">
        <button aria-pressed={inspect.picking} onClick={() => inspect.setPicking(!inspect.picking)}>
          {inspect.picking ? 'Picking, click the app' : 'Pick an element'}
        </button>
      </div>
      {inspect.hit && (
        <>
          <p className="note">{inspect.hit.label ? `"${inspect.hit.label}"` : 'Element'}</p>
          {inspect.hit.frames.length === 0 ? (
            <p className="note warn">
              No source: either nothing in this node's owner chain is app code, or the bundle keeps
              no owner stacks at all, which is every production build. Inspect wants{' '}
              <code>npm run web</code>.
            </p>
          ) : (
            <>
              <ul className="log frames">
                {inspect.hit.frames.map((f, i) => (
                  <li key={`${f.file}:${f.lineNumber}:${f.column}`}>
                    <button
                      className="frame"
                      aria-pressed={i === inspect.selected}
                      onClick={() => inspect.setSelected(i)}
                      title={`Use this level as the source line — ${frameLabel(f)}`}
                    >
                      {frameShort(f)}
                      {f.methodName ? ` \u00b7 ${f.methodName}` : ''}
                    </button>{' '}
                    <button style={{ height: 20 }} onClick={() => inspect.open(f)}>
                      open
                    </button>
                  </li>
                ))}
              </ul>
              <textarea className="handover" readOnly rows={5} value={block} />
              <div className="row">
                <button onClick={() => void navigator.clipboard.writeText(block)}>
                  Copy for agent
                </button>
              </div>
              <p className="note">
                Paste it, then say what should be different. The view address is in there, so
                whoever picks this up can put the same thing back on screen before and after.
              </p>
            </>
          )}
        </>
      )}
    </section>
  );
}
