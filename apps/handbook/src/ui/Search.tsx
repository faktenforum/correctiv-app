import { useEffect, useMemo, useRef, useState } from 'react';

import api from 'virtual:api';
import docsModule from 'virtual:docs';
import { navigate } from '../router';
import { PAGE_TITLES, symbolId } from '../nav';

interface Entry {
  route: string;
  title: string;
  /** What this row is: a document, a section inside one, a record. */
  kind: string;
  hint: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

/**
 * Every heading in every document, and every symbol the core exports.
 *
 * Searching document titles alone finds seven things. The reason someone opens
 * this is to reach "the four ports", "what this retires" or `useIsAdmitted`, and
 * those are headings and symbols, so the index is built at that level and each
 * row navigates to the anchor rather than to the top of a page.
 *
 * The symbols are the reason this is one palette rather than two. The reference
 * is a lookup surface, and looking something up should not require first knowing
 * that it is code rather than prose.
 */
function buildIndex(): Entry[] {
  const entries: Entry[] = [];

  for (const [route, title] of Object.entries(PAGE_TITLES)) {
    entries.push({ route, title, kind: 'Page', hint: '' });
  }

  for (const module of api.modules) {
    for (const symbol of module.symbols) {
      entries.push({
        route: `/reference#${symbolId(module.subpath, symbol.name)}`,
        title: symbol.name,
        kind: `${symbol.kind} · ${module.subpath}`,
        hint: symbol.summary,
      });
    }
  }

  for (const doc of docsModule.docs) {
    const record = doc.route.startsWith('/decisions/') ? doc.route.slice(11) : null;
    entries.push({
      route: doc.route,
      title: doc.title,
      kind: record ? `ADR ${record}` : 'Document',
      hint: doc.blurb || '',
    });
    for (const heading of doc.headings) {
      if (heading.depth < 2 || heading.depth > 3) continue;
      entries.push({
        route: `${doc.route}#${heading.id}`,
        title: heading.text,
        kind: record ? `ADR ${record}` : doc.title,
        hint: '',
      });
    }
  }
  return entries;
}

export function Search({ open, onClose }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const index = useMemo(buildIndex, []);

  const hits = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return index.filter((e) => e.hint !== '' || !e.route.includes('#')).slice(0, 12);
    const terms = q.split(/\s+/);
    return index
      .map((entry) => {
        const haystack = `${entry.title} ${entry.kind} ${entry.hint}`.toLowerCase();
        if (!terms.every((t) => haystack.includes(t))) return null;
        // A title match beats a match anywhere else, and an early one beats a late one.
        const at = entry.title.toLowerCase().indexOf(terms[0]);
        return { entry, score: at === -1 ? 500 : at };
      })
      .filter((x): x is { entry: Entry; score: number } => x !== null)
      .sort((a, b) => a.score - b.score)
      .slice(0, 20)
      .map((x) => x.entry);
  }, [query, index]);

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (open && !el.open) {
      el.showModal();
      setQuery('');
      setCursor(0);
    } else if (!open && el.open) {
      el.close();
    }
  }, [open]);

  useEffect(() => setCursor(0), [query]);

  return (
    <dialog className="search-dialog" ref={dialog} onClose={onClose} aria-label="Search">
      <div className="search-box">
        <input
          className="search-input"
          type="search"
          role="combobox"
          aria-expanded="true"
          aria-controls="search-results"
          aria-activedescendant={hits[cursor] ? `search-hit-${cursor}` : undefined}
          placeholder="Search the documentation"
          value={query}
          autoFocus
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setCursor((c) => Math.min(c + 1, hits.length - 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setCursor((c) => Math.max(c - 1, 0));
            } else if (e.key === 'Enter' && hits[cursor]) {
              e.preventDefault();
              go(hits[cursor].route, onClose);
            }
          }}
        />
        <ul className="search-results" id="search-results" role="listbox">
          {hits.map((hit, i) => (
            <li
              key={hit.route}
              id={`search-hit-${i}`}
              role="option"
              aria-selected={i === cursor}
              aria-label={`${hit.title}, in ${hit.kind}`}
              onMouseEnter={() => setCursor(i)}
              onClick={() => go(hit.route, onClose)}
            >
              <span className="hit-kind">{hit.kind}</span>
              <span className="hit-title">{hit.title}</span>
            </li>
          ))}
          {hits.length === 0 && <li className="search-empty">Nothing matches that.</li>}
        </ul>
      </div>
    </dialog>
  );
}

function go(route: string, onClose: () => void): void {
  const [path, hash] = route.split('#');
  onClose();
  navigate(path);
  if (hash) {
    requestAnimationFrame(() => {
      const target = document.getElementById(hash);
      // A symbol's prose lives in a closed disclosure, so jumping to one that is
      // shut lands on a heading and looks like the search found nothing.
      if (target instanceof HTMLDetailsElement) target.open = true;
      target?.scrollIntoView({ block: 'center' });
    });
  }
}
