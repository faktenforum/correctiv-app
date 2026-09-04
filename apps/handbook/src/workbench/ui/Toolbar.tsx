import { Fragment, useEffect, useState } from 'react';

import { href } from '../../router';
import type { Appearance } from '../../theme';
import { cn } from '../../lib/cn';
import { DEVICES } from '../devices';
import { ROUTES } from '../routes';
import { frameSize, writeHash, type PreviewState } from '../state';
import type { Status } from '../api';

/** The toolbar's one field shape, so its selects and inputs agree. */
const FIELD =
  'h-[1.75rem] rounded-md border border-stroke bg-canvas px-2xs text-s text-on-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent';

/** And its one label shape, above each field. */
const LABEL = 'text-s text-on-canvas-muted';

/** The toolbar's one button shape, so its six controls agree. */
const BTN =
  'inline-flex h-[1.75rem] items-center rounded-md border border-stroke bg-canvas px-xs text-s text-on-canvas transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50';

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
      <header className="flex flex-wrap items-center gap-x-m gap-y-xs border-b border-stroke bg-canvas px-s py-xs">
        {/*
          The site's header stands down on this route, so this is the only chrome
          the page has and the only way back into the handbook. The link goes
          through `href()` because the site is served from `/correctiv-app/` on
          Pages, where a bare `/` leaves it.
        */}
        <div className="flex items-center gap-2xs text-m font-semibold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
          <span className="size-[0.875rem] rounded-s bg-accent" aria-hidden="true" />
          <a className="text-on-canvas-muted" href={href('/')}>
            CORRECTIV Handbook
          </a>
          <h1>Workbench</h1>
        </div>

        <div
          className="flex flex-wrap items-end gap-x-m gap-y-xs"
          role="toolbar"
          aria-label="Frame"
        >
          <label className="flex flex-col gap-4xs">
            <span className={LABEL}>Device</span>
            <select
              className={FIELD}
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
            <div className="flex flex-col gap-4xs">
              <span className={LABEL}>Size, CSS px</span>
              <span className="flex items-center gap-3xs">
                <input
                  className={cn(FIELD, 'w-[4.5rem] text-center font-mono tabular-nums')}
                  type="number"
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
                  className={cn(FIELD, 'w-[4.5rem] text-center font-mono tabular-nums')}
                  type="number"
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
          <fieldset className="flex flex-col gap-4xs">
            <legend>Orientation</legend>
            <div className="flex items-center rounded-md border border-stroke p-4xs">
              <button
                type="button"
                aria-pressed={!state.landscape}
                onClick={() => onChange({ landscape: false })}
                className={cn(
                  'rounded-s px-xs py-4xs text-s transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                  !state.landscape
                    ? 'bg-accent text-white'
                    : 'text-on-canvas-muted hover:text-on-canvas',
                )}
              >
                Portrait
              </button>
              <button
                type="button"
                aria-pressed={state.landscape}
                onClick={() => onChange({ landscape: true })}
                className={cn(
                  'rounded-s px-xs py-4xs text-s transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                  state.landscape
                    ? 'bg-accent text-white'
                    : 'text-on-canvas-muted hover:text-on-canvas',
                )}
              >
                Landscape
              </button>
            </div>
          </fieldset>

          <label className="flex flex-col gap-4xs">
            <span className={LABEL}>Zoom</span>
            <select
              className={FIELD}
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

          <label className="flex min-w-[14rem] flex-1 flex-col gap-4xs">
            <span className={LABEL}>Route</span>
            <input
              className={cn(FIELD, 'w-full font-mono')}
              type="text"
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

          <div className="flex flex-col gap-4xs">
            <span aria-hidden="true">{' '}</span>
            <span className="flex items-center gap-2xs">
              <button type="button" className={BTN} title="Reload the frame" onClick={onReload}>
                Reload
              </button>
              <button
                type="button"
                className={BTN}
                title="Open the app on its own, without the frame"
                onClick={onRaw}
              >
                Open raw
              </button>
            </span>
          </div>
        </div>

        <div className="flex-1" />

        {/*
          Two appearances meet on this page and the whole point is that they are
          two. This one is the site's, the chrome around the frame; the app's own
          setting is in the Appearance panel and reaches the app through its dev
          handle. The state lives in `App.tsx`, which owns `data-theme`, because a
          second `useAppearance()` here would be a second copy of it and the two
          would disagree the moment either was used.

          A cycle rather than three buttons, and no `aria-pressed`: a three-state
          control has no honest pressed value, and the button's own text says
          which state it is in.
        */}
        <ChromeTheme appearance={appearance} onAppearance={onAppearance} />

        <button
          type="button"
          role="switch"
          aria-checked={state.tools}
          title="Show the workbench tools"
          onClick={() => onChange({ tools: !state.tools })}
          className="inline-flex h-[1.75rem] items-center gap-xs rounded-full border border-stroke bg-canvas pl-s pr-3xs text-s font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          Tools
          <span
            aria-hidden="true"
            className={cn(
              'flex h-[1.125rem] w-[2rem] items-center rounded-full p-4xs transition-colors',
              state.tools ? 'bg-accent' : 'bg-stroke',
            )}
          >
            <span
              className={cn(
                'size-[0.875rem] rounded-full bg-white transition-transform',
                state.tools && 'translate-x-[0.875rem]',
              )}
            />
          </span>
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
      className={cn(BTN, appearance !== 'system' && 'bg-surface')}
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
    <div className="flex flex-wrap items-center gap-xs border-b border-stroke bg-surface px-s py-3xs text-s">
      <span className="text-on-canvas-muted">This view as a link</span>
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
        className={cn(BTN, 'h-[1.5rem]')}
        onClick={() => {
          void navigator.clipboard.writeText(window.location.href);
          setCopied(true);
        }}
      >
        Copy link
      </button>
      {/* `output`, not a span with `role="status"`: same live region, and the
          element the linter and the platform both name for it. */}
      <output className="text-on-canvas-accent">{copied ? 'Copied' : ''}</output>
    </div>
  );
}
