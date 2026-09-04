import { Fragment, useEffect, useState } from 'react';

import { href } from '../../router';
import type { Appearance } from '../../theme';
import { DEVICES } from '../devices';
import { ROUTES } from '../routes';
import { frameSize, writeHash, type PreviewState } from '../state';
import type { Status } from '../api';

interface Props {
  state: PreviewState;
  status: Status;
  routeField: string;
  onRouteField: (value: string) => void;
  onChange: (patch: Partial<PreviewState>) => void;
  onReload: () => void;
  onRaw: () => void;
  /** The site's own appearance, which is not the app's. See `ChromeTheme` below. */
  appearance: Appearance;
  onAppearance: (next: Appearance) => void;
}

const ZOOMS: { value: string; label: string }[] = [
  { value: '0.5', label: '50%' },
  { value: '0.75', label: '75%' },
  { value: '1', label: '100%' },
  { value: 'fit', label: 'Fit' },
];

/** System first, because it is the default and the one that shipped broken. */
const CHROME_ORDER: Appearance[] = ['system', 'light', 'dark'];

/**
 * The demo's own controls, and one switch to everything else.
 *
 * This row is what the published Pages link shows, and `README.md` hands that
 * link out as the way to open the app in a browser. It therefore stays what it
 * has always been, device, size, zoom, route, and every tool added since sits
 * behind `Tools`, off by default. A debug surface is not what someone following
 * a link to see the app came for.
 *
 * `status` is still handed over because the contract with `Workbench.tsx` says
 * so, and it is deliberately not read here: the warning and error counts moved
 * into the dock's head, where the rest of the debug surface lives. A count of
 * errors on the demo bar is the first crack in the two-audience rule above.
 */
export function Toolbar({
  state,
  routeField,
  onRouteField,
  onChange,
  onReload,
  onRaw,
  appearance,
  onAppearance,
}: Props) {
  const size = frameSize(state);

  return (
    <>
      <header className="top">
        {/*
          The site's header stands down on this route, so this is the only chrome
          the page has and the only way back into the handbook. The link goes
          through `href()` because the site is served from `/correctiv-app/` on
          Pages, where a bare `/` leaves it.
        */}
        <div className="brand">
          <span className="mark" aria-hidden="true" />
          <a className="muted" href={href('/')}>
            CORRECTIV Handbook
          </a>
          <h1>Workbench</h1>
        </div>

        <div className="toolbar" role="toolbar" aria-label="Frame">
          <label className="field">
            <span>Device</span>
            <select
              value={state.device}
              onChange={(e) =>
                onChange({
                  device: e.target.value,
                  landscape: false,
                  ...(e.target.value === 'custom' ? size : {}),
                })
              }
            >
              {DEVICES.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.id === 'custom' ? d.label : `${d.label}, ${d.w}×${d.h}`}
                </option>
              ))}
            </select>
          </label>

          {/*
            Only while the size is the person's own, as in the design. Every
            preset states its size in the option beside it, so two number fields
            that merely echo the select are noise on the bar the demo audience
            sees. Dragging the stage handles switches the device to `custom`,
            which is how the fields appear without anyone looking for them.
          */}
          {state.device === 'custom' && (
            <div className="field">
              <span>Size, CSS px</span>
              <span className="row" style={{ gap: 4 }}>
                <input
                  type="number"
                  className="mono"
                  style={{ width: 70 }}
                  min={240}
                  max={2400}
                  aria-label="Width in CSS pixels"
                  value={size.w}
                  onChange={(e) =>
                    onChange({
                      device: 'custom',
                      landscape: false,
                      w: Math.max(240, Number(e.target.value) || size.w),
                      h: size.h,
                    })
                  }
                />
                ×
                <input
                  type="number"
                  className="mono"
                  style={{ width: 70 }}
                  min={320}
                  max={2400}
                  aria-label="Height in CSS pixels"
                  value={size.h}
                  onChange={(e) =>
                    onChange({
                      device: 'custom',
                      landscape: false,
                      w: size.w,
                      h: Math.max(320, Number(e.target.value) || size.h),
                    })
                  }
                />
              </span>
            </div>
          )}

          {/*
            A fieldset rather than the design's `role="radiogroup"`, and
            `aria-pressed` rather than `role="radio"`: `jsx-a11y`'s
            `prefer-tag-over-role` refuses a button carrying a radio role, and
            the repo's answer to that so far has been a lint exception per file.
            The legend names the group, the pressed state names the choice, and
            the stylesheet paints `[aria-pressed="true"]` inside `.seg` exactly as
            it paints `[aria-checked="true"]`.
          */}
          <fieldset className="field">
            <legend>Orientation</legend>
            <div className="seg">
              <button
                type="button"
                aria-pressed={!state.landscape}
                onClick={() => onChange({ landscape: false })}
              >
                Portrait
              </button>
              <button
                type="button"
                aria-pressed={state.landscape}
                onClick={() => onChange({ landscape: true })}
              >
                Landscape
              </button>
            </div>
          </fieldset>

          <label className="field">
            <span>Zoom</span>
            <select
              value={String(state.zoom)}
              onChange={(e) =>
                onChange({ zoom: e.target.value === 'fit' ? 'fit' : Number(e.target.value) })
              }
            >
              {ZOOMS.map((z) => (
                <option key={z.value} value={z.value}>
                  {z.label}
                </option>
              ))}
            </select>
          </label>

          <label className="field route">
            <span>Route</span>
            <input
              type="text"
              className="mono"
              list="routes"
              spellCheck={false}
              autoComplete="off"
              value={routeField}
              onChange={(e) => onRouteField(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onChange({ route: routeField });
              }}
              onBlur={() => onChange({ route: routeField })}
            />
            <datalist id="routes">
              {ROUTES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </datalist>
          </label>

          <div className="field">
            <span aria-hidden="true">{' '}</span>
            <span className="row" style={{ gap: 6 }}>
              <button type="button" className="btn" title="Reload the frame" onClick={onReload}>
                Reload
              </button>
              <button
                type="button"
                className="btn"
                title="Open the app on its own, without the frame"
                onClick={onRaw}
              >
                Open raw
              </button>
            </span>
          </div>
        </div>

        <div className="grow" />

        {/*
          Two appearances meet on this page and the whole point is that they are
          two. This one is the site's, the chrome around the frame; the app's own
          setting is in the Appearance panel and reaches the app through its dev
          handle. The state lives in `App.tsx`, which owns `data-theme`, because a
          second `useAppearance()` here would be a second copy of it and the two
          would disagree the moment either was used.

          A cycle rather than three buttons, as in the design, and `.btn.on`
          rather than `aria-pressed`: a three-state control has no honest pressed
          value, and the button's own text says which state it is in.
        */}
        <ChromeTheme appearance={appearance} onAppearance={onAppearance} />

        <button
          type="button"
          className="switch"
          role="switch"
          aria-checked={state.tools}
          title="Show the workbench tools"
          onClick={() => onChange({ tools: !state.tools })}
        >
          Tools <span className="track" aria-hidden="true" />
        </button>
      </header>

      <LinkBar state={state} />
    </>
  );
}

