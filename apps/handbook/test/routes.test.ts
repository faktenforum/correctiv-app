import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { collectDocs, ROOT } from '../plugin/collect.ts';
import { DOCUMENTS } from '../plugin/registry.ts';
import { PAGE_ROUTES } from '../src/shell/views.ts';

const { module } = collectDocs();

/**
 * What is left here once the shell has a declaration table.
 *
 * "A page must not shadow a document" and "every route resolves" moved to
 * `test/shell.test.ts`, where they are asked of `resolveView` rather than of a
 * list typed twice. These two are still about strings and nothing else.
 */
describe('the site’s routes', () => {
  it('gives every registered document a distinct route', () => {
    const routes = module.docs.map((d) => d.route);
    expect(routes.length).toBe(new Set(routes).size);
  });

  it('starts every route with a slash and ends none with one', () => {
    // `currentPath()` normalises a trailing slash away before matching, so a route
    // written with one here would never be found and the page would 404.
    const malformed = [...DOCUMENTS.map((d) => d.route), ...PAGE_ROUTES].filter(
      (route) => !route.startsWith('/') || (route.length > 1 && route.endsWith('/')),
    );
    expect(malformed).toEqual([]);
  });

  /**
   * The app is reachable from the component route by frame, and must not be by
   * address.
   *
   * This is the second shape of one bug. The page used to link to `/app/gallery`,
   * and the link needed `data-external` or this site's own router took it and
   * landed on "No page at /app/gallery" without a request ever reaching the app.
   * That got the attribute, and the link then failed for a second reason nothing
   * in the build could see: in a development bundle the app matches routes
   * without stripping its base path, so `/app/gallery` is a page it does not have
   * and it renders its own 404 (ADR 0025, measured).
   *
   * So the drawing happens in a frame, which reaches the route through the app's
   * own router, and no anchor points into the app's directory. The third
   * assertion is the half ADR 0028 adds: the overview has no frame at all any
   * more, because a card of three hundred pixels cannot hold a device.
   */
  it('draws the app in a frame on the detail route, and links to it by no address', () => {
    const pages = join(ROOT, 'apps/handbook/src/pages');
    const detail = readFileSync(join(pages, 'ComponentDetail.tsx'), 'utf8');
    const overview = readFileSync(join(pages, 'Components.tsx'), 'utf8');

    const anchors = (detail.match(/<a\b[^>]*>/g) ?? []).filter((tag) => tag.includes('/app'));
    expect(anchors).toEqual([]);

    expect(detail).toContain('`/gallery?c=${id}&bare=1`');
    expect(detail).toContain('<AppFrame');
    expect(overview).not.toContain('AppFrame');
  });
});
