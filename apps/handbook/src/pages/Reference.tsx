import { ChevronRight, ExternalLink, Search as SearchIcon } from 'lucide-react';
import { useMemo, useState } from 'react';

import api from 'virtual:api';
import type { ApiModule, ApiSymbol } from 'virtual:api';
import docsModule from 'virtual:docs';
import { symbolId } from '../nav';
import { Page } from '../ui/Page';

const BLOB = `${docsModule.repo}/blob/${docsModule.commit}`;

/**
 * The core's API, as a place to look something up rather than a site to read.
 *
 * TypeDoc produced this model with `--json` and nothing else. No HTML, no theme.
 * That was the whole reason for choosing it. A generated documentation site would
 * have arrived with its own navigation and its own design, and its pages would
 * have become the front door by accident, ahead of the hand-written architecture
 * pages that are the better way in. Here this site renders the model in its own
 * vocabulary, and the search palette reaches it.
 *
 * `packages/app-core` has no barrel on purpose, so a module IS the import path a
 * caller writes. Each heading prints that line verbatim, because "which subpath
 * do I import" is the question this page most often answers.
 *
 * A symbol with no prose is shown and marked rather than hidden. The gap is worth
 * seeing: 167 of the core's 327 exported symbols carry a doc comment, and the
 * ones that do carry real arguments rather than restatements of their signature.
 *
 * The prose is HTML because the comments are Markdown and lean on backticks for
 * every identifier. The build renders it, from this repository's own source at the
 * commit being built, which is the same trust boundary as the documents.
 */
export function Reference() {
  const [query, setQuery] = useState('');

  const modules = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return api.modules;
    return api.modules
      .map((module) => {
        if (module.subpath.toLowerCase().includes(q)) return module;
        const symbols = module.symbols.filter((s) =>
          `${s.name} ${s.summary}`.toLowerCase().includes(q),
        );
        return symbols.length > 0 ? { ...module, symbols } : null;
      })
      .filter((m): m is (typeof api.modules)[number] => m !== null);
  }, [query]);

  const symbolCount = modules.reduce((n, m) => n + m.symbols.length, 0);

  return (
    <Page>
      <article className="min-w-0">
        <h1 className="text-headline-xl font-bold leading-tight tracking-tight">Reference</h1>
        <p className="mt-xs max-w-content text-m leading-relaxed text-on-canvas-muted">
          Every exported symbol in <code className="font-mono">packages/app-core</code>, extracted
          from the source and its doc comments. The core has no barrel, so a module here is the
          subpath you import. This is a lookup surface; the architecture pages are the way in.
        </p>

        {/* The filter follows the reader down 53 modules, because a lookup surface
            whose filter has scrolled away is a list. `top-0`, not an offset: the
            scroller is the shell's main area, which begins below the header, so an
            offset here would leave a gap the page scrolls through. */}
        <div className="sticky top-0 z-10 mt-m mb-m border-b border-stroke bg-canvas py-s">
          <div className="flex flex-wrap items-center gap-s">
            <label htmlFor="ref-q" className="sr-only">
              Filter modules and symbols
            </label>
            <div className="relative min-w-0 flex-1">
              <SearchIcon
                aria-hidden="true"
                className="pointer-events-none absolute left-xs top-1/2 size-[1rem] -translate-y-1/2 text-on-canvas-muted"
              />
              <input
                id="ref-q"
                type="search"
                placeholder="Filter, for example loadArticle or stores/"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="h-[2.25rem] w-full rounded-md border border-stroke bg-canvas pl-l pr-s text-m text-on-canvas placeholder:text-on-canvas-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              />
            </div>
            <p aria-live="polite" className="text-s tabular-nums text-on-canvas-muted">
              {modules.length} modules, {symbolCount} symbols
            </p>
          </div>
        </div>

        {modules.length === 0 && (
          <p className="py-2xl text-center text-m text-on-canvas-muted">Nothing matches that.</p>
        )}

        {modules.map((module) => (
          <section className="mb-xl" key={module.subpath}>
            <h2
              id={`m-${module.subpath.replace(/\//g, '-')}`}
              className="scroll-mt-[4.75rem] font-mono text-headline-m font-semibold leading-tight [overflow-wrap:anywhere]"
            >
              {module.subpath}
            </h2>
            <p className="mt-3xs break-words font-mono text-s text-on-canvas-muted">
              {`import … from '@correctiv/app-core/${module.subpath}'`}
            </p>
            {module.doc && (
              <div
                className="prose prose-sm mt-s max-w-content"
                dangerouslySetInnerHTML={{ __html: module.doc }}
              />
            )}

            <ul className="mt-s divide-y divide-stroke overflow-hidden rounded-md border border-stroke">
              {module.symbols.map((symbol) => (
                <li key={symbol.name}>
                  <Symbol module={module} symbol={symbol} />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </article>
    </Page>
  );
}

/**
 * One symbol, as a disclosure the search palette can open from the outside.
 *
 * A native `details` rather than a scripted one, because `ui/Search.tsx` jumps to
 * a symbol by setting `open` on the element it finds by id. The React state here
 * only mirrors that back for `aria-expanded`; the element itself stays the owner
 * of whether it is open, so an open from the palette is not undone on the next
 * render.
 */
function Symbol({ module, symbol }: { module: ApiModule; symbol: ApiSymbol }) {
  const [open, setOpen] = useState(false);

  return (
    <details
      id={symbolId(module.subpath, symbol.name)}
      onToggle={(event) => setOpen(event.currentTarget.open)}
      className="group scroll-mt-[4.75rem]"
    >
      <summary
        aria-expanded={open}
        className="flex cursor-pointer list-none items-center gap-xs px-s py-2xs hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent [&::-webkit-details-marker]:hidden"
      >
        <ChevronRight
          aria-hidden="true"
          className="size-[0.875rem] shrink-0 text-on-canvas-muted transition-transform group-open:rotate-90"
        />
        <span className="hidden w-[4.5rem] shrink-0 font-mono text-s text-on-canvas-muted sm:block">
          {symbol.kind}
        </span>
        <span className="shrink-0 font-mono text-m font-semibold">{symbol.name}</span>
        <span className="min-w-0 flex-1 truncate text-s text-on-canvas-muted">
          {symbol.summary || <span className="italic">No doc comment.</span>}
        </span>
      </summary>

      <div className="border-t border-stroke bg-surface px-s py-s sm:pl-xl">
        {symbol.signature && (
          <p className="whitespace-pre-wrap break-words font-mono text-s">{symbol.signature}</p>
        )}
        {symbol.doc && (
          <div
            className="prose prose-sm mt-s max-w-content"
            dangerouslySetInnerHTML={{ __html: symbol.doc }}
          />
        )}
        {/*
          `inline` rather than `inline-flex`, because a path is one word to a
          browser and a flex box will not break one: at 375px this line was
          335px wide inside a 262px box and took the panel sideways with it. As
          inline text it wraps, and `overflow-wrap` gives it somewhere to do so.
        */}
        <a
          href={`${BLOB}/${module.file}#L${symbol.line}`}
          target="_blank"
          rel="noreferrer noopener"
          className="mt-s inline font-mono text-s text-on-canvas-muted underline decoration-accent underline-offset-2 [overflow-wrap:anywhere] hover:text-on-canvas"
        >
          {module.file}:{symbol.line}
          <ExternalLink
            aria-hidden="true"
            className="ml-3xs inline size-[0.75rem] align-[-0.1em]"
          />
        </a>
      </div>
    </details>
  );
}