/** The chrome's appearance, three states, distinct from the app's own setting. */
function ChromeTheme({
  appearance,
  onAppearance,
}: {
  appearance: Appearance;
  onAppearance: (next: Appearance) => void;
}) {
  const next = CHROME_ORDER[(CHROME_ORDER.indexOf(appearance) + 1) % CHROME_ORDER.length];
  return (
    <button
      type="button"
      className={appearance === 'system' ? 'btn' : 'btn on'}
      title="The appearance of this page. The app inside the frame keeps its own setting."
      onClick={() => onAppearance(next)}
    >
      Chrome: {appearance}
    </button>
  );
}

/**
 * The address, spelled out, because reproducing a view is what it is for.
 *
 * `store.set()` has already written this hash with `replaceState`, so the bar is
 * showing the browser's own address rather than a second rendering of the state
 * that could drift from it. The values are picked out because the point of the
 * bar is that a knob moved and the link changed with it.
 */
function LinkBar({ state }: { state: PreviewState }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const id = window.setTimeout(() => setCopied(false), 1500);
    return () => window.clearTimeout(id);
  }, [copied]);

  const hash = writeHash(state);
  const cut = hash.indexOf('?');
  const route = hash.slice(1, cut === -1 ? undefined : cut);
  const params = cut === -1 ? [] : hash.slice(cut + 1).split('&');

  return (
    <div className="linkbar">
      <span className="muted">This view as a link</span>
      <code aria-live="off">
        {window.location.pathname}#<b>{route}</b>
        {params.map((pair, index) => {
          const [key, value] = pair.split('=');
          return (
            <Fragment key={key}>
              {index === 0 ? '?' : '&'}
              {key}=<b>{value}</b>
            </Fragment>
          );
        })}
      </code>
      <button
        type="button"
        className="btn small"
        onClick={() => {
          void navigator.clipboard.writeText(window.location.href);
          setCopied(true);
        }}
      >
        Copy link
      </button>
      {/* `output`, not a span with `role="status"`: same live region, and the
          element the linter and the platform both name for it. */}
      <output className="flash">{copied ? 'Copied' : ''}</output>
    </div>
  );
}
