import { cn } from '../../lib/cn';
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
 * It sits below the frame rather than above it because it is the only component
 * holding `Status`: `Stage`'s props are the contract with `Workbench.tsx` and
 * carry the state, not what was read back out of the frame.
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
    <footer className="flex flex-wrap items-center gap-x-s gap-y-3xs border-t border-stroke bg-surface px-s py-xs text-s text-on-canvas-muted">
      <div className="flex flex-wrap items-center gap-x-2xs gap-y-3xs rounded-md border border-stroke bg-canvas px-xs py-3xs">
        {/*
          A swatch of what the APP is painting, which must not follow this page's
          own scheme. `bg-white` and `bg-neutral-700` are primitives for exactly
          that reason: they are the two grounds a device scheme means, and a role
          would move with the wrong thing.
        */}
        <span
          aria-hidden="true"
          className={cn(
            'size-[0.625rem] rounded-full border border-stroke-strong',
            status.active === 'dark' ? 'bg-neutral-700' : 'bg-white',
          )}
        />
        <span>
          App is <b>{status.active}</b>
        </span>
        <span aria-hidden="true" className="text-stroke-strong">
          |
        </span>
        <span>
          setting <b>{status.appTheme ?? 'unknown'}</b>
        </span>
        <span aria-hidden="true" className="text-stroke-strong">
          |
        </span>
        <span>
          device reports <b>{status.scheme ?? 'unknown'}</b>
        </span>
        <span aria-hidden="true" className="text-stroke-strong">
          |
        </span>
        <span>
          combination{' '}
          <b className="font-mono tabular-nums">{combo ? `${combo.n} of 4` : 'unknown'}</b>
          {combo?.isDefault && ', the default'}
        </span>
        <span className="ml-xs tabular-nums">
          {size.w} × {size.h} px at {Math.round(scale * 100)}%
        </span>
      </div>

      {/*
        Said in words, not by greying something out. Half the panels behind the
        tools switch cannot work in the static export, and a reader who never
        opens them still deserves to know which build they are looking at.
      */}
      {!status.handle && (
        <span>
          Published build: no dev handle, so the appearance setting and the inspector are inert.
        </span>
      )}
    </footer>
  );
}
