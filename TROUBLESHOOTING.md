# Troubleshooting

Every entry here is an incident that actually happened in this repo, with what it
looked like and what to do instead. They are grouped by where they bite.

## A green build is not evidence

Five defects reached a branch past a green build, typecheck and test run: a webview
that does not exist on web, a dev bundle that died before rendering, a 404 on every
dynamic route, a startup crash from a duplicated React, an empty article list. Each
was found by opening the app in a browser. None by CI.

So after touching a route, a bundle-level config or anything platform-split:

```bash
npm run build:web
# then serve apps/mobile-rn/dist/ WITH clean-URL mapping (/artikel → artikel.html)
```

Extracting text is the weak version of this. `uiautomator dump` and
`document.body.innerText` prove the right words are on screen and nothing about how
it looks — nine further defects hid behind exactly that, among them a video card
grown into a full-screen black rectangle. So after touching layout, **take a
screenshot and look at it**. `screens/tools/tour-android.sh` walks a build on the
emulator; [`screens/README.md`](screens/) holds the three versions side by side and
what the last comparison found.

And it is worse than weak for anything that *changes*: **`uiautomator dump` returns a
stale tree.** A React Native text node that ticks — a player position, a countdown —
keeps reporting its old value until something else invalidates the accessibility tree.
Watching a mini player's `0:00 / 1:37` this way produced three wrong conclusions in a
row: "playback never started", "the app is frozen", "the refactor broke audio". The
audio had been playing the whole time. → To observe a changing value, ask the system
that owns it, not the UI tree. For audio that is
`adb shell dumpsys audio | grep "u/pid:<uid>"`, which reports `state:started` /
`state:stopped` per player. `adb shell dumpsys window`, `pidof` and logcat are the
equivalents for focus, liveness and errors.

## Expo / React Native

- **`react-native-webview` has no web build.** It renders "React Native WebView does
  not support this platform.", and `expo export --platform web` still succeeds — so
  CI goes green on a broken route. → Platform-split behind
  `components/reader/ReaderView`, enforced by `__tests__/web-target.test.ts`.
- **A dynamic route exports as one `[id].html`,** so on a static host without
  rewrites every real URL under it 404s. `/projekt/klima` did, while the build and
  every test stayed green. → Export `generateStaticParams()` from the route; the
  export then pre-renders one file per id. Native never notices — it has no URLs.
- **Importing `BottomTabBar` from `expo-router/tabs`** to build a custom `tabBar`
  pulls a second React instance into the bundle. The whole app then dies at startup
  with minified React error #321 ("invalid hook call") while build, typecheck and
  tests all stay green. → Don't. Put anything that has to sit above the tab bar in an
  absolutely positioned overlay inside `(tabs)/_layout.tsx` — that is what the mini
  player does. Found only by loading the export in a browser.
- **`react` must match the renderer React Native bakes in *exactly*.** RN 0.85.3
  ships `react-native-renderer@19.2.3` and refuses 19.2.7, while its own peer range
  says `^19.2.3` and accepts it. The app dies on launch on device; web, jest and
  typecheck all pass. → Pin `react`/`react-dom` in the **workspace root**. An
  app-level pin loses to `react-dom`'s own `react ^19.2.7`, and npm 11 silently
  ignores `overrides` here.
- **`disableHierarchicalLookup`** (needed so a hoisted package is not also loaded
  from a local copy) stops Metro from reaching a dependency's *own* nested copy. RN
  declares `pretty-format@^29`, npm hoists v30 for jest, and RN's HMR client then
  reads `prettyFormat.default.default` off `undefined` — the **dev bundle dies at
  startup** and `npm run web` serves a blank page, while `expo export` (no HMR
  client) stays fine. → Resolve that one package from RN's directory in
  `resolver.resolveRequest`. `resolver.alias` does **not** work: standard resolution
  succeeds, so the alias is never consulted.
- **Metro's `getDefaultConfig` assumes a single-project layout,** so in this
  workspace `packages/app-core` is invisible and hoisted deps do not resolve. →
  `watchFolders` + `resolver.nodeModulesPaths` + `disableHierarchicalLookup` in
  `apps/mobile-rn/metro.config.js`.
- **Autolinking gives a package's native module, but only its config plugin edits the
  native projects** — and a plugin has to be listed in `app.json`. `expo-audio` was
  not, so the generated manifest had no `FOREGROUND_SERVICE_MEDIA_PLAYBACK` and no
  media service: background playback and lock-screen controls could not work, with
  everything green. → List every package that has a config plugin in `app.json`
  `plugins`, then **read** the generated `android/app/src/main/AndroidManifest.xml`
  and `ios/*/Info.plist` to check what it actually wrote.
- **Typed routes are generated by `expo start`, not by `expo export`** — and
  `.expo/` is gitignored. A new route therefore fails `tsc` locally until Metro has
  run once, while CI (no `.expo/types`) typechecks every href permissively and cannot
  catch a wrong one at all. → After adding a route, start Metro once before trusting
  the local typecheck; treat a green CI typecheck as no evidence about hrefs.
