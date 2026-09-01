import { DEVICES } from '../devices';
import { ROUTES } from '../routes';
import { frameSize, type PreviewState } from '../state';
import type { Status } from '../api';

interface Props {
  state: PreviewState;
  status: Status;
  routeField: string;
  onRouteField: (value: string) => void;
  onChange: (patch: Partial<PreviewState>) => void;
  onReload: () => void;
  onRaw: () => void;
}

/**
 * The demo's own controls, and one switch to everything else.
 *
 * This row is what the published Pages link shows, and `README.md` hands that
 * link out as the way to open the app in a browser. It therefore stays what it
 * has always been — device, size, zoom, route — and every tool added since sits
 * behind `Tools`, off by default. A debug surface is not what someone following
 * a link to see the app came for.
 */
export function Toolbar({
  state,
  status,
  routeField,
  onRouteField,
  onChange,
  onReload,
  onRaw,
}: Props) {
  const size = frameSize(state);

  return (
    <header className="bar">
      <b>CORRECTIV</b>

      <div className="group">
        <label htmlFor="device">Device</label>
        <select
          id="device"
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
              {d.id === 'custom' ? d.label : `${d.label} — ${d.w}×${d.h}`}
            </option>
          ))}
        </select>
        <button
          aria-label="Rotate"
          title="Swap width and height"
          aria-pressed={state.landscape}
          onClick={() => onChange({ landscape: !state.landscape })}
        >
          ⟳
        </button>
      </div>

      <div className="group">
        <input
          type="number"
          min={240}
          max={2400}
          aria-label="Width"
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
        <span style={{ color: 'var(--bar-dim)' }}>×</span>
        <input
          type="number"
          min={320}
          max={2400}
          aria-label="Height"
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
      </div>

      <div className="group">
        <label htmlFor="zoom">Zoom</label>
        <select
          id="zoom"
          value={String(state.zoom)}
          onChange={(e) =>
            onChange({ zoom: e.target.value === 'fit' ? 'fit' : Number(e.target.value) })
          }
        >
          <option value="fit">Fit</option>
          <option value="1">100%</option>
          <option value="0.75">75%</option>
          <option value="0.5">50%</option>
        </select>
      </div>

      <div className="group grow">
        <label htmlFor="route">Route</label>
        <input
          id="route"
          className="route-field"
          list="routes"
          spellCheck={false}
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
      </div>

      <div className="group">
        <button title="Reload the frame" onClick={onReload}>
          Reload
        </button>
        <button title="Open this route without the shell" onClick={onRaw}>
          Raw ↗
        </button>
        <button
          title="Appearance, state and console"
          aria-pressed={state.tools}
          onClick={() => onChange({ tools: !state.tools })}
        >
          Tools
        </button>
        {status.errors > 0 && (
          <span className="count errors" title="Errors in the frame">
            {status.errors}
          </span>
        )}
        {status.errors === 0 && status.warnings > 0 && (
          <span className="count warnings" title="Warnings in the frame">
            {status.warnings}
          </span>
        )}
      </div>
    </header>
  );
}
