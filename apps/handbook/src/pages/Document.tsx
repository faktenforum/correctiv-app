import { ExternalLink } from 'lucide-react';
import { useEffect, useRef } from 'react';

import docsModule from 'virtual:docs';
import type { RenderedDoc } from '../../plugin/markdown.ts';
import { Badge } from '../ui/kit/badge';

interface Props {
  doc: RenderedDoc;
}

const REPO_BLOB = `${docsModule.repo}/blob/${docsModule.commit}`;

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

        <div
          className="prose prose-sm max-w-none prose-headings:scroll-mt-20 prose-pre:border prose-pre:border-stroke"
          dangerouslySetInnerHTML={{ __html: doc.html }}
        />

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
