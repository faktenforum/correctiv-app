import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { ROOT } from '../plugin/collect.ts';

const STYLES = join(ROOT, 'apps/handbook/src/styles');

/**
 * Names deliberately shared between stylesheets, with the reason.
 *
 * Short, and it should stay short. Every entry is a name two pages have agreed to
 * mean the same thing, and the agreement is not written down anywhere else.
 */
const SHARED = new Set([
  'vh', // visually hidden, the same utility everywhere
  'sr-only', // the sources design's name for the same thing
  'muted', // dimmed prose
  'count', // a tally beside a heading
  'chip', // a small pill; every page draws its own, none conflicts
  'glyph', // the shape beside a status word
  'name',
  'sub',
  'mark',
  'section',
  'lede',
  'actions',
  'field',
  'date',
  'tag',
  'skip', // the skip link, the same element on every page
  'wrap', // the page container
  'mono', // monospace utility
  'theme', // the appearance toggle, one widget in the shared header
  'table-wrap', // the scroll box a wide table sits in
]);

function classSelectors(css: string): Set<string> {
  const found = new Set<string>();
  // Only rules whose selector is a bare class at the start, which is the shape
  // that reaches across a page boundary. `.page .thing` is already scoped.
  for (const match of css.matchAll(
    /(?:^|\n)\s*((?:\.[a-zA-Z][\w-]*)(?:[.:[][^\s,{]*)?)\s*(?:,|\{)/g,
  )) {
    const name = /^\.([a-zA-Z][\w-]*)/.exec(match[1])?.[1];
    if (name) found.add(name);
  }
  return found;
}

describe('the page stylesheets, which share one global scope', () => {
  const sheets = readdirSync(STYLES)
    .filter((f) => f.endsWith('.css'))
    .map((file) => ({ file, classes: classSelectors(readFileSync(join(STYLES, file), 'utf8')) }));

  it('has more than one sheet to compare', () => {
    expect(sheets.length).toBeGreaterThan(2);
  });

  /**
   * The collision this test exists for.
   *
   * Five pages were designed separately and their stylesheets were ported into one
   * global scope. `shell.css` defined `.row` for a navigation row, with
   * `display: grid`; the sources board uses `tr.row` for its table rows. The rule
   * matched, every cell became a grid item, and the whole table collapsed into a
   * column of stacked words. Nothing in the build could see it: the types are
   * fine, the tests were green, and the page renders.
   *
   * A name in two sheets is either a deliberate agreement, and belongs in SHARED
   * above, or it is this bug waiting to happen.
   */
  it('defines no class name in two sheets without saying so', () => {
    const owners = new Map<string, string[]>();
    for (const sheet of sheets) {
      for (const name of sheet.classes) {
        if (SHARED.has(name)) continue;
        owners.set(name, [...(owners.get(name) ?? []), sheet.file]);
      }
    }
    const collisions = [...owners.entries()]
      .filter(([, files]) => files.length > 1)
      .map(([name, files]) => `.${name} in ${files.join(' and ')}`);
    expect(collisions).toEqual([]);
  });

  /**
   * The second kind of collision, and the one that is easier to miss.
   *
   * A page drawn as a standalone document styles `h1`, `h2`, `h3` and `p`
   * directly, which is correct there and wrong in one global scope: the diagrams
   * sheet arrived with `h3 { text-transform: uppercase }` and shouted the landing
   * page's door titles. `shell.css` is the exception because prose typography is
   * exactly its job.
   */
  it('leaves bare element selectors to the prose stylesheet', () => {
    const ELEMENTS =
      /(?:^|\n)\s*((?:html|body|main|header|footer|nav|section|article|aside|h[1-6]|p|ul|ol|li|dl|dt|dd|a|code|pre|table|thead|tbody|tr|th|td|figure|figcaption|blockquote|hr|img|svg|input|button|label|select|summary|details|del|ins|kbd|form|fieldset|legend|output)\b[^\n{,]*)(?:,|\{)/g;

    const offenders: string[] = [];
    for (const sheet of sheets) {
      if (sheet.file === 'shell.css') continue;
      const css = readFileSync(join(STYLES, sheet.file), 'utf8');
      for (const match of css.matchAll(ELEMENTS)) {
        offenders.push(`${sheet.file}: ${match[1].trim()}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
