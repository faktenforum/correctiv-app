import {
  Maximize2,
  PanelRight,
  PanelRightClose,
  Search as SearchIcon,
  Settings as SettingsIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';

import { Button } from './kit/button';
import { Separator } from './kit/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from './kit/tooltip';
import { cn } from '../lib/cn';
import { href } from '../router';

interface Props {
  onSearch: () => void;
  onSettings: () => void;
  toolsOpen: boolean;
  /** Absent where the open view has nothing to put in the right sidebar. */
  onToggleTools?: () => void;
  toolsLabel?: string;
  /** Present only where there is something worth having the screen to itself. */
  onFull?: () => void;
  /** The context bar: whatever the open view needs across the top. */
  children?: ReactNode;
}

/**
 * The bar across the top, and the only place the application names itself.
 *
 * The right sidebar's control sits on the right sidebar's side, at the end of the
 * bar, with everything that belongs to no side in between. A control for the
 * right-hand panel sitting to the left of the search was a control pointing at
 * nothing.
 *
 * It changes its icon as well as its ground. `PanelRight` says "there is a panel
 * here" and `PanelRightClose` says "and it is open, this shuts it", which is a
 * difference a reader who cannot tell the two grounds apart can still see.
 */
export function Header({
  onSearch,
  onSettings,
  toolsOpen,
  onToggleTools,
  toolsLabel,
  onFull,
  children,
}: Props) {
  const ToolsIcon = toolsOpen ? PanelRightClose : PanelRight;
  return (
    <header className="flex min-h-[2.75rem] shrink-0 flex-wrap items-center gap-xs border-b border-stroke bg-canvas py-4xs pl-3xs pr-s">
      <a
        href={href('/')}
        className="flex min-w-0 items-center gap-2xs rounded-md px-3xs text-m font-semibold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <span aria-hidden="true" className="size-[0.875rem] shrink-0 rounded-s bg-accent" />
        {/* The mark alone below `sm`. On a 390px screen the word is a fifth of
            the bar and the mark says the same thing. */}
        <span className="hidden truncate sm:inline">CORRECTIV</span>
        <span className="sr-only sm:hidden">CORRECTIV handbook</span>
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

      {onFull && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={onFull}
              aria-label="Give the app the whole screen"
              className="size-[2rem]"
            >
              <Maximize2 aria-hidden="true" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">The app on its own</TooltipContent>
        </Tooltip>
      )}

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={onSettings}
            aria-label="Settings"
            className="size-[2rem]"
          >
            <SettingsIcon aria-hidden="true" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">Settings</TooltipContent>
      </Tooltip>

      {onToggleTools && (
        <>
          <Separator orientation="vertical" className="mx-3xs h-[1.5rem]" />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggleTools}
                aria-expanded={toolsOpen}
                aria-label={toolsOpen ? `Hide ${toolsLabel}` : `Show ${toolsLabel}`}
                className={cn('size-[2rem]', toolsOpen && 'bg-surface text-on-canvas')}
              >
                <ToolsIcon aria-hidden="true" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">{toolsLabel} · ⌘J</TooltipContent>
          </Tooltip>
        </>
      )}
    </header>
  );
}
