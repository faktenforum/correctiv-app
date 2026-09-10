import { ChevronRight, ExternalLink, Search as SearchIcon } from 'lucide-react';
import { useMemo, useState } from 'react';

import api from 'virtual:api';
import type { ApiComponent, ApiComponentGroup } from 'virtual:api';
import docsModule from 'virtual:docs';
import { componentId } from '../nav';
import { href } from '../router';
import { Badge } from '../ui/kit/badge';
import { Page } from '../ui/Page';

const BLOB = `${docsModule.repo}/blob/${docsModule.commit}`;

const { alias, groups, root } = api.components;

/**
 * The app's components, which are the other half of the reference.
 *
 * `/reference` is a library: `packages/app-core` behind subpath imports, the same
 * for every host it ever gets. This is the app's own vocabulary, and the
 * difference is not cosmetic. Nothing here is importable from the core, and the
 * question a reader arrives with is a different one: not "which subpath" but
 * "what does this take", so a row opens onto props rather than a signature.
 *
 * Extracted by the same script and rendered by these components, for the same
 * reason: a generated documentation site would have brought its own navigation
 * and its own design.
 *
 * One thing the extraction cannot give and this page therefore does not claim: a
 * prop typed with an alias the file keeps to itself, `variant?: Variant`, prints
 * that name and not its five values, because a type nothing exports has no
 * reflection for TypeDoc to resolve. The source link on every row is one click
 * from the definition.
 */
