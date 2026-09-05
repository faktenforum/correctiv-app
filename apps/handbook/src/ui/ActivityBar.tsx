import { BookText, GitBranch, Braces, ListTree, PenTool, Smartphone } from 'lucide-react';

import { Tooltip, TooltipContent, TooltipTrigger } from './kit/tooltip';
import { cn } from '../lib/cn';
import { href } from '../router';

interface Props {
  route: string;
}

/**
 * The narrow rail that makes everything reachable from everywhere.
 *
 * This is the piece that turns a set of pages into one application: whatever is
 * open, the app, a record, the board, the reference, the next thing is one click
 * away and always in the same place. It is also the only chrome left when both
 * sidebars are shut, which is what a link handed to somebody who just wants to
 * see the app opens into.
 */
const ITEMS = [
  { route: '/', label: 'Overview', Icon: BookText, match: (r: string) => r === '/' },
  {
    route: '/sources',
    label: 'Sources',
    Icon: ListTree,
    match: (r: string) => r.startsWith('/sources'),
  },
  {
    route: '/decisions',
    label: 'Decisions',
    Icon: GitBranch,
    match: (r: string) => r.startsWith('/decisions'),
  },
  {
    route: '/design',
    label: 'Design',
    Icon: PenTool,
    match: (r: string) => r === '/design',
  },
  {
    route: '/reference',
    label: 'Reference',
    Icon: Braces,
    match: (r: string) => r === '/reference',
  },
  {
    route: '/workbench',
    label: 'The app',
    Icon: Smartphone,
    match: (r: string) => r === '/workbench',
  },
];

export function ActivityBar({ route }: Props) {
  return (
    <nav
      aria-label="Sections"
      className="flex w-[3rem] shrink-0 flex-col items-center gap-3xs border-r border-stroke bg-surface py-xs"
    >
      {ITEMS.map((item) => {
        const active = item.match(route);
        return (
          <Tooltip key={item.route}>
            <TooltipTrigger asChild>
              <a
                href={href(item.route)}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'relative flex size-[2.25rem] items-center justify-center rounded-md transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                  active
                    ? 'bg-canvas text-on-canvas'
                    : 'text-on-canvas-muted hover:bg-canvas hover:text-on-canvas',
                )}
              >
                {/* The active mark is a bar rather than a fill alone, so the
                    current section is legible without relying on colour. */}
                {active && (
                  <span
                    aria-hidden="true"
                    className="absolute -left-xs top-2xs bottom-2xs w-[2px] rounded-full bg-accent"
                  />
                )}
                <item.Icon aria-hidden="true" className="size-[1.125rem]" />
                <span className="sr-only">{item.label}</span>
              </a>
            </TooltipTrigger>
            <TooltipContent side="right">{item.label}</TooltipContent>
          </Tooltip>
        );
      })}
    </nav>
  );
}
