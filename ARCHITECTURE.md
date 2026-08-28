# Architecture

One core holds the behaviour. The app holds its screens and one adapter.

```
        ┌────────────────────────────────────────┐
        │           packages/app-core            │
        │                                        │
        │   model · parsers · services · cache   │
        │   articles · feeds · audio · stores    │
        │                                        │
        │   imports NO UI framework,             │
        │   NO platform SDK                      │
        └───────────────────┬────────────────────┘
                       ports│
        ┌───────────────────┴────────────────────┐
        │              apps/mobile               │
        │           Expo / React Native          │
        │           iOS · Android · web          │
        └────────────────────────────────────────┘
```

Why keep the split with only one host? A view layer is the part any framework change
rewrites anyway, and the domain is not. This repo has already replaced its whole view
layer once, and when the old host was removed the feed cascade, the reader, the audio
state machine and the membership logic did not move. That is the split paying for
itself, and the same reason a third host costs one file rather than a rewrite.
[ADR 0006](adr/0006-one-core-two-hosts.md) records how the behaviour got here.
`packages/app-core/test/boundary.test.ts` fails the build if a platform import ever
appears in the core.

## The four ports

Everything the core cannot do on its own is declared in
`packages/app-core/src/ports/index.ts` and supplied at startup with
`configurePlatform(...)`. That file is the whole cost of adding a host.

| Port | What the host answers | How this host answers it |
| --- | --- | --- |
| `KeyValueStore` | small settings, **synchronously** | AsyncStorage behind a mirror hydrated before the first render |
| `BlobStore` | the HTTP cache, asynchronously | AsyncStorage |
| `ContentBundle` | what shipped inside the app | generated TS modules |
| `AudioBackend` | playback, as status ticks | expo-audio's status events |

`KeyValueStore` is synchronous because `persist()` reads it while a store is being
constructed, before anything can await. `BlobStore` is not, because it holds a
megabyte of cached feeds. The adapter's file header explains what the synchronous
version used to cost.

The adapter is `apps/mobile/src/lib/platform/expo.ts`, and it is small on purpose.
While the repo had a second host, one file per host knew the platform SDK, so
dropping a host meant dropping that file plus its screens.

## Three conventions in the core

1. **State is framework-neutral.** `stores/` is one Redux Toolkit store with ten
   slices. `stores/store.ts` explains why the core owns the instance rather than the
   host. The host adds only the reactivity binding, `apps/mobile/src/lib/store/core.ts`
   over react-redux. A second host once bound the state this replaced to Vue's
   `reactive` in about forty lines, which is the measure of what framework-neutral
   bought.
2. **Derived values are exported selectors taking state, never store methods.** In
   React a method is merely awkward. The rule comes from the Vue binding, where a
   method read past the dependency tracking and the template silently stopped
   updating, invisible until a demo.
3. **Subpath imports, no barrel.** `@correctiv/app-core/stores/membership`, not a
   root re-export. The root entry exposes only the ports, because that is the one
   thing every host must touch.

`membership.isMember` is the demo's central lever. Every club touchpoint reads it in
the render path, so never snapshot it into a local ref.

**Why the directory is `packages/app-core` and not `packages/core`:** the original
reason was a build trap in the previous host's bundler, which mistook a directory
called `packages/core` for its own framework source and hijacked the resolution. That
host is gone and the trap with it, but the name stays. It is in every import path in
the repo, and a rename would be churn for nothing.
[ADR 0001](adr/0001-monorepo-and-platform-free-core.md).

## The article path, end to end

The one worth tracing, because it crosses every layer.

```
a tap on a card
  → loadArticle(url)                    articles/load.ts
      1. platform().content.article()    the host's bundle, no network
      2. getCached()                     a fresh extraction from earlier today
      3. fetchText() → extract(html)     the network, then the host's backend
      4. getStale()                      expired beats absent
  → buildReaderHtml(article, { css })   articles/reader-html.ts
  → ReaderView                          WebView on native, iframe on web
```

`buildReaderHtml` owns the document: structure, class names, German copy, the verdict
plaque. The host supplies only the CSS, which here means the token variables and the
fonts base64-embedded in a `<style>`, because the WebView is a browser context of its
own and cannot use the fonts React Native loaded. Dark mode costs one appended
variable block, since `READER_LAYOUT_CSS` takes every colour from `--var-color-*`.
See `apps/mobile/src/lib/articles/reader.ts`.

## Where things are

In the core, `ports/` and `types/` hold the contracts, `articles/` the Article model
and its load cascade, `services/` the HTTP, cache, RSS, search, podcast and PeerTube
clients, `stores/` the Redux slices, `data/` the typed content, `lib/` the
dependency-free string and date helpers, and `media/` the rule that only one medium
plays at a time. `articles/extract/` holds two backends, string and DOM, behind one
`ArticleExtractor` type.