- **A YouTube embed loaded as a WebView's top-level document sends no referrer,** and
  YouTube answers **Error 153, "Video player configuration error"** — a black frame
  with an error line, no exception, nothing in the logs. The same URL fails
  identically in a plain browser tab, so it is not a WebView quirk. → Put the embed
  in an `<iframe>` inside a minimal page and give the WebView
  `source={{ html, baseUrl: 'https://correctiv.org' }}`; the iframe request then
  carries a referrer. The web target never had this — there the embed always was an
  iframe in a real page.
- **Bottom tabs default to `animation: 'none'`,** so a tab switch replaces the screen
  with no transition at all. On five sibling tabs that reads as a redraw, and it is
  easy to mistake for "React Navigation just looks like this". → Set
  `animation: 'shift'` (or `'fade'`) in the `Tabs` `screenOptions`. The option lives
  on the vendored `expo-router/build/react-navigation/bottom-tabs`, not on a
  `@react-navigation` package — SDK 56 has none installed.
- **expo-image gives a failed thumbnail its own broken-image glyph on a black
  field,** which reads as an app defect. On this project failing thumbnails are
  routine (see the TLS chain entry below). → Wrap remote previews in
  `components/ui/Thumbnail`, which degrades to an empty frame.

## Shared code, two hosts

- **A port needs a re-entrancy rule, or each host invents one.** The core's audio
  state machine calls `AudioBackend.pause()` when it stops a track. The NativeScript
  backend emitted a status tick from inside `pause()`, so the store re-entered its own
  handler, decided the same thing again and called `pause()` again — `RangeError:
  Maximum call stack size exceeded`, on a device, a minute into an episode.
  expo-audio does not re-enter, so every test stayed green. Found by playing a bonus
  episode on the emulator and waiting. → Three things, and the order matters: a
  command must never call the status listener synchronously (stated on
  `AudioBackend` in `ports/index.ts`); the store sets state **before** issuing a
  command; and the guard that makes an error state sticky sits **first** in the
  handler, so the error path cannot recurse either. `test/audio-store.test.ts` drives
  the store through a deliberately re-entrant fake — a polite test double would have
  missed this too, and the second recursion was only found because that fake exists.

## The web target

- **Serving a static export without clean URLs** makes Expo Router render its
  *unmatched route* page — looks like an app bug, is a server bug. → Map `/artikel` →
  `artikel.html`. A plain `python3 -m http.server` will not do.
- **`correctiv.org` sends no `Access-Control-Allow-Origin`,** so a browser blocks
  every RSS request and **no feed is ever live on web**. Native is unaffected — there
  is no CORS there. Measured 2026-08-05 across every source: only `tube.funfacts.de`
  sends `*` (so FunFacts videos and their HLS streams do work); `correctiv.org`,
  `salon5.correctiv.net` and `youtube.com/feeds` send none. → The Expo host now
  bundles a snapshot of every content feed (`npm run offline-articles`), so the
  store's cascade lands on it and the web demo has articles without waiting on a
  response header from CORRECTIV ops. It says so on screen: "Ohne Verbindung — Sie
  sehen gespeicherte Artikel."
  - So the web demo's articles are **as old as the last generator run**, and no
    amount of reloading changes that. Re-run it before showing the browser build.
  - Article images survive because an `<img>` is not subject to CORS and the
    bundled articles carry their real cover URLs. Feed items the generator did not
    extract have no image, because finding one needs a request the browser blocks.

## Android builds and the emulator

- **Gradle's JS bundle task does not treat `node_modules` as an input,** so after a
  dependency change it reuses the previous bundle and the APK ships stale JS — the
  same crash keeps appearing after the fix. → Delete
  `android/app/build/generated/assets/react` (and `intermediates/assets`) before
  rebuilding.
- **On Fedora the AVD dies with SIGSEGV before boot.** SwiftShader JITs shaders onto
  the heap and SELinux denies `execheap` (`AVC denied { execheap }
  comm="RenderThread"`). `-gpu off` does not help — that only affects the *guest*
  GPU; the emulator loads SwiftShader for its own display regardless. → Start it
  **with a window**: real Mesa renders, SwiftShader is never loaded, boots in ten
  seconds. Headless would need `setsebool -P selinuxuser_execheap 1`, i.e. relaxing
  a hardening default.
- **`adb shell pm clear` deletes the synced JS bundle** (NativeScript). → Uninstall
  and deploy fresh afterwards.

## Design tokens and styling

