# @correctiv/handbook

The published site: this repository's own documentation, an inventory of what the
app reads, the architecture drawn, a reference generated from the core, and the app
itself in a device frame.

It is what answers at the root of
[faktenforum.github.io/correctiv-app](https://faktenforum.github.io/correctiv-app/).
The app's web export is published beneath it at `/app/`.

```
/                    landing
/architecture        ARCHITECTURE.md
/sources             the status board
/sources/measured    SOURCES.md, the record the board is built from
/decisions           the index · /decisions/0022 one record
/diagrams            the core and its host, the records, the core's layers
/reference           every exported symbol in packages/app-core
/workbench           the app in a device frame, with the inspector
/traps /conventions /readme /release
```

## The rule this package is built around

**It holds no copy of any document.** `plugin/` reads `ARCHITECTURE.md`, `adr/*.md`,
`SOURCES.md` and the rest where they live, parses them at build time, and rewrites
every link: a relative `*.md` becomes a route here, and anything else becomes a link
into the repository **at the commit the page was built from**, so a page describing a
line keeps pointing at that line.

A second copy of `ARCHITECTURE.md` would be the one on the website, and it would be
the one nobody edits.

## Running it

```bash
npm run handbook                 # this site at localhost:5173
npm run web -w @correctiv/mobile # the app it frames, at localhost:8081
```

Both, if you want the workbench. The dev server proxies `/app` to the app's server so
the browser sees one origin; without the second command the frame is empty and the
inspector reports no dev handle.

Against a static export instead, which is what Pages serves:

```bash
npm run build:web                       # the app
npm run build:handbook                  # this site
rm -rf site && cp -r apps/handbook/dist site && cp -r apps/mobile/dist site/app
node screens/tools/serve-clean.mjs site 8099
```

## Same-origin, and why it is load-bearing

Everything the workbench does to the app is a same-origin property access:
`contentWindow`, `matchMedia`, `documentElement.classList`, `localStorage`, and the
handle the app leaves on its own global. Across origins the browser refuses those
reads silently, so the failure is a tool that looks fine and answers nothing.

On Pages both halves are uploaded as one artifact, so `/` and `/app/` are the same
origin. In development the proxy above does the same job. Do not give this package a
second origin. [ADR 0014](../../adr/0014-the-preview-shell-as-a-package.md) explains
the constraint, [ADR 0024](../../adr/0024-the-handbook-owns-the-root.md) explains why
it is met this way.

## What is generated

| Command | Produces |
| --- | --- |
| `npm run api -w @correctiv/handbook` | `content/api.generated.json`, extracted with `typedoc --json` |

TypeDoc runs as a data extractor, never as a site generator: no HTML, no theme. The
model is rendered by this site's own components. A generated documentation site would
have arrived with its own navigation and design and become the front door by accident.

Not committed, because it is derived and large. `npm run build` runs it first.

## The tests, and what they are for

Four of them exist because of a failure that had already happened and that no other
check could see.

| File | Catches |
| --- | --- |
| `test/docs.test.ts` | a document link pointing at a path that has moved, and struck-through claims counted twice or losing the clause that voids them |
| `test/sources.test.ts` | a file added to `packages/app-core/src/data/` with no entry in the manifest, so sample data reaches a screen and not the inventory |
| `test/routes.test.ts` | a page shadowing a document, which removes it from the site with no error |
| `test/styles.test.ts` | five stylesheets in one global scope meaning different things by the same name |

## Colour

Generated from `packages/design-tokens` by `plugin/tokens.ts`, not written here. A
hand-written copy had three values wrong within the hour, one of them the brand red,
which the dark scheme lightens to `#ff6173` for contrast on a dark ground.

Every page stylesheet is anchored on that page's own root class. They were drawn as
standalone pages and styled `html`, `h1` and `code` directly, which is correct there
and reaches every page here.
