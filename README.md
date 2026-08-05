# CORRECTIV App — Prototype

A native mobile app **prototype** for the CORRECTIV community: one place for the
organisation's investigations, fact-checks, Salon5 radio, CrowdNewsroom callouts,
the Faktenforum and the membership club — built on the principle of *closeness,
not a paywall* (journalism stays free for everyone; membership adds proximity).

Two app implementations live here while the stack transitions:

| App | Stack | Targets | Role |
| --- | --- | --- | --- |
| [`apps/mobile-rn`](apps/mobile-rn) | **Expo SDK 56 · React Native 0.85 · React 19 · expo-router · NativeWind 4 · Zustand** | iOS, Android, **web** | The app going forward |
| [`apps/mobile`](apps/mobile) | NativeScript 9 · Vue 3 · Vite | iOS, Android | Being replaced — still the most complete UI, kept as the reference to port from |

Both share [`packages/app-core`](packages/app-core), the platform-free core.
See [ADR 0004](adr/0004-react-native-pivot.md) for why the stack changed.

<p align="center">
  <img src="media/demo.gif" alt="Demo walkthrough of the CORRECTIV app prototype on Android: live home feed, article reader, media library and the persistent Salon5 live-radio mini player" width="270">
</p>

<p align="center"><sub>The running Android app. A click-through web version is in the <a href="#design-preview-interactive-mockup">design preview</a> below.</sub></p>

> **Status:** Functional prototype covering the full demo journey (onboarding →
> home → reader → media → participate → club join → backstage → profile).
> Developed and verified on the Android emulator; iOS is maintained in code
> (resources, platform guards) but has not been built or tested. Real backend
> integrations (Beabee, Faktenforum GraphQL, payment, SSO) are intentionally
> **out of scope** — the prototype uses live read-only content plus typed sample
> data shaped like the future API responses, so a later phase swaps only the
> data layer.

The prototype mixes **live content** — correctiv.org WordPress RSS + REST
full-text search, YouTube Atom feeds, Salon5 podcasts (Castopod) and the Salon5
Icecast stream — with **fully interactive simulated flows** (callout submission,
club membership with an app-wide status flip, Backstage) backed by authentic
sample data.

## Design preview (interactive mockup)

