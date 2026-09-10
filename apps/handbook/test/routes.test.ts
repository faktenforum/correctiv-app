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
   * The app is reachable from `/components` by frame, and must not be by address.
   *
   * This is the second shape of one bug. The page used to link to `/app/gallery`,
   * and the link needed `data-external` or the site's own router took it and landed
   * on "No page at /app/gallery" without a request ever reaching the app. That got
   * the attribute, and the link then failed for a second reason nothing in the build
   * could see: in a development bundle the app matches routes without stripping its
   * base path, so `/app/gallery` is a page it does not have and it renders its own
   * 404 (ADR 0025, measured).
   *
   * So the drawing happens in a frame, which reaches the route through the app's own
   * router, and no anchor here points into the app's directory at all. Both halves
   * are asserted: an address that cannot work must not come back, and the frame's
   * route has to keep the `?c=` that decides which component is drawn.
   */
  it('draws the app in a frame and links to it by no address', () => {
    const page = readFileSync(join(ROOT, 'apps/handbook/src/pages/Components.tsx'), 'utf8');

    const anchors = (page.match(/<a\b[^>]*>/g) ?? []).filter((tag) => tag.includes('/app'));
    expect(anchors).toEqual([]);

    expect(page).toContain('`/gallery?c=${group}/${name}&bare=1`');
    expect(page).toContain('<AppFrame route={route}');
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
