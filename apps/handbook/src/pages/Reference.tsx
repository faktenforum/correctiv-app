import { useMemo, useState } from 'react';

import api from 'virtual:api';
import docsModule from 'virtual:docs';

const BLOB = `${docsModule.repo}/blob/${docsModule.commit}`;

/**
 * The core's API, as a place to look something up rather than a site to read.
 *
 * TypeDoc produced this model with `--json` and nothing else: no HTML, no theme.
 * That was the whole reason for choosing it. A generated documentation site would
 * have arrived with its own navigation and its own design, and its pages would
 * have become the front door by accident, ahead of the hand-written architecture
 * pages that are the better way in. Here the model is rendered by this site, in
 * this site's vocabulary, and it is reachable from the search palette.
 *
 * `packages/app-core` has no barrel on purpose, so a module IS the import path a
 * caller writes. Each heading prints that line verbatim, because "which subpath
 * do I import" is the question this page most often answers.
 *
 * A symbol with no prose is shown and marked rather than hidden. The gap is worth
 * seeing: 167 of the core's 327 exported symbols carry a doc comment, and the
 * ones that do carry real arguments rather than restatements of their signature.
 *
 * The prose is HTML because the comments are written as Markdown, leaning on
 * backticks for every identifier. It is rendered at build time, from this
 * repository's own source at the commit being built, which is the same trust
 * boundary as the documents.
 */
export function Reference() {
  const [query, setQuery] = useState('');

  const modules = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return api.modules;
    return api.modules
      .map((module) => {
        if (module.subpath.toLowerCase().includes(q)) return module;
        const symbols = module.symbols.filter((s) =>
          `${s.name} ${s.summary}`.toLowerCase().includes(q),
        );
        return symbols.length > 0 ? { ...module, symbols } : null;
      })
      .filter((m): m is (typeof api.modules)[number] => m !== null);
  }, [query]);

  const symbolCount = modules.reduce((n, m) => n + m.symbols.length, 0);

  return (
    <main className="content" id="content">
      <article className="doc" id="top">
        <div className="ref-head">
          <h1>Reference</h1>
          <p>
            Every exported symbol in <code>packages/app-core</code>, extracted from the source and
            its doc comments. The core has no barrel, so a module here is the subpath you import.
            This is a lookup surface; the architecture pages are the way in.
          </p>
        </div>

        <div className="ref-filter">
          <label className="vh" htmlFor="ref-q">
            Filter modules and symbols
          </label>
          <input
            id="ref-q"
            type="search"
            placeholder="Filter, for example loadArticle or stores/"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <span className="count">
            {modules.length} modules, {symbolCount} symbols
          </span>
        </div>

        {modules.length === 0 && <p className="ref-empty">Nothing matches that.</p>}

        {modules.map((module) => (
          <section className="ref-module" key={module.subpath}>
            <h2 id={`m-${module.subpath.replace(/\//g, '-')}`}>{module.subpath}</h2>
            <p className="ref-import">
              import …&nbsp;from &apos;@correctiv/app-core/{module.subpath}&apos;
            </p>
            {module.doc && (
              <div className="ref-doc" dangerouslySetInnerHTML={{ __html: module.doc }} />
            )}

            <ul className="ref-symbols">
              {module.symbols.map((symbol) => (
                <li key={symbol.name}>
                  <details className="ref-symbol">
                    <summary>
                      <span className="ref-kind">{symbol.kind}</span>
                      <span className="ref-name">{symbol.name}</span>
                      <span className="ref-summary">
                        {symbol.summary || (
                          <span className="ref-undocumented">No doc comment.</span>
                        )}
                      </span>
                    </summary>
                    <div className="ref-body">
                      {symbol.signature && <p className="ref-signature">{symbol.signature}</p>}
                      {symbol.doc && (
                        <div
                          className="ref-prose"
                          dangerouslySetInnerHTML={{ __html: symbol.doc }}
                        />
                      )}
                      <a
                        className="ref-source"
                        href={`${BLOB}/${module.file}#L${symbol.line}`}
                        target="_blank"
                        rel="noreferrer noopener"
                      >
                        {module.file}:{symbol.line}
                      </a>
                    </div>
                  </details>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </article>
    </main>
  );
}
