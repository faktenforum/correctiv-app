import { useEffect, useRef } from 'react';

import type { RenderedDoc } from '../../plugin/markdown';
import docsModule from 'virtual:docs';
import { Toc } from '../ui/Toc';

interface Props {
  doc: RenderedDoc;
}

const REPO_BLOB = `${docsModule.repo}/blob/${docsModule.commit}`;

/**
 * One document from the repository, with the site's own furniture around it.
 *
 * The HTML is a string produced at build time, so it goes in through
 * `dangerouslySetInnerHTML`. That is safe here in the way the name is asking
 * about: the input is this repository's own Markdown at the commit being built,
 * not anything a reader can supply.
 */
export function Document({ doc }: Props) {
  const article = useRef<HTMLElement>(null);

  useEffect(() => {
    annotateRetired(article.current);
  }, [doc.route]);

  const record = doc.route.startsWith('/decisions/') ? doc.route.slice(11) : null;

  return (
    <>
      <main className="content" id="content">
        <article className="doc" id="top" ref={article}>
          <nav className="crumbs" aria-label="Breadcrumb">
            <ol>
              <li>Handbook</li>
              {record && <li>Decisions</li>}
              <li>{record ? `ADR ${record}` : doc.nav}</li>
            </ol>
          </nav>

          <div dangerouslySetInnerHTML={{ __html: doc.html }} />

          <footer className="doc-source">
            <p>
              This page is{' '}
              <a href={`${REPO_BLOB}/${doc.file}`} target="_blank" rel="noreferrer noopener">
                <code>{doc.file}</code>
              </a>{' '}
              in the repository, rendered here. It is not a copy, so there is one place to edit it.
              {doc.retired.length > 0 && (
                <>
                  {' '}
                  {doc.retired.length}{' '}
                  {doc.retired.length === 1 ? 'claim on this page has' : 'claims on this page have'}{' '}
                  been retired and {doc.retired.length === 1 ? 'is' : 'are'} struck through in
                  place.
                </>
              )}
            </p>
          </footer>
        </article>
      </main>
      <Toc headings={doc.headings} />
    </>
  );
}

/**
 * Wraps the clause after each struck claim in the annotation the design draws.
 *
 * The convention in `adr/` is "~~the old claim~~ Voided by ADR 0020.", so the
 * reason is the sentence that follows the strike. This finds that sentence and
 * moves it into an `<ins class="retired">` carrying a small tag, which is what
 * makes the site say "this was true and is no longer, and here is what changed
 * it" rather than leaving a reader to guess whether a struck sentence is a
 * correction, a joke or a rendering fault. This project strikes claims often
 * enough that guessing is the wrong default.
 *
 * Done here rather than in the Markdown renderer because it is presentation, and
 * because the renderer sees one token at a time and the relationship being drawn
 * is between a token and what follows it. `plugin/markdown.ts` extracts the same
 * pairing for the counts and the tests; this is the visual half.
 *
 * `<ins>` is the honest element: the annotation really is a later insertion, and
 * it is not in the source document.
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
          // Keep the remainder of the paragraph outside the annotation: the
          // clause is one sentence, and a chip around three paragraphs would be
          // a highlight rather than a note.
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
    // Some records put the reason in the next paragraph, where no amount of
    // walking will find it. Those get the tag alone rather than a chip drawn
    // around whatever happened to follow.
    if (clause.length > 0 && length <= 260) {
      del.after(ins);
      ins.append(...clause);
    } else {
      del.after(ins);
    }
  }
}
