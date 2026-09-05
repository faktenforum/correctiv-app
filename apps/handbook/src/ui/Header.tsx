import { Moon, PanelLeft, PanelRight, Search as SearchIcon, Sun, SunMoon } from 'lucide-react';
import type { ReactNode } from 'react';

import { Button } from './kit/button';
import { Separator } from './kit/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from './kit/tooltip';
import { cn } from '../lib/cn';
import { href } from '../router';
import type { Appearance } from '../theme';

interface Props {
  appearance: Appearance;
  onAppearance: (next: Appearance) => void;
  onSearch: () => void;
  explorerOpen: boolean;
  onToggleExplorer: () => void;
  toolsOpen: boolean;
  /** Absent where the open view has nothing to put in the right sidebar. */
  onToggleTools?: () => void;
  toolsLabel?: string;
  /** The context bar: whatever the open view needs across the top. */
  children?: ReactNode;
}

const MODES: { value: Appearance; label: string; Icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'dark', label: 'Dark', Icon: Moon },
  { value: 'system', label: 'System', Icon: SunMoon },
];

/**
 * The bar across the top, and the only place the application names itself.
 *
 * It carries the two sidebar controls, the search, the appearance setting, and a
 * slot in the middle for whatever the open view needs: the device, route and zoom
 * when the app is on screen, and nothing at all when a record is.
 *
 * Three appearance states rather than two, because `TROUBLESHOOTING.md` numbers
 * four combinations and the fourth, "system" against a dark device, is the app's
 * default and the one that has already shipped broken.
 */
export function Header({
  appearance,
  onAppearance,
  onSearch,
  explorerOpen,
  onToggleExplorer,
  toolsOpen,
  onToggleTools,
  toolsLabel,
  children,
}: Props) {
  return (
    <header className="flex min-h-[2.75rem] shrink-0 flex-wrap items-center gap-xs border-b border-stroke bg-canvas py-4xs pl-3xs pr-s">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleExplorer}
            aria-expanded={explorerOpen}
            aria-controls="site-nav"
            aria-label={explorerOpen ? 'Hide the explorer' : 'Show the explorer'}
            className="size-[2rem]"
          >
            <PanelLeft aria-hidden="true" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">Explorer · ⌘B</TooltipContent>
      </Tooltip>

      <a
        href={href('/')}
        className="flex min-w-0 items-center gap-2xs rounded-md px-3xs text-m font-semibold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <span aria-hidden="true" className="size-[0.875rem] shrink-0 rounded-s bg-accent" />
        <span className="truncate">CORRECTIV</span>
      </a>

      {/* The context bar. It is the middle of the header rather than a row of its
          own, so a view that needs no controls costs no height. It is allowed to
          wrap: at 1024px the app view's controls are about forty pixels wider
          than the room left for them, and a control pushed off the end of a bar
          is a control nobody knows is missing. */}
      <div className="flex min-w-0 flex-1 flex-wrap items-center">{children}</div>

      <Button
        variant="outline"
        size="sm"
        onClick={onSearch}
        className="gap-xs text-on-canvas-muted"
        aria-label="Search the handbook"
      >
        <SearchIcon aria-hidden="true" />
        <span className="hidden md:inline">Search</span>
        <kbd className="hidden rounded-s border border-stroke px-3xs font-mono text-s md:inline">
          ⌘K
        </kbd>
      </Button>

      {onToggleTools && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleTools}
              aria-expanded={toolsOpen}
              aria-label={toolsOpen ? `Hide ${toolsLabel}` : `Show ${toolsLabel}`}
              className={cn('size-[2rem]', toolsOpen && 'bg-surface')}
            >
              <PanelRight aria-hidden="true" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">{toolsLabel} · ⌘J</TooltipContent>
        </Tooltip>
      )}

      <Separator orientation="vertical" className="mx-3xs h-[1.5rem]" />

      <div
        role="radiogroup"
        aria-label="Appearance"
        className="flex shrink-0 items-center rounded-md border border-stroke p-4xs"
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
              'flex size-[1.5rem] items-center justify-center rounded-s transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
              appearance === mode.value
                ? 'bg-surface text-on-canvas'
                : 'text-on-canvas-muted hover:text-on-canvas',
            )}
          >
            <mode.Icon aria-hidden="true" className="size-[0.875rem]" />
            <span className="sr-only">{mode.label}</span>
          </button>
        ))}
      </div>
    </header>
  );
}
