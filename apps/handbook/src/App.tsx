import { type ReactElement, useEffect, useState } from 'react';

import docsModule from 'virtual:docs';
import { Diagrams } from './pages/Diagrams';
import { Document } from './pages/Document';
import { Landing } from './pages/Landing';
import { Reference } from './pages/Reference';
import { Sources } from './pages/Sources';
import { Header } from './ui/Header';
import { Search } from './ui/Search';
import { Sidebar } from './ui/Sidebar';
import { TooltipProvider } from './ui/kit/tooltip';
import { Workbench } from './workbench/Workbench';
import { PAGE_TITLES } from './nav';
import { useAppearance } from './theme';
import { useLinkInterception, useRoute } from './router';

/**
 * Routes the handbook answers with a component of its own.
 *
 * The workbench is not here: it is the one page that needs the site's appearance
 * state, so `App` renders it by name. `test/routes.test.ts` holds this set apart
 * from the documents, because a route that collided with one would shadow it
 * with no error anywhere.
 */
const PAGES = new Map<string, () => ReactElement>([
  ['/', Landing],
  ['/diagrams', Diagrams],
  ['/reference', Reference],
  ['/sources', Sources],
]);

/** Pages that bring their own chrome, so the site's header and rail stand down. */
const OWN_CHROME = new Set(['/workbench']);

export function App() {
  const [route] = useRoute();
  const [appearance, setAppearance] = useAppearance();
  const [navOpen, setNavOpen] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);

  useLinkInterception();

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSearchOpen((open) => !open);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const doc = docsModule.docs.find((d) => d.route === route);
  const Page = PAGES.get(route);
  const ownChrome = OWN_CHROME.has(route);

  useEffect(() => {
    const named = PAGE_TITLES[route];
    document.title =
      route === '/' ? 'CORRECTIV app handbook' : `${named ?? doc?.title ?? 'Not found'} — Handbook`;
  }, [doc, route]);

  if (ownChrome) {
    return (
      <TooltipProvider delayDuration={300}>
        <Workbench appearance={appearance} onAppearance={setAppearance} />
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider delayDuration={300}>
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-accent focus:px-s focus:py-xs focus:text-white"
      >
        Skip to content
      </a>

      <Header
        appearance={appearance}
        onAppearance={setAppearance}
        onSearch={() => setSearchOpen(true)}
        onToggleNav={() => setNavOpen((open) => !open)}
        navOpen={navOpen}
        hasNav={route !== '/'}
      />

      <div className="flex items-start">
        {route !== '/' && (
          <Sidebar route={route} open={navOpen} onClose={() => setNavOpen(false)} />
        )}
        {Page ? <Page /> : doc ? <Document doc={doc} /> : <NotFound route={route} />}
      </div>

      <Search open={searchOpen} onClose={() => setSearchOpen(false)} />
    </TooltipProvider>
  );
}

function NotFound({ route }: { route: string }) {
  return (
    <main id="content" className="mx-auto max-w-content px-m py-2xl">
      <h1 className="text-2xl font-semibold">No page at {route}</h1>
      <p className="mt-s text-on-canvas-muted">
        The handbook publishes the repository&apos;s own documents. This address matches none of
        them. Try the navigation, or press <kbd className="font-mono">⌘K</kbd>.
      </p>
    </main>
  );
}
