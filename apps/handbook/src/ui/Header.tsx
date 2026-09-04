import { Moon, PanelLeft, Search as SearchIcon, Sun, SunMoon } from 'lucide-react';

import { Button } from './kit/button';
import { Separator } from './kit/separator';
import { cn } from '../lib/cn';
import { href } from '../router';
import type { Appearance } from '../theme';

interface Props {
  appearance: Appearance;
  onAppearance: (next: Appearance) => void;
  onSearch: () => void;
  onToggleNav: () => void;
  navOpen: boolean;
  /** False on pages that bring their own chrome, such as the workbench. */
  hasNav: boolean;
}

const MODES: { value: Appearance; label: string; Icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'dark', label: 'Dark', Icon: Moon },
  { value: 'system', label: 'System', Icon: SunMoon },
];

/**
 * The one bar every page carries, and the only place the site names itself.
 *
 * Three states on the appearance control rather than two, because
 * `TROUBLESHOOTING.md` numbers four combinations and the fourth, "system" against
 * a dark device, is the app's default and the one that has already shipped
 * broken. A two-state toggle cannot express it.
 */
export function Header({
  appearance,
  onAppearance,
  onSearch,
  onToggleNav,
  navOpen,
  hasNav,
}: Props) {
  return (
    <header className="sticky top-0 z-30 flex h-[3.5rem] items-center gap-xs border-b border-stroke bg-canvas px-s">
      {hasNav && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleNav}
          aria-expanded={navOpen}
          aria-controls="site-nav"
          aria-label={navOpen ? 'Collapse navigation' : 'Expand navigation'}
        >
          <PanelLeft aria-hidden="true" />
        </Button>
      )}

      <a
        href={href('/')}
        className="flex items-center gap-xs rounded-md px-3xs py-3xs text-[0.9375rem] font-semibold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <span aria-hidden="true" className="size-[0.875rem] rounded-[3px] bg-accent" />
        CORRECTIV
        <span className="font-normal text-on-canvas-muted">Handbook</span>
      </a>

      <div className="flex-1" />

      <Button
        variant="outline"
        size="sm"
        onClick={onSearch}
        className="gap-xs text-on-canvas-muted"
        aria-label="Search the documentation"
      >
        <SearchIcon aria-hidden="true" />
        <span className="hidden sm:inline">Search</span>
        <kbd className="hidden rounded border border-stroke px-3xs font-mono text-[0.6875rem] sm:inline">
          ⌘K
        </kbd>
      </Button>

      <Separator orientation="vertical" className="mx-3xs h-[1.5rem]" />

      <div
        role="radiogroup"
        aria-label="Appearance"
        className="flex items-center rounded-md border border-stroke p-4xs"
      >
        {MODES.map((mode, i) => (
          <button
            key={mode.value}
            type="button"
            role="radio"
            aria-checked={appearance === mode.value}
            tabIndex={appearance === mode.value ? 0 : -1}
            onClick={() => onAppearance(mode.value)}
            onKeyDown={(event) => {
              const step =
                event.key === 'ArrowRight' || event.key === 'ArrowDown'
                  ? 1
                  : event.key === 'ArrowLeft' || event.key === 'ArrowUp'
                    ? -1
                    : 0;
              if (step === 0) return;
              event.preventDefault();
              onAppearance(MODES[(i + step + MODES.length) % MODES.length].value);
            }}
            className={cn(
              'flex size-[1.75rem] items-center justify-center rounded-[3px] transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
              appearance === mode.value
                ? 'bg-surface text-on-canvas'
                : 'text-on-canvas-muted hover:text-on-canvas',
            )}
          >
            <mode.Icon aria-hidden="true" className="size-[1rem]" />
            <span className="sr-only">{mode.label}</span>
          </button>
        ))}
      </div>
    </header>
  );
}
