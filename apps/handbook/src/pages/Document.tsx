import { ExternalLink } from 'lucide-react';
import { useEffect, useMemo, useRef } from 'react';

import docsModule from 'virtual:docs';
import type { RenderedDoc } from '../../plugin/markdown.ts';
import type { ReactNode } from 'react';
import { CoreAndHost } from '../diagrams/CoreAndHost';
import { Badge } from '../ui/kit/badge';

interface Props {
  doc: RenderedDoc;
}

const REPO_BLOB = `${docsModule.repo}/blob/${docsModule.commit}`;

/**
 * The drawings a document may ask for by name, keyed by the id in its fence.
 *
 * `ARCHITECTURE.md` opens with the core and its host as ASCII, which is the only
 * picture an editor or GitHub can show. `/diagrams` has the same thing drawn. The
 * document keeps its ASCII and the site swaps in the drawing, so there is still
 * one source and two renderings of it rather than two sources.
 */
const DIAGRAMS: Record<string, () => ReactNode> = {
  'core-host': CoreAndHost,
};

/**
 * One document from the repository, rendered into the shell's main area.
 *
 * The contents list is not here. The shell puts it in the right sidebar, beside
 * the inspector it puts there for the app, because both answer the same question
 * about whatever is open.
 *
 * The HTML is a string produced at build time, so it goes in through
 * `dangerouslySetInnerHTML`. That is safe in the way the name asks about: the
 * input is this repository's own Markdown at the commit being built, not
 * anything a reader can supply.
 */
export function Document({ doc }: Props) {
  const article = useRef<HTMLElement>(null);
  const parts = useMemo(() => split(doc.html), [doc.html]);

  useEffect(() => {
    annotateRetired(article.current);
  }, [doc.route]);

  const record = doc.route.startsWith('/decisions/') ? doc.route.slice(11) : null;

  return (
    <div className="px-m py-ml lg:px-12">
      <article ref={article} className="mx-auto max-w-content">
        <nav aria-label="Breadcrumb" className="mb-sm text-s text-on-canvas-muted">
          <ol className="flex flex-wrap items-center gap-2xs">
            <li>Handbook</li>
            {record && (
              <>
                <li aria-hidden="true">/</li>
                <li>Decisions</li>
              </>
            )}
            <li aria-hidden="true">/</li>
            <li className="text-on-canvas">{record ? `ADR ${record}` : doc.nav}</li>
          </ol>
        </nav>

        {doc.retired.length > 0 && (
          <p className="mb-m flex items-center gap-xs text-m text-on-canvas-muted">
            <Badge variant="alt">{doc.retired.length} retired</Badge>
            {doc.retired.length === 1
              ? 'One claim on this page is'
              : 'Claims on this page are'}{' '}
            struck through where they stand, with what voided them beside them.
          </p>
        )}

        {/*
          The document, in as many pieces as it has drawings in it, with the
          drawings between them.
          
          Not a portal into the rendered HTML. That was the first attempt and it
          rendered nothing: the node a portal is given has to be the one React is
          still holding, and the node this component captures lives inside a
          `dangerouslySetInnerHTML` that React owns and may replace under it.
          Splitting the string is the version where React owns every piece.
        */}
        {parts.map((part, i) =>
          part.diagram ? (
            <Diagram key={`d${i}`} id={part.diagram} />
          ) : (
            <div
              key={`h${i}`}
              className="prose prose-sm max-w-none prose-headings:scroll-mt-8 prose-pre:border prose-pre:border-stroke"
              dangerouslySetInnerHTML={{ __html: part.html }}
            />
          ),
        )}

        <footer className="mt-xl border-t border-stroke pt-sm text-m text-on-canvas-muted">
          <p>
            This page is{' '}
            <a
              href={`${REPO_BLOB}/${doc.file}`}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-3xs font-mono text-on-canvas underline decoration-accent underline-offset-2"
            >
              {doc.file}
              <ExternalLink aria-hidden="true" className="size-[0.75rem]" />
            </a>{' '}
            in the repository, rendered here. It is not a copy, so there is one place to edit it.
          </p>
        </footer>
      </article>
    </div>
  );
}

/** The slot `plugin/markdown.ts` leaves where a document names a drawing. */
const SLOT = /<div data-diagram="([\w-]+)"><\/div>/;

interface Part {
  html: string;
  diagram?: string;
}

/** The rendered document, cut at each slot, so React can own both halves. */
function split(html: string): Part[] {
  const parts: Part[] = [];
  let rest = html;
  for (let hit = SLOT.exec(rest); hit; hit = SLOT.exec(rest)) {
    if (hit.index > 0) parts.push({ html: rest.slice(0, hit.index) });
    parts.push({ html: '', diagram: hit[1] });
    rest = rest.slice(hit.index + hit[0].length);
  }
  if (rest) parts.push({ html: rest });
  return parts;
}

/**
 * One drawing, or the nothing that says the id names no drawing here.
 *
 * A slot nobody answers renders nothing rather than an error: the document is
 * still readable, and the ASCII it kept is still in the file for anybody reading
 * it in an editor.
 */
function Diagram({ id }: { id: string }) {
  const Figure = DIAGRAMS[id];
  return Figure ? <Figure /> : null;
}

/**
 * Wraps the clause after each struck claim in the annotation the site draws.
 *
 * The convention in `adr/` is "~~the old claim~~ Voided by ADR 0020.", so the
 * reason is the sentence that follows the strike. A reader landing on a struck
 * sentence with no annotation has to guess whether it is a correction, a joke or
 * a rendering fault, and this project strikes claims often enough that guessing
 * is the wrong default.
 *
 * `<ins>` is the honest element: the annotation really is a later insertion and
 * is not in the source document.
 */
function annotateRetired(root: HTMLElement | null): void {
  if (!root) return;

  for (const del of root.querySelectorAll('del')) {
    if (del.dataset.annotated === 'true') continue;
    del.dataset.annotated = 'true';

    const clause: Node[] = [];
    let node = del.nextSibling;
    while (node) {
      // A second strike starts its own claim, so this one's reason ends here.
      if (node.nodeType === Node.ELEMENT_NODE && (node as Element).tagName === 'DEL') break;
      if (node.nodeType === Node.TEXT_NODE) {
        const end = /[.!?](\s|$)/.exec((node as Text).data);
        if (end) {
          // One sentence. A chip drawn around three paragraphs is a highlight.
          (node as Text).splitText(end.index + 1);
          clause.push(node);
          node = null;
          break;
        }
      }
      const next = node.nextSibling;
      clause.push(node);
      node = next;
    }

    const ins = document.createElement('ins');
    ins.className = 'retired';
    const tag = document.createElement('span');
    tag.className = 'tag';
    tag.textContent = 'retired';
    ins.append(tag);

    const length = clause.reduce((n, c) => n + (c.textContent?.length ?? 0), 0);
    del.after(ins);
    // Some records put the reason in the next paragraph, where no amount of
    // walking finds it. Those get the tag alone rather than a chip drawn around
    // whatever happened to follow.
    if (clause.length > 0 && length <= 260) ins.append(...clause);
  }
}