- **NativeWind: `tailwind.config.js` replaces Tailwind's spacing scale with the
  design system's,** which steps 2 px per unit and stops at 48. Every numeric utility
  then means something else than it says — `w-10` is 20 px, `w-32` is 64 px — and
  anything above 48 does not exist, so NativeWind drops it in silence and the element
  sizes to its content. `w-64` on a rail card turned into a full-screen black
  rectangle, because `aspectRatio` scaled the height off the title's width. Build,
  typecheck and 120 tests stayed green. → Named tokens for spacing (`p-s`, `gap-m`),
  pixel sizes from `src/lib/theme/sizes.ts`, and
  `__tests__/no-numeric-utilities.test.ts` fails on any numeric size or spacing class.
  Found by putting emulator screenshots next to the draft — see [`screens/`](screens/).
- **A token bridge that searches *upwards* for its source can find a foreign
  checkout** — here one at `17b87c8` while the repo's own copy was `501ee10`, so a
  developer and CI generated from different sources and called it agreement. →
  Tokens are vendored into [`tokens/`](tokens/README.md) and resolved to exactly one
  path by `scripts/tokens-source.mjs`; the drift check is unconditional.
- **Counting `../` levels to reach a shared file breaks on the next move.** A
  hard-coded depth silently broke both token bridges when the apps moved into
  `apps/*`. → Resolve via a marker (root `package.json` name + `workspaces`), not by
  depth.

## Data sources

- **WordPress feeds: only `/category/<slug>/feed/` URLs deliver article streams.**
  `correctiv.org/faktencheck/feed/` returns the landing page as a single item. → See
  `packages/app-core/src/data/feeds.config.ts`; a test guards the one feed that is
  legitimately empty upstream.
- **Icecast answers HEAD requests with 400,** so availability cannot be probed. →
  Availability means: try to play.
- **Ops, and it affects real clients:** `icecast.correctiv.net`,
  `salon5.correctiv.net` and `tube.funfacts.de` serve Let's Encrypt's new **YR**
  chain (ISRG Root YR, cross-signed May 2026). Clients with an older trust store fail
  the TLS handshake — radio and podcasts are unreachable while `correctiv.org`
  (Sectigo) works. Measured on an Android 16 emulator image, 2026-08-05. → Not an app
  defect. Let's Encrypt can serve the alternate chain terminating at ISRG Root X1.

## NativeScript

Still live rules for `apps/mobile`:

- **Stay on Vite 7.** Vite 8 / Rolldown builds this project but silently drops the
  NativeScript polyfills (`installPolyfills` 12× → 0×, `XMLHttpRequest` 25× → 2×).
  Every network call then fails on device with `XMLHttpRequest is not defined` while
  the build stays green. → [ADR 0002](adr/0002-vite-8-rolldown-evaluation.md) has the
  full measurement and how to reproduce it.
- **Never name a workspace package directory `core`.** `@nativescript/vite` hijacks
  `@nativescript/core` if a `packages/core` exists two levels above the app. Ours is
  `packages/app-core` — [ADR 0001](adr/0001-monorepo-and-platform-free-core.md).
- **`@nativescript/vite` only auto-applies a file named `app.css`.** → Import
  `app.scss?inline` and call `Application.addCss()` (see `src/app.ts`).
- **SFC `<style>` blocks are extracted but never applied at runtime.** → No `<style>`
  in `.vue` files; everything lives in `src/styles/`.
- **Android `line-height` means extra spacing, iOS means total height.** → Use the
  `ty-*` classes; values are generated per platform.
- **`@tap.stop` compiles to `withModifiers`,** which nativescript-vue 3 does not
  export. → No event modifiers.
- **`registerElement` with a runtime `require()` crashes under ESM** ("viewClass is
  not a constructor"). → Static imports only.
- **`AbortController` is not a global in the NativeScript runtime.** → The core's
  `services/http.ts` feature-detects it and falls back to `Promise.race`.
- **XML parsing libraries break the Vite CommonJS resolver.** → Regex-based feed
  parsing in `packages/app-core/src/lib/rss-parse.ts`, and the string extraction
  backend in `articles/extract/string.ts`. A test asserts the DOM backend's parser
  never reaches this bundle.
- **Nesting a CollectionView inside CollectionView cells crashes.** → Horizontal
  rails use `ScrollView`.
- **The native image fetcher silently fails when its external cache dir is
  missing.** → Load remote images through `RemoteImage` / `ImageSource.fromUrl`;
  `src/app.ts` creates the directory at launch.
- **`GridLayout` without an explicit `rows="auto"` stretches like `*`** inside modal
  stacks. → Set `rows="auto"` on in-stack grids.
- **A failed build still "successfully syncs" the previous bundle.** → Check
  `bundle.mjs` mtime, or use `apps/mobile/scripts/deploy-emulator.sh`, which kills
  zombie watchers and verifies freshness.
- **A minified release bundle crashes on launch** ("Module evaluation promise
  rejected: bundle.mjs") while the unminified one runs. `keepNames` alone did not
  help, so it is not only name mangling. → `build.minify: false` in
  `apps/mobile/vite.config.ts`. Negligible inside a ~100 MB APK.
