import { ArrowRight } from 'lucide-react';
import type { ReactNode } from 'react';

import { Badge } from './kit/badge';
import { cn } from '../lib/cn';
import { href } from '../router';

export interface Card {
  route: string;
  title: string;
  blurb?: string;
  /** A word for what kind of thing this is, where the grid mixes kinds. */
  kind?: string;
  /** Drawn above the title, where the thing has a picture of itself. */
  preview?: ReactNode;
}

/**
 * A set of doors, which is what an index page is.
 *
 * One component because three pages want the same one and a fourth will: the
 * landing page's sections, the handbook's documents, the drawings. The card is a
 * link with a heading in it rather than a div with a link, so the whole card is
 * the target and the heading is still a heading.
 */
export function CardGrid({ cards, columns = 2 }: { cards: Card[]; columns?: 2 | 3 }) {
  return (
    <ul
      className={cn(
        'mt-m grid gap-xs',
        columns === 3 ? 'sm:grid-cols-2 xl:grid-cols-3' : 'md:grid-cols-2',
      )}
    >
      {cards.map((card) => (
        <li key={card.route} className="min-w-0">
          <a
            href={href(card.route)}
            className={cn(
              'group flex h-full min-w-0 flex-col overflow-hidden rounded-md border border-stroke bg-surface',
              'transition-colors hover:border-stroke-strong hover:bg-canvas',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
            )}
          >
            {card.preview}
            <span className="flex min-w-0 flex-col p-sm">
              {card.kind && (
                <Badge variant="outline" className="mb-2xs self-start">
                  {card.kind}
                </Badge>
              )}
              <span className="flex items-center gap-2xs text-headline-xs font-semibold text-on-canvas">
                {card.title}
                <ArrowRight
                  aria-hidden="true"
                  className="size-[0.875rem] shrink-0 text-on-canvas-muted transition-transform group-hover:translate-x-3xs"
                />
              </span>
              {card.blurb && (
                <span className="mt-3xs text-m leading-relaxed text-on-canvas-muted">
                  {card.blurb}
                </span>
              )}
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}
