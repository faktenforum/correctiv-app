import { COMBINATIONS, type Status } from '../api';

/**
 * Size, zoom, and which appearance combination is actually on screen.
 *
 * The last part is the point. `TROUBLESHOOTING.md` records a shipped bug that a
 * browser walk missed precisely because the walk set the app to `dark` and
 * emulated `prefers-color-scheme: light`, "exercising both paths that work and
 * neither that breaks". You cannot avoid a combination you cannot see you are
 * in, so the shell states it rather than leaving it to be inferred.
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
    <div className="readout">
      {size.w} × {size.h} px <span className="sep">·</span> {Math.round(scale * 100)}%
      {combo && (
        <>
          {' '}
          <span className="sep">·</span> appearance {combo.n}/4 ({combo.label.toLowerCase()})
          {combo.isDefault && ' · the default'}
        </>
      )}
      {!status.handle && (
        <>
          {' '}
          <span className="sep">·</span> no dev handle
        </>
      )}
    </div>
  );
}
