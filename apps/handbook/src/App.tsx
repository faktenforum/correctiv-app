import { type ReactElement, useEffect, useState } from 'react';

import docsModule from 'virtual:docs';
import { Diagrams } from './pages/Diagrams';
import { Landing } from './pages/Landing';
import { Reference } from './pages/Reference';
import { Sources } from './pages/Sources';
import { Document } from './pages/Document';
import { Header } from './ui/Header';
import { Search } from './ui/Search';
import { Sidebar } from './ui/Sidebar';
import { useAppearance } from './theme';
import { useLinkInterception, useRoute } from './router';

/** Pages that get the full width, because they have no long prose to measure. */
const WIDE = new Set(['/']);

/**
 * Routes the handbook answers itself, rather than by rendering a document.
 *
 * Kept beside the documents rather than above them: a route that collided with a
 * document's would shadow it silently, and `test/routes.test.ts` holds the two
 * sets apart.
 */
const PAGES = new Map<string, () => ReactElement>([
  ['/diagrams', Diagrams],
  ['/reference', Reference],
  ['/sources', Sources],
]);

export function App() {
  const [route] = useRoute();
  const [appearance, setAppearance] = useAppearance();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  useLinkInterception();

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => setMenuOpen(false), [route]);

  const doc = docsModule.docs.find((d) => d.route === route);
  const Page = PAGES.get(route);
  const wide = WIDE.has(route);

  useEffect(() => {
    if (wide) document.title = 'CORRECTIV app handbook';
    else if (Page) document.title = `${route.slice(1)} — Handbook`;
    else document.title = `${doc?.title ?? 'Not found'} — Handbook`;
  }, [doc, wide, Page, route]);

  return (
    <>
      <a className="skip" href="#content">
        Skip to content
      </a>

      <Header
        appearance={appearance}
        onAppearance={setAppearance}
        onSearch={() => setSearchOpen(true)}
        onMenu={() => setMenuOpen((open) => !open)}
        hasSidebar={!wide}
      />

      {wide ? (
        <Landing />
      ) : (
        <div className="shell">
          <Sidebar route={route} open={menuOpen} onClose={() => setMenuOpen(false)} />
          {Page ? <Page /> : doc ? <Document doc={doc} /> : <NotFound route={route} />}
        </div>
      )}

      <Search open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}

function NotFound({ route }: { route: string }) {
  return (
    <main className="content" id="content">
      <article className="doc">
        <h1>No page at {route}</h1>
        <p>
          The handbook publishes the repository's own documents. This address matches none of them.
          Try the navigation, or press <kbd>⌘</kbd> <kbd>K</kbd>.
        </p>
      </article>
    </main>
  );
}
