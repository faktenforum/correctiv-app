import { describe, expect, it } from 'vitest';

import { collectDocs } from '../plugin/collect.ts';
import { DOCUMENTS } from '../plugin/registry.ts';

/**
 * Routes the handbook answers with a component of its own.
 *
 * Kept here as data rather than imported from `src/App.tsx`, because importing it
 * would drag React and the whole page tree into a test whose only question is
 * about strings. The cost is that a route added there and not here goes
 * unchecked, which is why the list is short and sits next to the assertion.
 */
const PAGES = ['/', '/handbook', '/design', '/diagrams', '/reference', '/sources', '/workbench'];

const { module } = collectDocs();

describe('the site’s routes', () => {
  /**
   * The collision this test exists for.
   *
   * `/sources` is a board built from the manifest, and `SOURCES.md` is the record
   * it is built from. Both wanted the same address, and the router prefers its own
   * pages, so the document simply stopped being reachable: no error, no warning,
   * a page that renders and a document that has silently left the site. Nothing
   * else in the build can notice that.
   */
  it('never lets a page shadow a document', () => {
    const documents = new Set(module.docs.map((d) => d.route));
    const shadowed = PAGES.filter((route) => documents.has(route));
    expect(shadowed).toEqual([]);
  });

  it('gives every registered document a distinct route', () => {
    const routes = module.docs.map((d) => d.route);
    expect(routes.length).toBe(new Set(routes).size);
  });

  it('starts every route with a slash and ends none with one', () => {
    // `currentPath()` normalises a trailing slash away before matching, so a route
    // written with one here would never be found and the page would 404.
    const malformed = [...DOCUMENTS.map((d) => d.route), ...PAGES].filter(
      (route) => !route.startsWith('/') || (route.length > 1 && route.endsWith('/')),
    );
    expect(malformed).toEqual([]);
  });
});
