import { useCallback, useEffect, useMemo, useState } from 'react';

import api from 'virtual:api';
import type { ApiComponent, ApiComponentGroup } from 'virtual:api';
import { componentId } from '../nav';
import { href } from '../router';
import { Badge } from '../ui/kit/badge';
import { Disclosure, Filter, Source } from '../ui/Lookup';
import { Page } from '../ui/Page';
import { AppFrame } from '../workbench/AppFrame';

const { alias, groups, root } = api.components;

/**
 * How many app frames this page may hold at once.
 *
 * Each one boots the whole app bundle. Three is enough to compare two components
 * with a third open by accident, and few enough that a reader who works down the
 * page with the keyboard does not end up with a dozen running apps in a tab.
 */
const FRAME_LIMIT = 3;

/**
 * Which rows are open, and which of those get a frame.
 *
 * The order is the order they were opened in, so the frames go to the three most
 * recent. A row that loses its frame says so where the frame was, rather than
 * going quiet: it is still open, and a reader who opened it is owed an answer
 * about why nothing is drawn.
 *
 * The `details` elements own whether they are open, including when the search
 * palette opens one from the outside (`ui/Lookup.tsx`). This only mirrors it.
 */
function useOpenRows() {
  const [open, setOpen] = useState<string[]>([]);

  const report = useCallback((id: string, isOpen: boolean) => {
    setOpen((prev) => {
      const without = prev.filter((other) => other !== id);
      return isOpen ? [...without, id] : without;
    });
  }, []);

  return { drawing: new Set(open.slice(-FRAME_LIMIT)), report };
}

/**
 * `?c=ui/SectionCard` opens the component the gallery came from.
 *
 * The app's gallery addresses a component the same way — `folder/name`, which is
 * `gallery/catalogue.tsx`'s `componentId` — so one agreement carries a link in both
 * directions and neither side has to know the other's URLs.
 *
 * A query and not this page's own row anchor, and that is the part that was got
 * wrong first. An anchor here has to name the platform, because `media/VideoFrame`
 * is two rows; the gallery draws whichever half the bundler kept and cannot say
 * which, so a hash it built came out as `#c-media-VideoFrame` and matched nothing.
 * Resolved here instead, against the rows that exist, which is why both halves open.
 *
 * Opened and not merely scrolled to, because a row's props live in a closed
 * disclosure and landing on a shut one looks like the link found a heading and
 * nothing else. `ui/Search.tsx` learnt that first.
 *
 * A name that matches nothing does nothing. This is the longer of the two lists, so
 * that only happens to a hand-typed address, and the whole page is a fair answer.
 */
function useAskedFor(): void {
  useEffect(() => {
    const [group, name] = (new URLSearchParams(window.location.search).get('c') ?? '').split('/');
    if (!group || !name) return;
    const rows = groups.find((g) => g.name === group)?.components.filter((c) => c.name === name);
    let first: HTMLDetailsElement | undefined;
    for (const row of rows ?? []) {
      const el = document.getElementById(componentId(group, name, row.platform));
      if (!(el instanceof HTMLDetailsElement)) continue;
      el.open = true;
      first ??= el;
    }
    // `start`, not `center`: an open row is taller than the viewport, and centring
    // one puts its summary — the name, the one thing that says you arrived — a
    // couple of hundred pixels above the top of the page. `scroll-mt` on the
    // disclosure is what keeps it clear of the sticky filter.
    first?.scrollIntoView({ block: 'start' });
  }, []);
}