In the app, `src/app/` is expo-router's route tree, `src/components/ui/` the design
system, and `src/lib/` the wiring: `platform/` implements the ports, `audio/` wraps
expo-audio, `feeds/` puts React hooks over the core's feed store, `theme/` re-exports
the tokens with the palette hook. `src/components/reader/` and
`src/components/media/` are the two platform splits, each a `.tsx`, a `.web.tsx` and
a shared props type.

## Generated artefacts

Committed, so a fresh clone builds. Regenerate only when the source changes. A test
regenerates the tokens and byte-compares on every CI run, so forgetting is a failed
PR rather than silent drift.

| Command | Produces |
| --- | --- |
| `npm run tokens` | Tailwind v4 `theme.css` (both colour schemes), typed TS constants, reader CSS |
| `npm run offline-articles` | feed snapshots, pre-extracted articles, inlined covers |
| `npm run offline-podcasts` | per-show Salon5 snapshots |
| `npm run fonts` | base64-subsetted reader fonts (needs `pyftsubset`) |

`npm run offline-articles` additionally needs ImageMagick for the covers. Without it
it says so and writes none, and the app falls back to remote URLs. The collecting
half of that generator lives in `@correctiv/app-core/articles/offline-bundle` rather
than in the script, which is what let a second host bundle the same content in a
completely different file format.

The token generator lives in `packages/design-tokens` so a second consumer, the
CORRECTIV WordPress CMS, can import the same values. Its `theme.css` is plain
Tailwind v4 and needs nothing from this repo to be useful. The app keeps only what is
meaningless outside it, the loaded font family names. It reads `tokens/theme.css`
through `scripts/tokens-source.mjs`, which resolves it by a marker rather than by
counting `../`, because a hard-coded depth broke the bridge when the app moved into
`apps/*`.

## Colour, and the two schemes

Colours reach components as CSS variables, not as hex values. The generator emits
each palette into an `@variant light` / `@variant dark` block in
`packages/design-tokens/theme.css`. Uniwind scans those, registers the names as
Tailwind theme keys, and generates the values under both a `.light`/`.dark` class on
the element or an ancestor and a `prefers-color-scheme` fallback. So `bg-grey-100`
and `border-grey-300` follow the appearance setting **without a single `dark:`
variant in the app**, and neither half can be left waiting on the other.

Two things do not follow it, on purpose.

- **The role colours.** `always-light` and `always-dark` are identical in both
  schemes, for everything sitting on a surface that does not switch either: text on
  the brand red, the label on club yellow, the scrim over a photograph, the video
  stage. The grey scale cannot answer for those, because it is not semantic.
  `grey-100` is both a page surface and white text on a button.
- **Colours read in TypeScript.** An `<Ionicons color>` or a `Switch`'s `trackColor`
  takes a plain string, and a string cannot change with the scheme. Those call
  `useColors()` from `lib/theme`. Importing `colors` directly still works and is
  still right for a role colour.

The dark values live in `packages/design-tokens/palette.js`, hand-written, because
`tokens/theme.css` ships a dark block that is a placeholder holding the light values.
That file explains how each grey was assigned by role. `__tests__/tokens.test.ts`
fails if the role colours ever start following the scheme, or if the dark palette
silently becomes the light one again.

## The web target

`apps/mobile` exports to static HTML, and that export is the published demo, best
opened through the device frame at
<https://faktenforum.github.io/correctiv-app/preview.html>. Same routes, screens and
core as the native builds, with two host-level differences.

- **The two platform splits.** `ReaderView` and `VideoFrame` each have a `.web.tsx`
  sibling, an `<iframe>` where native uses a WebView. `__tests__/web-target.test.ts`
  fails if a component without a web implementation reaches the bundle.
- **No feed is ever live.** A browser blocks every CORRECTIV RSS request, since there
  is no CORS header, so the store's cascade lands on the bundled snapshot. The demo
  is only as current as the last `npm run offline-articles`.

`.github/workflows/pages.yml` rebuilds and publishes it on every push to `main`. It
is worth using while developing, because back-without-history and directly opened
routes can only be tested where URLs exist at all.

## Checks

`npm run check` at the root is the fast inner loop: typecheck, oxlint, oxfmt, tests,
in about ten seconds without a device. It covers the parsers, the German formatters,
every cascade, the platform adapter and the architectural guards.

Linter and formatter are [oxlint](https://oxc.rs) and oxfmt rather than
ESLint/Prettier, so there is no plugin or parser config to maintain. Markdown and
`.github/` are deliberately excluded from formatting, see `.oxfmtrc.json`.

**A green check is not evidence.** Read the first section of
[TROUBLESHOOTING.md](TROUBLESHOOTING.md) before trusting one.
