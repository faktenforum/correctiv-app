import type { Status } from '../api';

const NAMES: Record<number, string> = {
  1: 'setting light',
  2: 'setting dark',
  3: 'setting system · device light',
  4: 'setting system · device dark',
};

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
  const combo = status.combination;
  return (
    <div className="readout">
      {size.w} × {size.h} px <span className="sep">·</span> {Math.round(scale * 100)}%
      {combo !== null && (
        <>
          {' '}
          <span className="sep">·</span> appearance {combo}/4 ({NAMES[combo]})
          {combo === 4 && ' · the default'}
        </>
      )}
      {status.handle === false && (
        <>
          {' '}
          <span className="sep">·</span> no dev handle
        </>
      )}
    </div>
  );
}
