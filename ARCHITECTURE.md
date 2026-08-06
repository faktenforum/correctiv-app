# Architecture

One core holds the behaviour. Two app hosts hold their screens and one adapter each.

```
                    ┌──────────────────────────────────────┐
                    │        packages/app-core             │
                    │                                      │
                    │  model · parsers · services · cache  │
                    │  articles · feeds · audio · stores   │
                    │                                      │
                    │  imports NO UI framework,            │
                    │  NO platform SDK                     │
                    └───────┬──────────────────────┬───────┘
                       ports│                 ports│
              ┌─────────────┴────────┐   ┌─────────┴──────────────┐
              │  apps/mobile-rn      │   │  apps/mobile           │
              │  Expo / React Native │   │  NativeScript / Vue    │
              │  iOS · Android · web │   │  iOS · Android         │
              └──────────────────────┘   └────────────────────────┘
```

Why: a view layer is the part any framework change rewrites anyway. The domain is
not, so it lives where both apps — and a future third one — can reach it.
[ADR 0006](adr/0006-one-core-two-hosts.md) has the before/after, and
`packages/app-core/test/boundary.test.ts` fails the build if a platform import ever
appears in the core.

## The four ports

Everything the core cannot do on its own is declared in
`packages/app-core/src/ports/index.ts` and supplied at startup with
`configurePlatform(...)`. That file is the whole cost of adding a host.

| Port | What the host answers | NativeScript | Expo |
| --- | --- | --- | --- |
| `KeyValueStore` | small settings, **synchronously** | `ApplicationSettings` | AsyncStorage behind a mirror hydrated before the first render |
| `BlobStore` | the HTTP cache, asynchronously | `File` under `documents/cache/<ns>/` | AsyncStorage |
| `ContentBundle` | what shipped inside the app | JSON in the app folder | a generated TS module |
| `AudioBackend` | playback, as status ticks | `TNSPlayer` + a 1 s polling timer | expo-audio's status events |

`KeyValueStore` is synchronous because `persist()` reads it while a store is being
constructed, before anything can await. `BlobStore` is not, because it holds a
megabyte of cached feeds — the Expo adapter's file header explains what the
synchronous version used to cost.

Adapters: `apps/mobile/src/platform/nativescript.ts`,
`apps/mobile-rn/src/lib/platform/expo.ts`.

## What lives in the core

```
packages/app-core/src/
  ports/            the four interfaces above, and their in-memory defaults
  types/models.ts   FeedItem, Video, AudioTrack, MediaChannel
  articles/         types (the Article model) · rating · page-meta · reader-html
                    load (bundle → cache → network → stale) · offline-bundle
    extract/        string.ts and dom.ts — two backends, one ArticleExtractor type
  services/         http · cache (two policies) · rss · search · podcast · peertube
  stores/           feeds · audio · podcasts · media · video · membership ·
                    interests · savedArticles · participation · settings ·
                    create-store · persist
  data/             feeds.config · callouts · claims · projects · spotlight · …
  lib/              html (entities, tags, meta) · rss-parse · format (German dates)
  media/            exclusive-playback — only one medium plays at a time
  test/             vitest, incl. the boundary guard and the two-backend agreement
```

Three conventions to know before editing:

