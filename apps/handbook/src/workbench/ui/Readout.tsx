import { COMBINATIONS, type Status } from '../api';

/**
 * Size, zoom, and which appearance combination is actually on screen.
 *
 * The last part is the point. `TROUBLESHOOTING.md` records a shipped bug that a
 * browser walk missed precisely because the walk set the app to `dark` and
 * emulated `prefers-color-scheme: light`, "exercising both paths that work and
 * neither that breaks". You cannot avoid a combination you cannot see you are
 * in, so the shell states it rather than leaving it to be inferred.
 *
 * The design puts this bar directly above the frame. It sits below instead
 * because it is the only component holding `Status`: `Stage`'s props are the
 * contract with `Workbench.tsx` and carry the state, not what was read back out
 * of the frame. What it says is unchanged, and the design's own footer says the
 * same thing in prose, that the bar and the frame have separate schemes on
 * purpose.
 */
export function Readout({
  status,
  size,
  scale,
}: {
  status: Status;
  size: { w: number; h: number };
  scale: number;
}) {
  const combo = COMBINATIONS.find((c) => c.n === status.combination);
  return (
    <footer>
      <div className="schemebar">
        {/* `.schemebar .dot.light` and `.dot.dark` are the two fixed grounds the
            sheet keeps for exactly this: a swatch of what the app is painting,
            which must not follow the page's own scheme. */}
        <span className={`dot ${status.active}`} aria-hidden="true" />
        <span>
          App is <b>{status.active}</b>
        </span>
        <span className="sep" aria-hidden="true">
          |
        </span>
        <span>
          setting <b>{status.appTheme ?? 'unknown'}</b>
        </span>
        <span className="sep" aria-hidden="true">
          |
        </span>
        <span>
          device reports <b>{status.scheme ?? 'unknown'}</b>
        </span>
        <span className="sep" aria-hidden="true">
          |
        </span>
        <span>
          combination <b className="mono">{combo ? `${combo.n} of 4` : 'unknown'}</b>
          {combo?.isDefault && ', the default'}
        </span>
        <span className="right muted">
          {size.w} × {size.h} px at {Math.round(scale * 100)}%
        </span>
      </div>

      {/*
        Said in words, not by greying something out. Half the panels behind the
        tools switch cannot work in the static export, and a reader who never
        opens them still deserves to know which build they are looking at.
      */}
      {!status.handle && (
        <span className="muted">
          Published build: no dev handle, so the appearance setting and the inspector are inert.
        </span>
      )}
    </footer>
  );
}
