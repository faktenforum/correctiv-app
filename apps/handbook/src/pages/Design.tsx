import { ExternalLink } from 'lucide-react';
import { useState } from 'react';

import docsModule from 'virtual:docs';
import { href } from '../router';
import { Page } from '../ui/Page';

/** The file this project is designed in. One place, so nothing here is a copy. */
const FIGMA_FILE = 'https://www.figma.com/design/9n7x4eWzdZXVlRej7jWJHx/CORRECTIV-App--Aufbau';

/**
 * Figma's own embed host. It renders the file for a viewer who may open it, and
 * an access screen for one who may not, which is the honest outcome either way.
 */
const FIGMA_EMBED = `https://embed.figma.com/design/9n7x4eWzdZXVlRej7jWJHx/CORRECTIV-App--Aufbau?embed-host=correctiv-handbook`;

const LINK =
  'font-medium text-on-canvas underline decoration-accent underline-offset-2 hover:text-on-canvas-accent';

const CARD = 'rounded-md border border-stroke bg-surface p-sm';

/**
 * The design file, framed, and the three places this repository already touches it.
 *
 * Framed rather than only linked, because the question this view answers is "what
 * is the screen supposed to look like", and an answer behind a click in another
 * tab is one nobody checks against the running app. The app itself is one view
 * away, at the same size, which is the comparison worth making.
 *
 * The embed is loaded on request rather than on arrival. It is a third-party
 * frame that fetches a design file, and mounting it for every reader of a
 * documentation site, most of whom came for something else, spends their
 * bandwidth on a picture they did not ask for.
 */
export function Design() {
  const [framed, setFramed] = useState(false);

  return (
    <Page>
      <article className="min-w-0">
        <h1 className="text-headline-xl font-bold leading-tight tracking-tight">Design</h1>
        <p className="mt-xs max-w-content text-m leading-relaxed text-on-canvas-muted">
          The app is designed in one Figma file,{' '}
          <b className="text-on-canvas">CORRECTIV App, Aufbau</b>. It is the source for the screens,
          and this handbook is the source for everything written down about them.
        </p>

        <p className="mt-s">
          <a href={FIGMA_FILE} target="_blank" rel="noreferrer noopener" className={LINK}>
            Open the file in Figma
            <ExternalLink aria-hidden="true" className="ml-3xs inline size-[0.75rem]" />
          </a>
        </p>

        <section className="mt-l" aria-labelledby="h-embed">
          <h2
            id="h-embed"
            className="text-s font-semibold uppercase tracking-wider text-on-canvas-muted"
          >
            The file, here
          </h2>

          {/*
            Before the frame, not after it. Figma answers a viewer without access
            with its own sign-in screen, and a sign-in screen inside a page like
            this one reads as a broken embed rather than as a permission. Measured
            on 2026-09-05: the frame loads and Figma renders that screen, so the
            embed itself is not blocked.
          */}
          <p className="mt-s max-w-content text-m leading-relaxed text-on-canvas-muted">
            The frame below shows the file to anyone signed in to Figma with access to it, and a
            Figma sign-in screen to everybody else. That is a permission, not a fault: this file is
            not shared publicly. Sharing it as <i>anyone with the link can view</i> would make it
            render for every reader of this page.
          </p>

          {framed ? (
            <div className="mt-s overflow-hidden rounded-md border border-stroke">
              <iframe
                title="CORRECTIV App, Aufbau, in Figma"
                src={FIGMA_EMBED}
                allowFullScreen
                sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                className="block h-[min(70vh,44rem)] w-full border-0 bg-surface"
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setFramed(true)}
              className="mt-s flex h-[14rem] w-full items-center justify-center rounded-md border border-dashed border-stroke-strong bg-surface px-m text-m text-on-canvas transition-colors hover:bg-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              Load the Figma file in a frame
            </button>
          )}
        </section>

        <section className="mt-xl" aria-labelledby="h-repo">
          <h2
            id="h-repo"
            className="text-s font-semibold uppercase tracking-wider text-on-canvas-muted"
          >
            Where the design reaches the code
          </h2>
          <div className="mt-s grid gap-xs md:grid-cols-3">
            <div className={CARD}>
              <h3 className="text-m font-semibold">The colours</h3>
              <p className="mt-3xs text-m leading-relaxed text-on-canvas-muted">
                Not redrawn from the file.{' '}
                <code className="font-mono text-[0.875em]">@correctiv/design-tokens</code> is
                generated and both the app and this site import the same stylesheet, so{' '}
                <code className="font-mono text-[0.875em]">bg-canvas</code> means one thing in three
                places.
              </p>
              <p className="mt-xs">
                <a className={LINK} href={href('/decisions/0010')}>
                  ADR 0010
                </a>
                {' · '}
                <a className={LINK} href={href('/decisions/0022')}>
                  ADR 0022
                </a>
              </p>
            </div>

            <div className={CARD}>
              <h3 className="text-m font-semibold">The board</h3>
              <p className="mt-3xs text-m leading-relaxed text-on-canvas-muted">
                <code className="font-mono text-[0.875em]">tools/figma-plugin</code> draws the
                screen inventory into the file from data in this repository, rather than anybody
                keeping a board in step by hand.
              </p>
              <p className="mt-xs">
                <a className={LINK} href={href('/decisions/0021')}>
                  ADR 0021
                </a>
              </p>
            </div>

            <div className={CARD}>
              <h3 className="text-m font-semibold">The screens</h3>
              <p className="mt-3xs text-m leading-relaxed text-on-canvas-muted">
                What the design says against what the app does. The workbench frames the running app
                at a device size, which is the comparison the file is for.
              </p>
              <p className="mt-xs">
                <a className={LINK} href={href('/workbench')}>
                  Open the app
                </a>
              </p>
            </div>
          </div>
        </section>

        <p className="mt-l text-m text-on-canvas-muted">
          Built from commit{' '}
          <code className="font-mono text-[0.875em]">{docsModule.commit.slice(0, 7)}</code>.
        </p>
      </article>
    </Page>
  );
}