export function Components() {
  const [query, setQuery] = useState('');

  /*
   * A prop's name is part of what a component matches on. "onPress" is a real
   * question somebody arrives with, 14 of the 45 components take one, and
   * against the names and the summaries alone it matches nothing at all.
   */
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return groups;
    const matches: ApiComponentGroup[] = [];
    for (const group of groups) {
      if (group.name.toLowerCase().includes(q)) {
        matches.push(group);
        continue;
      }
      const components = group.components.filter((component) =>
        `${component.name} ${component.summary} ${component.props.map((p) => p.name).join(' ')}`
          .toLowerCase()
          .includes(q),
      );
      const helpers = group.helpers.filter((helper) =>
        `${helper.name} ${helper.summary}`.toLowerCase().includes(q),
      );
      if (components.length > 0 || helpers.length > 0) {
        matches.push({ ...group, components, helpers });
      }
    }
    return matches;
  }, [query]);

  const count = filtered.reduce((n, group) => n + group.components.length, 0);

  return (
    <Page>
      <article className="min-w-0">
        <h1 className="text-headline-xl font-bold leading-tight tracking-tight">Components</h1>
        <p className="mt-xs max-w-content text-m leading-relaxed text-on-canvas-muted">
          Every component the app builds its screens from, taken out of{' '}
          <code className="font-mono">{root}</code> with its props, their types and whatever prose
          the source carries. A folder is a section, and the line above each component is the one a
          caller writes. The core&apos;s exports are a separate section:{' '}
          <a
            href={href('/reference')}
            className="text-on-canvas underline decoration-accent underline-offset-2"
          >
            Reference
          </a>
          , which is a library and imported as one.
        </p>

        {/* Sticky for the same reason as on the reference: every component in the
            app is one page, and a filter that has scrolled away is a list.
            `top-0` because the scroller is the shell's main area. */}
        <div className="sticky top-0 z-10 mt-m mb-m border-b border-stroke bg-canvas py-s">
          <div className="flex flex-wrap items-center gap-s">
            <label htmlFor="comp-q" className="sr-only">
              Filter folders, components and props
            </label>
            <div className="relative min-w-0 flex-1">
              <SearchIcon
                aria-hidden="true"
                className="pointer-events-none absolute left-xs top-1/2 size-[1rem] -translate-y-1/2 text-on-canvas-muted"
              />
              <input
                id="comp-q"
                type="search"
                placeholder="Filter, for example Typo, onPress or reader"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="h-[2.25rem] w-full rounded-md border border-stroke bg-canvas pl-l pr-s text-m text-on-canvas placeholder:text-on-canvas-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              />
            </div>
            <p aria-live="polite" className="text-s tabular-nums text-on-canvas-muted">
              {filtered.length} folders, {count} components
            </p>
          </div>
        </div>

        {filtered.length === 0 && (
          <p className="py-2xl text-center text-m text-on-canvas-muted">Nothing matches that.</p>
        )}

        {filtered.map((group) => (
          <section className="mb-xl" key={group.name}>
            <h2
              id={`g-${group.name}`}
              className="scroll-mt-[4.75rem] font-mono text-headline-m font-semibold leading-tight wrap-anywhere"
            >
              {group.name}
            </h2>
            <p className="mt-3xs break-words font-mono text-s text-on-canvas-muted">
              {group.barrel
                ? `import … from '${group.barrel}'`
                : `import … from '${alias}/${group.name}/…'`}
            </p>
            {group.barrel && (
              <p className="mt-3xs max-w-content text-s text-on-canvas-muted">
                This folder has a barrel, so a caller names the folder and not the file.
              </p>
            )}

            <ul className="mt-s divide-y divide-stroke overflow-hidden rounded-md border border-stroke">
              {group.components.map((component) => (
                <li key={`${component.name}-${component.platform ?? ''}`}>
                  <Component group={group.name} component={component} />
                </li>
              ))}
            </ul>

            {group.helpers.length > 0 && (
              <div className="mt-s">
                {/* Not components, and not hidden either: these are exports of
                    the same files that a screen imports beside the component. */}
                <h3 className="text-s font-semibold uppercase tracking-wider text-on-canvas-muted">
                  Also exported here
                </h3>
                <ul className="mt-2xs divide-y divide-stroke overflow-hidden rounded-md border border-stroke">
                  {group.helpers.map((helper) => (
                    <li key={helper.name} className="px-s py-2xs">
                      <p className="flex flex-wrap items-baseline gap-xs">
                        <span className="font-mono text-s text-on-canvas-muted">{helper.kind}</span>
                        <span className="font-mono text-m font-semibold">{helper.name}</span>
                        <span className="min-w-0 flex-1 text-s text-on-canvas-muted">
                          {helper.summary}
                        </span>
                      </p>
                      {helper.signature && (
                        <p className="mt-3xs whitespace-pre-wrap break-words font-mono text-s text-on-canvas-muted">
                          {helper.signature}
                        </p>
                      )}
                      <Source file={helper.file} line={helper.line} />
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        ))}
      </article>
    </Page>
  );
}

/**
 * One component, as a disclosure the search palette can open from the outside.
 *
 * A native `details` for the same reason as on the reference: `ui/Search.tsx`
 * jumps to a row by setting `open` on the element it finds by id, so the element
 * stays the owner of whether it is open and the React state only mirrors it back
 * for `aria-expanded`.
 */
function Component({ group, component }: { group: string; component: ApiComponent }) {
  const [open, setOpen] = useState(false);
  const props = component.props;

  return (
    <details
      id={componentId(group, component.name, component.platform)}
      onToggle={(event) => setOpen(event.currentTarget.open)}
      className="group scroll-mt-[4.75rem]"
    >
      {/*
        The reference's row, plus `text-s`, which the platform pill inherits.
        The kit's badge carries its own size, and `cn` drops it: tailwind-merge
        reads `text-s` and the variant's `text-on-canvas-muted` as one group and
        keeps the last, so a badge can have the colour or the size and not both.
        Setting it here costs nothing, because every other child of this row
        states its own size.
      */}
      <summary
        aria-expanded={open}
        className="flex cursor-pointer list-none items-center gap-xs px-s py-2xs text-s hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent [&::-webkit-details-marker]:hidden"
      >
        <ChevronRight
          aria-hidden="true"
          className="size-[0.875rem] shrink-0 text-on-canvas-muted transition-transform group-open:rotate-90"
        />
        <span className="shrink-0 font-mono text-m font-semibold">{component.name}</span>
        {component.platform && (
          /* The one thing about a row that changes what it is: this file is the
             half Metro keeps for that platform, and the twin beside it is the
             other. Written, not coloured. */
          <Badge variant="outline" className="shrink-0 font-mono">
            {component.platform}
          </Badge>
        )}
        <span className="hidden w-[4.5rem] shrink-0 font-mono text-s tabular-nums text-on-canvas-muted sm:block">
          {props.length === 1 ? '1 prop' : `${props.length} props`}
        </span>
        <span className="min-w-0 flex-1 truncate text-s text-on-canvas-muted">
          {component.summary || <span className="italic">No doc comment.</span>}
        </span>
      </summary>

      <div className="border-t border-stroke bg-surface px-s py-s sm:pl-xl">
        <p className="break-words font-mono text-s text-on-canvas-muted">
          {`import { ${component.name} } from '${component.import}'`}
        </p>
        {component.doc && (
          <div
            className="prose prose-sm mt-s max-w-content"
            dangerouslySetInnerHTML={{ __html: component.doc }}
          />
        )}

        {/* A label and not a heading: the component's own name is in the
            `summary` above, which cannot be a heading without giving up the
            disclosure the palette opens, so a heading here would sit at a depth
            with nothing above it and land in the contents list sideways. */}
        <p className="mt-m text-s font-semibold uppercase tracking-wider text-on-canvas-muted">
          Props
          {/* The type's name beside the label rather than under it, because on
              its own line a bare `CardProps` reads as a value and not as what
              the props below are called. */}
          {component.propsType && (
            <span className="ml-xs font-mono font-normal normal-case tracking-normal">
              {component.propsType}
            </span>
          )}
        </p>
        {component.propsDoc && (
          <div
            className="prose prose-sm mt-2xs max-w-content"
            dangerouslySetInnerHTML={{ __html: component.propsDoc }}
          />
        )}

        {props.length === 0 ? (
          <p className="mt-2xs text-m text-on-canvas-muted">None.</p>
        ) : (
          /* A grid rather than a table: at 390px three columns of code strings
             become a scroll box, and the same rows stacked read correctly. The
             measure on the prose is the reason the second column is `1fr`. */
          <dl className="mt-2xs divide-y divide-stroke border-y border-stroke">
            {props.map((prop) => (
              <div key={prop.name} className="grid gap-2xs py-xs md:grid-cols-[16rem_1fr] md:gap-m">
                <dt className="min-w-0">
                  <code className="rounded-s border border-stroke bg-canvas px-3xs py-4xs font-mono text-s wrap-anywhere">
                    {prop.name}
                    {prop.optional && '?'}
                  </code>
                  <p className="mt-3xs font-mono text-s text-on-canvas-muted wrap-anywhere">
                    {prop.type}
                    {prop.optional && ' · optional'}
                  </p>
                </dt>
                <dd className="min-w-0 max-w-content text-m text-on-canvas-muted">
                  {prop.doc ? (
                    <div
                      className="prose prose-sm"
                      dangerouslySetInnerHTML={{ __html: prop.doc }}
                    />
                  ) : (
                    <span className="text-s italic">No prose.</span>
                  )}
                </dd>
              </div>
            ))}
          </dl>
        )}

        {component.inherits.length > 0 && (
          <p className="mt-s max-w-content text-s text-on-canvas-muted">
            Plus everything in{' '}
            {component.inherits.map((type, index) => (
              <span key={type}>
                {index > 0 && ', '}
                <code className="font-mono wrap-anywhere">{type}</code>
              </span>
            ))}
            , which this repository does not own and which is named here rather than expanded.
          </p>
        )}

        <Source file={component.file} line={component.line} />
      </div>
    </details>
  );
}

/**
 * The file and the line, in the repository at the commit this page was built
 * from.
 *
 * Inline text inside a block, not a flex box, for the reason the reference
 * records: a path is one word to a browser, a flex box will not break one, and at
 * 375px the line took the panel sideways with it. The paragraph around it is what
 * carries the space above, which a margin on an inline element would not.
 */
function Source({ file, line }: { file: string; line: number }) {
  return (
    <p className="mt-s">
      <a
        href={`${BLOB}/${file}#L${line}`}
        target="_blank"
        rel="noreferrer noopener"
        className="font-mono text-s text-on-canvas-muted underline decoration-accent underline-offset-2 wrap-anywhere hover:text-on-canvas"
      >
        {file}:{line}
        <ExternalLink aria-hidden="true" className="ml-3xs inline size-[0.75rem] align-[-0.1em]" />
      </a>
    </p>
  );
}
