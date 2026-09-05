import { ChevronRight } from 'lucide-react';

import { Badge } from './kit/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './kit/collapsible';
import { cn } from '../lib/cn';
import { href } from '../router';
import { NAV } from '../nav';

interface Props {
  route: string;
}

/**
 * The navigation, as a rail that collapses rather than a column that is always
 * there.
 *
 * Collapsing is not decoration here. The decisions group is twenty-four rows
 * long, and the pages people arrive for, the sources board and the workbench, are
 * the two that want the width.
 */
export function Sidebar({ route }: Props) {
  return (
    <nav id="site-nav" aria-label="Site" className="p-xs">
      {NAV.map((group) => (
        <Collapsible
          key={group.label}
          defaultOpen={group.open || group.items.some((item) => item.route === route)}
          className="mb-3xs"
        >
          <CollapsibleTrigger className="group flex w-full items-center gap-2xs rounded-md px-xs py-2xs text-s font-semibold uppercase tracking-wider text-on-canvas-muted hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
            <ChevronRight
              aria-hidden="true"
              className="size-[0.875rem] transition-transform group-data-[state=open]:rotate-90"
            />
            {group.label}
          </CollapsibleTrigger>

          <CollapsibleContent>
            <ul className="mt-4xs space-y-px">
              {group.items.map((item) => (
                <li key={item.route}>
                  <a
                    href={href(item.route)}
                    title={item.label}
                    aria-current={item.route === route ? 'page' : undefined}
                    className={cn(
                      'flex min-w-0 items-start gap-xs rounded-md py-3xs pl-m pr-xs text-m',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                      item.route === route
                        ? 'bg-surface font-medium text-on-canvas'
                        : 'text-on-canvas-muted hover:bg-surface hover:text-on-canvas',
                    )}
                  >
                    {item.number && (
                      <span className="shrink-0 pt-[0.1875rem] font-mono text-[0.6875rem] tabular-nums">
                        {item.number}
                      </span>
                    )}
                    {/*
                      Two lines rather than one and an ellipsis. In a panel this
                      wide "An npm workspac…" is twenty-four records that all look
                      the same, and the title is the only thing that tells them
                      apart.
                    */}
                    <span className="line-clamp-2 min-w-0 leading-snug">{item.label}</span>
                  </a>
                </li>
              ))}
            </ul>

            {group.label === 'Decisions' && (
              <p className="mt-xs border-t border-stroke px-xs pt-xs text-[0.6875rem] leading-relaxed text-on-canvas-muted">
                A record is never rewritten. A claim a later decision made false is struck through
                in place, with a <Badge variant="alt">retired</Badge> tag beside it.
              </p>
            )}
          </CollapsibleContent>
        </Collapsible>
      ))}
    </nav>
  );
}
