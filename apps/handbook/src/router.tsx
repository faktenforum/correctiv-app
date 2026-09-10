import { useCallback, useEffect, useState } from 'react';

/**
 * The site is served from a directory, not always from a domain root.
 *
 * Locally that directory is `/`; on Pages it is `/correctiv-app/`. Vite hands the
 * value over as `BASE_URL`, and every route in this app is written without it, so
 * only `currentPath` and `href` below know about the prefix. One more place knows,
 * and knows deliberately: `workbench/frame/handle.ts` adds `/app` to it, because
 * where the app answers is not a route of this site. Anything that is a route goes
 * through `href`.
 */
const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

/** A site route, e.g. `/decisions/0022`, from wherever the browser currently is. */
export function currentPath(): string {
  const path = window.location.pathname;
  const stripped = BASE && path.startsWith(BASE) ? path.slice(BASE.length) : path;
  return (stripped || '/').replace(/\/$/, '') || '/';
}

/** The address to put in an `href`, which is the route plus the prefix. */
export function href(route: string): string {
  return `${BASE}${route === '/' ? '/' : route}`;
}

export function navigate(route: string): void {
  window.history.pushState(null, '', href(route));
  window.dispatchEvent(new PopStateEvent('popstate'));
}

/**
 * The current route, and a navigate that does not reload the page.
 *
 * Deliberately small. A router library would bring its own link component, its
 * own data conventions and a second idea of what a route is, and this site has
 * thirty documents and six pages.
 */
export function useRoute(): [string, (route: string) => void] {
  const [route, setRoute] = useState(currentPath);

  useEffect(() => {
    const onPop = () => setRoute(currentPath());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  return [route, navigate];
}

/**
 * Turns a click on any in-site link into a navigation, once, at the root.
 *
 * The documents are rendered HTML strings, so their links are plain `<a>`
 * elements that no component wraps. Delegating from the root is what lets a link
 * inside `ARCHITECTURE.md` behave like every other link on the site without the
 * Markdown pipeline having to know React exists.
 *
 * Modified clicks, new tabs and anything the renderer marked external are left
 * to the browser, which is what a reader expects of them.
 */
export function useLinkInterception(): void {
  const onClick = useCallback((event: MouseEvent) => {
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    const anchor = (event.target as Element | null)?.closest?.('a');
    if (!(anchor instanceof HTMLAnchorElement)) return;
    if (anchor.target === '_blank' || anchor.dataset.external === 'true') return;

    const url = new URL(anchor.href, window.location.href);
    if (url.origin !== window.location.origin) return;

    // An anchor on the page we are already on is the browser's job, not ours.
    if (url.pathname === window.location.pathname && url.hash) return;

    const path = url.pathname;
    if (BASE && !path.startsWith(BASE)) return;

    event.preventDefault();
    window.history.pushState(null, '', url.pathname + url.hash);
    window.dispatchEvent(new PopStateEvent('popstate'));
    if (url.hash) {
      // The target does not exist until the new route has rendered.
      requestAnimationFrame(() => {
        document.getElementById(decodeURIComponent(url.hash.slice(1)))?.scrollIntoView();
      });
    } else {
      window.scrollTo(0, 0);
    }
  }, []);

  useEffect(() => {
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [onClick]);
}
