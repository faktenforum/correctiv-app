import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { collectDocs, ROOT } from '../plugin/collect.ts';
import { DOCUMENTS } from '../plugin/registry.ts';

/**
 * Routes the handbook answers with a component of its own.
 *
 * Kept here as data rather than imported from `src/App.tsx`, because importing it
 * would drag React and the whole page tree into a test whose only question is
 * about strings. The cost is that a route added there and not here goes
 * unchecked, which is why the list is short and sits next to the assertion.
 */
const PAGES = [
  '/',
  '/handbook',
  '/components',
  '/design',
  '/diagrams',
  '/reference',
  '/sources',
  '/workbench',
];

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

  /**
   * The one address on this site that its own router must not take.
   *
   * `/components` links each component to the app's gallery, and the app is served
   * under this origin — proxied in development, one artifact on Pages. So the
   * interceptor sees a same-origin path under the base and handles it, which lands
   * on the handbook's own "No page at /app/gallery" without a request ever reaching
   * the app; and it rebuilds the address as `pathname + hash`, which drops the `?c=`
   * that link is entirely about. `data-external` is the only thing that keeps it
   * out of the interceptor's hands, it shipped missing once, and neither the build
   * nor a typecheck can notice its absence.
   */
  it('marks the link out of the site into the app as external', () => {
    const page = readFileSync(join(ROOT, 'apps/handbook/src/pages/Components.tsx'), 'utf8');
    const intoTheApp = (page.match(/<a\b[^>]*>/g) ?? []).filter((tag) =>
      tag.includes('/gallery?c='),
    );

    expect(intoTheApp).toHaveLength(1);
    expect(intoTheApp[0]).toContain('data-external="true"');
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
