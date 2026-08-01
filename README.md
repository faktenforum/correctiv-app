# CORRECTIV App — Prototype

A native mobile app **prototype** for the CORRECTIV community: one place for the
organisation's investigations, fact-checks, Salon5 radio, CrowdNewsroom callouts,
the Faktenforum and the membership club — built on the principle of *closeness,
not a paywall* (journalism stays free for everyone; membership adds proximity).

Built with **NativeScript 9 · Vue 3 (nativescript-vue 3) · Vite · TypeScript · Pinia**.

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

## Requirements

- Node ≥ 20.19 (Vite 7)
- NativeScript CLI 9 — `npm i -g nativescript`
- Android SDK + an emulator or device (`ANDROID_HOME` set), JDK 17
- iOS builds additionally require macOS + Xcode (the iOS platform package is not
  installed here; the code paths are kept but unbuilt)

## Getting started

```bash
npm install                    # installs the whole workspace
npm run check                  # both typechecks + 82 headless tests, ~0.4 s, no device

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

The design tokens are pre-generated and committed (`apps/mobile/src/styles/tokens.generated.scss`),
so the app builds without any sibling checkout. For demos, refresh the bundled
offline content first:

```bash
npm run offline-articles       # refresh the offline article bundle (~15 real articles)
npm run offline-podcasts       # refresh the offline Salon5 podcast snapshot
```

Convenience scripts (run from the repo root; they delegate into `apps/mobile`):

```bash
./apps/mobile/scripts/deploy-emulator.sh   # deterministic one-shot deploy (kills zombie
                                           # watchers, verifies the bundle is fresh)
npm run tokens                 # regenerate tokens from a wp-design-tokens checkout (optional, see below)
npm run android                # ns debug android
npm run test:watch             # vitest in watch mode on the core
npm run lint                   # oxlint (178 rules, ~240 ms)
npm run lint:fix               # oxlint --fix
npm run format                 # oxfmt
```

### Design tokens

Branding comes from CORRECTIV's [`wp-design-tokens`](https://github.com/correctiv/wp-design-tokens).
`apps/mobile/scripts/sync-tokens.mjs` converts that repo's `css/theme.css` into
NativeScript-compatible SCSS (rem→dip, letter-spacing→em, platform-specific
line-height under `.ns-android`/`.ns-ios`). The generated file is committed, so
running `npm run tokens` is only needed when the upstream tokens change; it
expects a `wp-design-tokens` checkout next to this repository. Never import
`theme.css` directly — the NativeScript CSS subset does not support `rem`,
`:root` or unitless line-heights.

## Architecture in one minute

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
- **State:** Pinia stores persisted through the `KeyValueStore` port
  (`packages/app-core/src/stores/persist.ts`, wired to `ApplicationSettings` in
  `apps/mobile/src/platform/nativescript.ts`). `membership.isMember` is the central demo lever — every
  club touchpoint reads it reactively in the render path; never snapshot it into
  local refs.

## Repository layout

An npm workspace with two packages — see
[`docs/adr/0001-monorepo-and-platform-free-core.md`](docs/adr/0001-monorepo-and-platform-free-core.md).

```
packages/app-core/          @correctiv/app-core — NO platform SDK, headless-testable
  src/ports/                KeyValueStore, FileStore — what the core needs from a host
  src/media/                exclusive-playback (only one medium plays at a time)
  src/stores/               membership, interests, savedArticles, settings, media, video, persist
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
  src/stores/               audio, feeds, podcasts (all NativeScript-coupled)
  src/services/             article, audio, image, peertube-offline
  src/lib/                  system-bars.ts
  src/styles/               tokens.generated.scss + typography/components/cards/… (all global)
  src/assets/               reader template, offline data bundle, images, audio
  src/fonts/                Merriweather, Source Sans 3, Lucide (see fonts/LICENSES.md)
  scripts/                  sync-tokens.mjs, fetch-offline-*.mjs, deploy-emulator.sh
  App_Resources/            Android (manifest, icons) and iOS (Info.plist) platform resources
```

**Why the directory is `packages/app-core` and not `packages/core`:** `@nativescript/vite`
treats `<app>/../../packages/core` as a NativeScript core source checkout and hijacks
`@nativescript/core` with it, breaking the build. Directory and package name are kept in
sync so the trap cannot be re-armed by a "consistency" rename. Details in the ADR.

## Toolchain gotchas (hard-won)

| Problem | Rule |
| --- | --- |
| Vite 8 / Rolldown builds this project but silently drops the NativeScript polyfills (`installPolyfills` 12x -> 0x, `XMLHttpRequest` 25x -> 2x) — every network call then fails on device with `XMLHttpRequest is not defined` while the build stays green | stay on Vite 7. See [ADR 0002](docs/adr/0002-vite-8-rolldown-evaluation.md) for the full measurement, what it fixes, and how to reproduce |
| `@nativescript/vite` hijacks `@nativescript/core` if a `packages/core` dir exists two levels above the app | never name a workspace package directory `core` — ours is `packages/app-core` ([ADR 0001](docs/adr/0001-monorepo-and-platform-free-core.md)) |
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

## Licensing & attribution

- **Code:** GNU Affero General Public License v3.0 — see [`LICENSE`](LICENSE).
- **Bundled fonts:** Merriweather and Source Sans 3 (SIL OFL 1.1), Lucide (ISC) —
  see [`apps/mobile/src/fonts/LICENSES.md`](apps/mobile/src/fonts/LICENSES.md).
- **Sample content & images** (article titles, covers, the demo audio clip) are
  CORRECTIV material, included for prototyping purposes.
- This is a prototype, not a released product, and is not affiliated with any
  app-store listing.
