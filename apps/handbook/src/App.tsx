import { useEffect, useState } from 'react';

import docsModule from 'virtual:docs';
import { Landing } from './pages/Landing';
import { Document } from './pages/Document';
import { Header } from './ui/Header';
import { Search } from './ui/Search';
import { Sidebar } from './ui/Sidebar';
import { useAppearance } from './theme';
import { useLinkInterception, useRoute } from './router';

/** Pages that get the full width, because they have no long prose to measure. */
const WIDE = new Set(['/']);

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
  const wide = WIDE.has(route);

  useEffect(() => {
    document.title = wide ? 'CORRECTIV app handbook' : `${doc?.title ?? 'Not found'} — Handbook`;
  }, [doc, wide]);

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
          {doc ? <Document doc={doc} /> : <NotFound route={route} />}
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
