import { ChevronRight } from 'lucide-react';

import { Badge } from './kit/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './kit/collapsible';
import { cn } from '../lib/cn';
import { href } from '../router';
import { NAV } from '../nav';

interface Props {
  route: string;
  open: boolean;
  onClose: () => void;
}

/**
 * The navigation, as a rail that collapses rather than a column that is always
 * there.
 *
 * Collapsing is not decoration here. The decisions group is twenty-four rows
 * long, and the pages people arrive for, the sources board and the workbench, are
 * the two that want the width.
 */
export function Sidebar({ route, open, onClose }: Props) {
  return (
    <>
      {/* The scrim only exists on a narrow window, where the rail floats over the
          page rather than sitting beside it. */}
      <button
        type="button"
        aria-label="Close navigation"
        onClick={onClose}
        hidden={!open}
        className="fixed inset-0 top-[3.5rem] z-20 bg-black/40 md:hidden"
      />

      <nav
        id="site-nav"
        aria-label="Site"
        data-open={open ? 'true' : 'false'}
        className={cn(
          'z-20 w-[15rem] shrink-0 border-r border-stroke bg-canvas',
          'fixed inset-y-[3.5rem] left-0 transition-transform md:sticky md:top-[3.5rem] md:inset-y-auto md:h-[calc(100dvh-3.5rem)] md:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full md:hidden',
        )}
      >
        <div className="h-full overflow-y-auto">
          <div className="p-xs">
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
                            'flex min-w-0 items-center gap-xs rounded-md py-3xs pl-m pr-xs text-m',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                            item.route === route
                              ? 'bg-surface font-medium text-on-canvas'
                              : 'text-on-canvas-muted hover:bg-surface hover:text-on-canvas',
                          )}
                        >
                          {item.number && (
                            <span className="font-mono text-[0.6875rem] tabular-nums">
                              {item.number}
                            </span>
                          )}
                          <span className="min-w-0 truncate">{item.label}</span>
                        </a>
                      </li>
                    ))}
                  </ul>

                  {group.label === 'Decisions' && (
                    <p className="mt-xs border-t border-stroke px-xs pt-xs text-[0.6875rem] leading-relaxed text-on-canvas-muted">
                      A record is never rewritten. A claim a later decision made false is struck
                      through in place, with a <Badge variant="alt">retired</Badge> tag beside it.
                    </p>
                  )}
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        </div>
      </nav>
    </>
  );
}
