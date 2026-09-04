import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { ROOT } from '../plugin/collect.ts';

const STYLES = join(ROOT, 'apps/handbook/src/styles');

/**
 * The root class each page stylesheet is allowed to speak through.
 *
 * `shell.css` has none and is the exception: it is the prose stylesheet, so
 * styling `h2`, `p`, `table` and `code` globally is its job. Every other sheet
 * belongs to one page.
 */
const ROOTS: Record<string, string> = {
  'landing.css': '.landing',
  'sources.css': '.sources',
  'diagrams.css': '.diagrams',
  'reference.css': '.reference',
  'workbench.css': '.workbench',
};

/** Comments first: a comma in prose looks exactly like a selector list. */
function withoutComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

/** Every selector in the sheet, at any nesting depth, one per comma part. */
function selectors(css: string): string[] {
  const found: string[] = [];
  for (const match of withoutComments(css).matchAll(/([^{}]*)\{/g)) {
    const head = match[1].trim();
    if (!head || head.startsWith('@')) continue;
    for (const part of head.split(',')) {
      const selector = part.trim();
      // Keyframe stops are not selectors.
      if (selector && !/^(\d+%|from|to)$/.test(selector)) found.push(selector);
    }
  }
  return found;
}

describe('the page stylesheets, which share one global scope', () => {
  const sheets = readdirSync(STYLES).filter((file) => file.endsWith('.css'));

  it('has a root declared for every page stylesheet', () => {
    // A new sheet with no entry above would be checked against nothing.
    const unknown = sheets.filter((file) => file !== 'shell.css' && !ROOTS[file]);
    expect(unknown).toEqual([]);
  });

  /**
   * The invariant, and the only one that actually holds the line.
   *
   * Five pages were drawn as standalone files and their stylesheets were ported
   * into one global scope. Weaker checks kept missing things. Comparing class
   * names across sheets did not see `.finding code` in the workbench sheet
   * shadowing the sources board's findings, because the two sheets do not declare
   * the same leading name. Banning bare element selectors did not see it either,
   * because it starts with a class.
   *
   * Every selector beginning with the page's own root does see all of it. The
   * failures it would have caught, in order of discovery: `.row` from the shell
   * flattening the board's table rows into grid items; `.status` meaning a
   * record's status list in one sheet and the landing page's figure band in
   * another; `h3 { text-transform: uppercase }` from the diagrams sheet shouting
   * the landing page's door titles; and seventy-five selectors in the workbench
   * sheet, `.row`, `.finding`, `.check`, `.panel`, `.line`, that an incomplete
   * anchoring pass had left loose.
   */
  it('lets each page stylesheet speak only through its own root', () => {
    const loose: string[] = [];
    for (const file of sheets) {
      const root = ROOTS[file];
      if (!root) continue;
      for (const selector of selectors(readFileSync(join(STYLES, file), 'utf8'))) {
        // A colour-scheme guard may sit in front of the root: the dark palette has
        // to be selected on the document element, and the rule it guards still
        // belongs to one page.
        const anchored =
          selector.startsWith(root) ||
          new RegExp(`^:root[^\\s]* ${root.replace('.', '\\.')}\\b`).test(selector);
        if (!anchored) loose.push(`${file}: ${selector}`);
      }
    }
    expect(loose).toEqual([]);
  });

  it('leaves the palette to the generated stylesheet', () => {
    // The colours come from packages/design-tokens through plugin/tokens.ts. A
    // page sheet that redefines one forks it, and the fork is the one on screen.
    const SHARED =
      /--(canvas|surface|on-canvas|on-canvas-muted|stroke|stroke-strong|accent|accent-alt|on-accent|on-accent-alt|sans|mono)\s*:/;
    const forks: string[] = [];
    for (const file of sheets) {
      for (const line of withoutComments(readFileSync(join(STYLES, file), 'utf8')).split('\n')) {
        if (SHARED.test(line.trim())) forks.push(`${file}: ${line.trim()}`);
      }
    }
    expect(forks).toEqual([]);
  });

  /**
   * The prose sheet may style prose and the document. It may not style layout.
   *
   * `shell.css` is exempt from the rule above because styling `h2`, `p`, `table`
   * and `code` globally is its job, and it owns `html` and `body` because it is
   * the only sheet that owns the page. That exemption also let `main { padding:
   * 2rem 3rem 4rem }` through, and the workbench is a `<main>` as well: its stage
   * and dock were given 96px of document padding, so the dock stopped short of
   * the page and read as floating. A landmark element is every page's, so the
   * prose sheet has to name a class for it.
   */
  it('keeps the prose stylesheet off the layout elements', () => {
    const LAYOUT = /^(main|header|footer|nav|aside|section|article)\b/;
    const offenders = selectors(readFileSync(join(STYLES, 'shell.css'), 'utf8')).filter((s) =>
      LAYOUT.test(s),
    );
    expect(offenders).toEqual([]);
  });
});