1. **Stores are framework-neutral.** `stores/create-store.ts` is a ~40-line
   observable store shaped like zustand's — its file header explains why it is not
   zustand. Each host binds it: `apps/mobile/src/stores/core-bindings.ts` (a Vue
   `reactive` mirror), `apps/mobile-rn/src/lib/store/core.ts` (zustand's `useStore`).
2. **Derived values are exported selectors taking state, never store methods.** A
   method reads past Vue's dependency tracking, and the template then silently stops
   updating — invisible until a demo.
3. **Subpath imports, no barrel.** `@correctiv/app-core/stores/membership`, not a
   root re-export. The root entry exposes only the ports, because that is the one
   thing every host must touch.

`membership.isMember` is the demo's central lever: every club touchpoint reads it in
the render path. Never snapshot it into a local ref.

## The article path, end to end

The one worth tracing, because it crosses every layer:

```
a tap on a card
  → loadArticle(url)                    articles/load.ts
      1. platform().content.article()    the host's bundle — no network
      2. getCached()                     a fresh extraction from earlier today
      3. fetchText() → extract(html)     the network, then the host's backend
      4. getStale()                      expired beats absent
  → buildReaderHtml(article, { css })   articles/reader-html.ts
  → ReaderView                          WebView on native, iframe on web
```

`buildReaderHtml` owns the document — structure, class names, German copy, the
verdict plaque. Each host supplies only the CSS, because the two deliver fonts by
completely different means (bundled `.ttf` behind a `file://` base URL versus base64
in a `<style>`). `apps/mobile/src/assets/reader/reader.css` and the core's
`READER_LAYOUT_CSS` implement the same class vocabulary.

## What lives in each app

```
apps/mobile-rn/            @correctiv/mobile-rn — Expo (iOS, Android, web)
  src/app/                 expo-router routes: (tabs)/ + artikel, suche,
                           projekt/[id], serie/[id], video, player, aufruf/[slug],
                           formular, faktenforum, behauptung/[id], atlas,
                           einstellungen, gespeichert, bericht, onboarding,
                           beitreten, backstage, tagebuch/[id]
  src/components/ui/       design system (Typo, Button, Card, Badge, Chip, Screen…)
  src/components/reader|media/   the TWO platform splits: ReaderView, VideoFrame
                           (each .tsx | .web.tsx | a shared props type)
  src/lib/platform/        the ports
  src/lib/audio/           backend (expo-audio) + thin action and hook wrappers
  src/lib/feeds/           React hooks over the core's feed store, search corpus
  src/lib/articles/        reader CSS wiring, the bundled articles, url rules
  src/lib/theme/           token-bridge output, typography, fonts, pixel sizes
  __tests__/               jest-expo, incl. the web-target and numeric-class guards

apps/mobile/               @correctiv/mobile — NativeScript
  src/AppShell.vue         a GridLayout with five parallel <Frame>s (one per tab,
                           lazily mounted, never destroyed → per-tab nav stacks),
                           a persistent MiniPlayer row and a custom TabBar
  src/platform/            the ports
  src/services/            audio backend, reader CSS wiring, images, peertube-offline
  src/stores/              core-bindings.ts — the Vue binding, and nothing else
  src/views/               home, discover, media, participate, reader, backstage,
                           profile, modals
  src/components/          cards, shell, sheets, ui (incl. RemoteImage)
  src/styles/              tokens.generated.scss + typography/components/cards (global)
  src/assets/              reader stylesheet, the offline data bundle, images, audio
  App_Resources/           Android manifest/icons, iOS Info.plist
```

Two NativeScript specifics worth knowing: there is **no router** (`useNavigation()`
wraps `$navigateTo` and always passes an explicit frame id, because
`Frame.topmost()` is ambiguous with five frames), and **no `<style>` in `.vue`
files** (SFC styles are extracted and never applied — everything lives in
`src/styles/`).

**Why the directory is `packages/app-core` and not `packages/core`:**
`@nativescript/vite` treats `<app>/../../packages/core` as a NativeScript core
source checkout and hijacks `@nativescript/core` with it, breaking the build.
Directory and package name are kept in sync so a "consistency" rename cannot
re-arm the trap. [ADR 0001](adr/0001-monorepo-and-platform-free-core.md).

## Generated artefacts

Committed, so a fresh clone builds. Regenerate only when the source changes — a test
regenerates the tokens and byte-compares on every CI run, so forgetting is a failed
PR, not a silent drift.

| Command | Produces |
| --- | --- |
| `npm run tokens` | NativeWind theme map + typed TS constants + reader CSS (Expo); SCSS with rem→dip and per-platform line heights (NativeScript) |
| `npm run offline-articles` | a generated TS module (Expo); JSON files, feed snapshots and downloaded covers (NativeScript) |
| `npm run offline-podcasts` | per-show Salon5 snapshots (NativeScript) |
| `npm run fonts -w @correctiv/mobile-rn` | base64-subsetted reader fonts (needs `pyftsubset`) |

Both offline generators share their collecting half
(`@correctiv/app-core/articles/offline-bundle`) and differ only in what they write.
The two token generators both read `tokens/theme.css` through
`scripts/tokens-source.mjs`, which resolves it via a marker rather than by counting
`../` — a hard-coded depth broke both bridges when the apps moved into `apps/*`.

Never import `theme.css` directly into the NativeScript app: its CSS subset supports
neither `rem`, `:root` nor unitless line heights.

## Checks

`npm run check` at the root is the fast inner loop: typecheck (three packages) →
oxlint → oxfmt → tests, in about ten seconds without a device. It covers the
parsers, the German formatters, every cascade, the platform adapters and the two
architectural guards.

Linter and formatter are [oxlint](https://oxc.rs) and oxfmt rather than
ESLint/Prettier: same ecosystem as Vite, no plugin or parser config to maintain, and
they understand Vue SFCs. SCSS, Markdown, `.github/` and `App_Resources/` are
deliberately excluded from formatting — see `.oxfmtrc.json`.

**A green check is not evidence.** Read the first section of
[TROUBLESHOOTING.md](TROUBLESHOOTING.md) before trusting one.