👉 **[faktenforum.github.io/correctiv-app](https://faktenforum.github.io/correctiv-app/)**

The original **design draft** ([Claude Design](https://claude.ai/)) as an
HTML/React mockup, hosted via GitHub Pages ([`docs/`](docs/)) — the same demo
journey in any browser, no build. It shows layout and flow but is *not* the
running app; the NativeScript code was aligned to it, with minor differences.

It is **generated**, not authored here: `scripts/deploy-demo.sh` copies it from the
sibling `design-entwurf/project` repo. It stays the design source of truth — and it
is about to stop being the thing at that URL, because `apps/mobile-rn` now produces
a real web build of the actual app ([ADR 0004](adr/0004-react-native-pivot.md)).

## Requirements

- Node ≥ 20.19
- Android SDK + an emulator or device (`ANDROID_HOME` set), JDK 17
- For `apps/mobile` only: NativeScript CLI 9 — `npm i -g nativescript`
- iOS: `apps/mobile-rn` builds via **EAS Build in the cloud, no Mac required**;
  `apps/mobile` would need macOS + Xcode and has never been built

## Getting started

```bash
npm install                    # installs the whole workspace
npm run check                  # every typecheck + 273 headless tests, ~2 s, no device
```

**The app going forward** (`apps/mobile-rn`) — no emulator needed for the web target:

```bash
npm run web        -w @correctiv/mobile-rn   # browser, Fast Refresh
npm run android    -w @correctiv/mobile-rn   # dev build on emulator/device (once)
npm start          -w @correctiv/mobile-rn   # then: Metro (dev client, NOT Expo Go)
npm run build:web  -w @correctiv/mobile-rn   # static export to dist/
```

> Serving the static export yourself? Use **clean URLs** (`/artikel`, not
> `/artikel.html`). A plain `python3 -m http.server` makes Expo Router match nothing
> and render its *unmatched route* page — which looks like an app failure but is a
> server artefact.

**The app being replaced** (`apps/mobile`):

```bash
cd apps/mobile
ns run android --no-hmr        # build, deploy and run on the emulator/device
```

`npm run check` is the fast inner loop — typecheck → lint → format:check → tests, under a
second in total. It covers the feed/article parsers, the German formatters, the cache and
the platform ports without an emulator. Reach for a device only when the change touches
UI, the WebView or audio.

Tooling is [oxlint](https://oxc.rs) + [oxfmt](https://oxc.rs) rather than ESLint/Prettier:
same ecosystem as Vite, no plugin/parser config to maintain, and they understand Vue SFCs.
SCSS, Markdown, `.github/` and `App_Resources/` are deliberately excluded from formatting —
see `.oxfmtrc.json` and the commit that introduced it.

The design tokens are pre-generated and committed
(`apps/mobile/src/styles/tokens.generated.scss`), so the app builds on a fresh
clone with no extra setup. For demos, refresh the bundled offline content first:

```bash
npm run offline-articles       # refresh the offline article bundle (~15 real articles)
npm run offline-podcasts       # refresh the offline Salon5 podcast snapshot
```

Convenience scripts (run from the repo root; they delegate into `apps/mobile`):

```bash
./apps/mobile/scripts/deploy-emulator.sh   # deterministic one-shot deploy (kills zombie
                                           # watchers, verifies the bundle is fresh)
npm run tokens                 # regenerate the NativeScript SCSS from tokens/ (see below)
npm run android                # ns debug android
npm run test:watch             # vitest in watch mode on the core
npm run test                   # all workspaces: 115 core + 7 Vue bindings + 34 Expo
npm run lint                   # oxlint (178 rules, ~240 ms)
npm run lint:fix               # oxlint --fix
npm run format                 # oxfmt
```

### Design tokens

Branding comes from CORRECTIV's
[`wp-design-tokens`](https://github.com/correctiv/wp-design-tokens), **vendored
into [`tokens/`](tokens/README.md)** at a recorded upstream commit. It used to be
a sibling checkout; see `tokens/README.md` for why vendoring beat a submodule and
why an npm dependency is not available (the package wants Tailwind v4, NativeWind
v4 wants v3).

Two generators read `tokens/theme.css`, both resolving it through
`scripts/tokens-source.mjs`:

| Script | Output |
|---|---|
| `apps/mobile/scripts/sync-tokens.mjs` | NativeScript SCSS — rem→dip, letter-spacing→em, platform line-heights under `.ns-android`/`.ns-ios` |
| `apps/mobile-rn/scripts/generate-tokens.mjs` | NativeWind theme map, typed TS constants, and `theme.css` verbatim for the reader WebView |

All outputs are committed, so `npm run tokens` is only needed when the tokens
change — and `apps/mobile-rn/__tests__/tokens.test.ts` regenerates and
byte-compares on **every** CI run, so forgetting it fails the PR. That check used
to skip itself in CI for want of the source; vendoring is what made it
unconditional.

Never import `theme.css` directly into the NativeScript app — its CSS subset
supports neither `rem`, `:root` nor unitless line-heights.

## Architecture in one minute

> Describes **`apps/mobile`** (NativeScript), which is still the most complete
> implementation and therefore the specification for the port. `apps/mobile-rn`
> reaches the same features through expo-router routes, NativeWind and Zustand;
> its own layout is in [`apps/mobile-rn/README.md`](apps/mobile-rn/README.md).

- **Shell:** `apps/mobile/src/AppShell.vue` — a GridLayout with five parallel `<Frame>`s
  (one per tab, lazily mounted, never destroyed → per-tab navigation stacks and
  app-wide reactivity for the membership status flip), a persistent audio
  `MiniPlayer` row, and a custom `TabBar`. Hardware back is handled centrally in
  `apps/mobile/src/app.ts` (back within the active frame → home tab → default).
- **Navigation:** no router. `useNavigation()` wraps `$navigateTo` and always
  passes an explicit frame id (`Frame.topmost()` is ambiguous with five frames).
- **Article reader:** native header + `AWebView`. `apps/mobile/src/services/article.service.ts`
  fetches the article page, extracts content via the dependency-free
  `packages/app-core/src/lib/extract.mjs` (shared with the offline script) and renders
  `apps/mobile/src/assets/reader/template.html` with `reader.css` — a direct derivation of
  the web tokens, so typography matches correctiv.org. `correctiv://join` links
  open the native join flow.
- **Images:** remote thumbnails load through `apps/mobile/src/components/ui/RemoteImage.vue`
  (the JS HTTP stack via `ImageSource.fromUrl`), falling back to a bundled local
  cover and then a styled placeholder tile — never an empty gap.
- **Offline:** the demo must never depend on Wi-Fi. Feeds fall back to bundled
  snapshots (`apps/mobile/src/assets/data/feeds/`), articles to a bundled offline set
  (`apps/mobile/src/assets/data/articles/`, generated by `apps/mobile/scripts/fetch-offline-articles.mjs`),
  and Salon5 podcasts to a bundled snapshot (`apps/mobile/src/assets/data/podcasts/`,
  generated by `apps/mobile/scripts/fetch-offline-podcasts.mjs`).
- **Search & podcasts (live):** `packages/app-core/src/services/search.service.ts` runs full-text
  search over the public correctiv.org WordPress REST API (`/wp-json/wp/v2/posts`);
  `packages/app-core/src/services/podcast.service.ts` + `apps/mobile/src/stores/podcasts.ts` load the Salon5 shows from
  CORRECTIV's Castopod instance (real episodes with MP3 enclosures). Both fall
  back to local data when offline.
- **Audio:** `@nativescript-community/audio` (Android MediaPlayer streams the
  Icecast MP3 directly). `apps/mobile/src/stores/audio.ts` owns all player state including the
  60-second preview gate for club bonus content (invitation, never a lock).
  Known iOS gap: AVAudioPlayer cannot play live streams (needs an AVPlayer wrapper).
- **State:** the core's stores are **framework-neutral** (`zustand/vanilla`), so the
  same state logic drives both apps. Each host adds its own reactivity:
  `apps/mobile/src/stores/core-bindings.ts` (Vue `reactive` mirror) and
  `apps/mobile-rn/src/lib/store/core.ts` (zustand `useStore`). Derived values are
  exported **selectors taking state**, never store methods — a method would read
  past Vue's dependency tracking and templates would silently stop updating
  ([ADR 0004](adr/0004-react-native-pivot.md)).
  Persistence goes through the `KeyValueStore` port
  (`packages/app-core/src/stores/persist.ts`), wired to `ApplicationSettings` in
  `apps/mobile/src/platform/nativescript.ts` and to AsyncStorage/localStorage in
  `apps/mobile-rn/src/lib/platform/expo.ts`. `membership.isMember` is the central
  demo lever — every club touchpoint reads it in the render path; never snapshot
  it into a local ref.

## Repository layout

An npm workspace with three packages — see
[`adr/0001-monorepo-and-platform-free-core.md`](adr/0001-monorepo-and-platform-free-core.md)
and [`adr/0004-react-native-pivot.md`](adr/0004-react-native-pivot.md).

```
packages/app-core/          @correctiv/app-core — NO platform SDK, headless-testable
  src/ports/                KeyValueStore, FileStore — what the core needs from a host
  src/media/                exclusive-playback (only one medium plays at a time)
  src/stores/               membership, interests, savedArticles, settings, media, video,
                            persist — zustand/vanilla + pure selectors, NO UI framework
  src/services/             http, cache, rss, search, podcast, peertube
  src/data/                 feeds.config, callouts, claims, spotlight, … (typed sample data)
  src/lib/                  extract.mjs, rss-parse.mjs, format.ts (dependency-free)
  src/types/  src/ui/       models.ts, icons.ts
  test/                     vitest + real correctiv.org captures, incl. the boundary guard

apps/mobile/                @correctiv/mobile — the NativeScript app
  src/AppShell.vue  app.ts  app.scss
  src/platform/             the ONLY place the core's ports meet the NativeScript SDK
  src/components/           cards, shell, sheets, ui (incl. RemoteImage)
  src/views/                home, discover, media, participate, reader, backstage, profile, modals
  src/stores/               audio, feeds, podcasts (Pinia, NativeScript-coupled)
                            core-bindings.ts — Vue binding for the core's stores
  src/services/             article, audio, image, peertube-offline
  src/lib/                  system-bars.ts
  src/styles/               tokens.generated.scss + typography/components/cards/… (all global)
  src/assets/               reader template, offline data bundle, images, audio
  src/fonts/                Merriweather, Source Sans 3, Lucide (see fonts/LICENSES.md)
  scripts/                  sync-tokens.mjs, fetch-offline-*.mjs, deploy-emulator.sh
  App_Resources/            Android (manifest, icons) and iOS (Info.plist) platform resources

apps/mobile-rn/             @correctiv/mobile-rn — the Expo app (iOS, Android, web)
  src/app/                  expo-router routes: (tabs)/ + artikel, suche, projekt/[id],
                            serie/[id], video, player, aufruf/[slug], formular,
                            faktenforum, behauptung/[id], atlas, einstellungen,
                            gespeichert, bericht, onboarding, beitreten, backstage,
                            tagebuch/[id]
  src/components/reader|media/  the TWO platform splits: ReaderView and VideoFrame
                            (each .tsx | .web.tsx | shared props type)
  src/components/ui/        design system (Typo, Button, Card, Badge, Chip, Screen, …)
  src/components/feed|home|discover|media|player|participate|profile/  per area
  src/lib/audio/            the app's ONE audio player (expo-audio, module-level)
  src/lib/theme/            token-bridge output, typography, fonts
  src/lib/feeds/            transport only: client, useFeed, the offline search corpus
                            (model, catalogue and parsers come from packages/app-core)
  src/lib/articles/         extraction, reader HTML, offline bundle
  src/lib/discover/         projectTarget — what tapping a directory entry means
  src/lib/net/              cachedFetch (network-first / cache-first policies)
  src/lib/store/            Zustand stores (persisted via AsyncStorage)
  __tests__/                jest-expo, incl. the web-target guard
  scripts/                  generate-tokens, embed-fonts, fetch-offline-articles
  app.json  metro.config.js tailwind.config.js  babel.config.js
```

**Why the directory is `packages/app-core` and not `packages/core`:** `@nativescript/vite`
treats `<app>/../../packages/core` as a NativeScript core source checkout and hijacks
`@nativescript/core` with it, breaking the build. Directory and package name are kept in
sync so the trap cannot be re-armed by a "consistency" rename. Details in the ADR.

## Toolchain gotchas (hard-won)

| Problem | Rule |
| --- | --- |
| Vite 8 / Rolldown builds this project but silently drops the NativeScript polyfills (`installPolyfills` 12x -> 0x, `XMLHttpRequest` 25x -> 2x) — every network call then fails on device with `XMLHttpRequest is not defined` while the build stays green | stay on Vite 7. See [ADR 0002](adr/0002-vite-8-rolldown-evaluation.md) for the full measurement, what it fixes, and how to reproduce |
| `@nativescript/vite` hijacks `@nativescript/core` if a `packages/core` dir exists two levels above the app | never name a workspace package directory `core` — ours is `packages/app-core` ([ADR 0001](adr/0001-monorepo-and-platform-free-core.md)) |
| `@nativescript/vite` only auto-applies a file named `app.css` | import `app.scss?inline` + `Application.addCss()` (see `apps/mobile/src/app.ts`) |
| SFC `<style>` blocks are extracted but never applied at runtime | no `<style>` in `.vue` files — everything lives in `apps/mobile/src/styles/` |
| Android `line-height` = extra spacing, iOS = total height | use the `ty-*` classes; values are generated per platform |
| `@tap.stop` compiles to `withModifiers`, which nativescript-vue 3 doesn't export | don't use event modifiers |
| `registerElement` with runtime `require()` crashes under ESM ("viewClass is not a constructor") | static imports only |
| XML feed parsing libraries break the Vite CommonJS resolver | regex-based feed parsing in `packages/app-core/src/lib/rss-parse.mjs` |
| `AbortController` is not a global in the NS runtime | timeouts via `Promise.race` (`packages/app-core/src/services/http.ts`) |
| Nesting CollectionView inside CollectionView cells crashes | horizontal rails use `ScrollView` |
| The native image fetcher silently fails when its external cache dir is missing | load remote images via `RemoteImage` / `ImageSource.fromUrl` |
| `GridLayout` without an explicit `rows="auto"` stretches like `*` inside modal stacks | set `rows="auto"` on in-stack grids |
| Build errors still "successfully sync" the previous bundle | check `bundle.mjs` mtime; use `apps/mobile/scripts/deploy-emulator.sh` |
| `adb shell pm clear` deletes the synced JS bundle | uninstall + fresh deploy afterwards |
| WordPress feeds: only `/category/<slug>/feed/` URLs deliver article streams | see `packages/app-core/src/data/feeds.config.ts` |
| Icecast answers HEAD requests with 400 | availability = try to play |
| **Expo:** `react-native-webview` has no web build — it renders "React Native WebView does not support this platform.", and `expo export --platform web` still succeeds, so CI can go green on a broken route | platform-split behind `components/reader/ReaderView`, enforced by `apps/mobile-rn/__tests__/web-target.test.ts` ([ADR 0004](adr/0004-react-native-pivot.md)) |
| **Expo:** serving a static export without clean URLs makes Expo Router render its *unmatched route* page — looks like an app bug, is a server bug | map `/artikel` → `artikel.html`; plain `python3 -m http.server` will not do |
| **Web target:** `correctiv.org` sends no `Access-Control-Allow-Origin`, so a browser blocks every RSS request — the web demo renders the shell, the sample data and PeerTube content, but **no live articles**. Native is unaffected (no CORS there) | measured 2026-08-05 across every source: only `tube.funfacts.de` sends `*` (so FunFacts videos and their HLS streams do work); `correctiv.org`, `salon5.correctiv.net` (Castopod) and `youtube.com/feeds` all send none. Needs either a response header from CORRECTIV ops or a bundled snapshot as the web fallback — see [ADR 0004](adr/0004-react-native-pivot.md) |
| **Expo:** importing `BottomTabBar` from `expo-router/tabs` to build a custom `tabBar` pulls a second React instance into the bundle — the whole app then dies at startup with minified React error #321 ("invalid hook call"), while build, typecheck and tests all stay green | don't; put anything that has to sit above the tab bar in an absolutely positioned overlay inside `(tabs)/_layout.tsx` (that is what the mini player does). Found only by loading the export in a browser |
| **Expo:** a dynamic route exports as one `[id].html`, so on a static host without rewrites every real URL under it 404s — `/projekt/klima` did, while the build and every test stayed green | export `generateStaticParams()` from the route (see `apps/mobile-rn/src/app/projekt/[id].tsx`); the export then pre-renders one file per id. Native never notices — it has no URLs |
| **Expo:** `disableHierarchicalLookup` (needed so a hoisted package is not also loaded from a local copy) stops Metro from reaching a dependency's OWN nested copy. React Native declares `pretty-format@^29`, npm hoists v30 for jest, and RN's HMR client then reads `prettyFormat.default.default` off `undefined` — the **dev bundle dies at startup** and `npm run web` serves a blank page, while `expo export` (no HMR client) stays fine | resolve that one package from RN's directory in `resolver.resolveRequest`. `resolver.alias` does NOT work here: standard resolution succeeds, so the alias is never consulted |
| **Expo:** autolinking gives a package's native MODULE, but only its **config plugin** edits the native projects — and a plugin has to be listed in `app.json`. `expo-audio` was not, so the generated manifest had no `FOREGROUND_SERVICE_MEDIA_PLAYBACK` and no media service: background playback and lock-screen controls could not work, with everything green | list every package that has a config plugin in `app.json` `plugins`, then read the generated `android/app/src/main/AndroidManifest.xml` and `ios/*/Info.plist` to check what it actually wrote |
| **Expo:** typed routes (`experiments.typedRoutes`) are generated by `expo start`, NOT by `expo export` — and `.expo/` is gitignored. A new route therefore fails `tsc` locally until Metro has run once, while CI (no `.expo/types`) typechecks every href permissively and cannot catch a wrong one at all | after adding a route, start Metro once (`npm start`) before trusting the local typecheck; treat a green CI typecheck as no evidence about hrefs |
| **Expo:** Metro's `getDefaultConfig` assumes a single-project layout, so in this workspace `packages/app-core` is invisible and hoisted deps do not resolve | `watchFolders` + `resolver.nodeModulesPaths` + `disableHierarchicalLookup` in `apps/mobile-rn/metro.config.js` |
| A token bridge that searches **upwards** for its source can find a *foreign* checkout: here one at `17b87c8` while the repo's own copy was `501ee10`, so a developer and CI would generate from different sources and call it agreement | tokens vendored into [`tokens/`](tokens/README.md), resolved to exactly one path by `scripts/tokens-source.mjs`; drift check now unconditional |
| Counting `../` levels to reach a shared file breaks on the next move — a hard-coded depth silently broke both token bridges when the apps moved into `apps/*` | resolve via a marker (root `package.json` name + `workspaces`), not by depth |

## Licensing & attribution

- **Code:** GNU Affero General Public License v3.0 or later — see
  [`LICENSE`](LICENSE). This covers **every** workspace, `apps/mobile-rn`
  included; each `package.json` declares `AGPL-3.0-or-later`.
- **`apps/mobile-rn` was scaffolded by `create-expo-app`**, so it arrived carrying
  the Expo templates' MIT `LICENSE` file. AGPL applies to it going forward
  (CORRECTIV's decision, 2026-08-05); the MIT notice is retained as an
  attribution for the scaffolded portions in
  [`apps/mobile-rn/NOTICE.md`](apps/mobile-rn/NOTICE.md) — which is what MIT
  requires and what a silent deletion would have got wrong.
- **Design tokens** in [`tokens/`](tokens/README.md) are vendored from
  [correctiv/wp-design-tokens](https://github.com/correctiv/wp-design-tokens)
  (GPL-2.0-or-later), which is compatible with AGPL-3.0-or-later. The upstream
  commit is recorded in `tokens/README.md`.
- **Bundled fonts:** Merriweather and Source Sans 3 (SIL OFL 1.1), Lucide (ISC) —
  see [`apps/mobile/src/fonts/LICENSES.md`](apps/mobile/src/fonts/LICENSES.md).
  `apps/mobile-rn` loads the same families via `@expo-google-fonts` (SIL OFL 1.1)
  and Ionicons (MIT) through `@expo/vector-icons`.
- **Sample content & images** (article titles, covers, the demo audio clip) are
  CORRECTIV material, included for prototyping purposes.
- This is a prototype, not a released product, and is not affiliated with any
  app-store listing.