/**
 * The app's components, which are the other half of the reference.
 *
 * `/reference` is a library: `packages/app-core` behind subpath imports, the same
 * for every host it ever gets. This is the app's own vocabulary, and the
 * difference is not cosmetic. Nothing here is importable from the core, and the
 * question a reader arrives with is a different one: not "which subpath" but
 * "what does this take", so a row opens onto props rather than a signature. What
 * the two pages have in common is their furniture, which is `ui/Lookup.tsx`.
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
  const { drawing, report } = useOpenRows();
  useAskedFor();

  /*
   * A prop's name is part of what a component matches on. "onPress" is a real
   * question somebody arrives with, 14 of the 46 components take one, and
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

        <Filter
          id="comp-q"
          label="Filter folders, components and props"
          placeholder="Filter, for example Typo, onPress or reader"
          value={query}
          onChange={setQuery}
          summary={`${filtered.length} folders, ${count} components`}
        />

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
                  <Component
                    group={group.name}
                    component={component}
                    drawing={drawing}
                    report={report}
                  />
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
 * The way from a description to the thing it describes.
 *
 * This page says what a component takes and the app's `/gallery` draws it, and for
 * a while those were two places with nothing between them. Now the drawing happens
 * here, in the app's own bundle, in a frame the width of a phone.
 *
 * It used to be a link, and the comment here used to argue for one: a frame on this
 * page would boot the whole app to answer "what props does Button take", which is
 * what most readers came for. That argument holds and this is not the exception to
 * it. The disclosure is the control it asked for. A shut row has no frame, and a
 * reader who opens none boots nothing.
 *
 * The link is gone rather than kept beside this, because it could not be made to
 * work in both builds: in development the app has no page at `/app/gallery`, its
 * base path being ignored while it matches routes (ADR 0025), so the reader landed
 * on the app's 404. The frame gets past that the way the workbench does, through
 * the app's own router. What remains is the way into the tool, which is one address
 * in both builds.
 */
function Drawn({ group, name, draw }: { group: string; name: string; draw: boolean }) {
  // `bare`, because the gallery's own header would say what the page around this
  // frame already says, and would leave the component below the fold.
  const route = `/gallery?c=${group}/${name}&bare=1`;

  if (!draw) {
    return (
      <p className="mt-s text-s text-on-canvas-muted">
        {`${FRAME_LIMIT} frames at a time, and there are ${FRAME_LIMIT} open. Close one of the other rows to draw this component.`}
      </p>
    );
  }

  return (
    <>
      <AppFrame route={route} title={`${name}, drawn in the app`} />
      <p className="mt-2xs text-s">
        <a
          className="text-accent underline underline-offset-2"
          href={`${href('/workbench')}#/gallery?d=pixel-8&s=onboarded`}
        >
          Open the gallery in the workbench
        </a>
        <span className="text-on-canvas-muted">, for a device size and an appearance.</span>
      </p>
    </>
  );
}

/** One component: the line that imports it, where to see it, its prose, and what it takes. */
function Component({
  group,
  component,
  drawing,
  report,
}: {
  group: string;
  component: ApiComponent;
  drawing: Set<string>;
  report: (id: string, open: boolean) => void;
}) {
  const props = component.props;
  const id = componentId(group, component.name, component.platform);

  return (
    <Disclosure
      id={id}
      onOpenChange={(open) => report(id, open)}
      summary={
        <>
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
        </>
      }
    >
      <p className="break-words font-mono text-s text-on-canvas-muted">
        {`import { ${component.name} } from '${component.import}'`}
      </p>
      <Drawn group={group} name={component.name} draw={drawing.has(id)} />
      {component.doc && (
        <div
          className="prose prose-sm mt-s max-w-content"
          dangerouslySetInnerHTML={{ __html: component.doc }}
        />
      )}

      {/* A label and not a heading: the component's own name is in the row above,
          which cannot be a heading without giving up the disclosure the palette
          opens, so a heading here would sit at a depth with nothing above it and
          land in the contents list sideways. */}
      <p className="mt-m text-s font-semibold uppercase tracking-wider text-on-canvas-muted">
        Props
        {/* The type's name beside the label rather than under it, because on its
            own line a bare `CardProps` reads as a value and not as what the props
            below are called. */}
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
                  <div className="prose prose-sm" dangerouslySetInnerHTML={{ __html: prop.doc }} />
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
    </Disclosure>
  );
}
