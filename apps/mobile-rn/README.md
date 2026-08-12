# @correctiv/mobile-rn — the Expo app

The CORRECTIV app on Expo / React Native: **iOS, Android and a web target**
([ADR 0004](../../adr/0004-react-native-pivot.md),
[ADR 0005](../../adr/0005-react-native-over-nativescript.md)). Its behaviour comes
from [`@correctiv/app-core`](../../packages/app-core); what lives here is the view
layer plus one adapter ([ADR 0006](../../adr/0006-one-core-two-hosts.md)).

## Stack

- **Expo SDK 56** (React Native 0.85, New Architecture), TypeScript,
  **expo-router** (tabs + stack), **NativeWind 4**
- **zustand** binds the core's stores; **AsyncStorage** backs the core's two storage
  ports (and works unchanged on web, where it is localStorage)
- **expo-audio** behind the core's `AudioBackend` port. Not
  react-native-track-player: it needs a Kotlin patch to compile under RN 0.85 and
  then crashes at runtime under the New Architecture, and RN 0.85 offers no
  old-architecture option. expo-audio brings background playback, lock-screen
  controls and a web implementation.
- **react-native-webview** for the article reader, **iframe** on web. Both sit behind
  `components/reader/ReaderView`, guarded by `__tests__/web-target.test.ts`.
- **htmlparser2 + css-select + domutils** — this app uses the core's DOM extraction
  backend, registered in `app/_layout.tsx`

## Development

`npm install` runs at the **repo root** (npm workspace), not here.

```bash
npm run web            # browser with Fast Refresh — no emulator, no Android SDK
npm run android        # build a dev build and install it (once)
npm start              # then: Metro with Fast Refresh (dev client, NOT Expo Go)
npm run build:web      # static export to dist/
```

Expo Go does **not** work (native modules). Always a dev build or a release APK.

iOS builds via **EAS in the cloud, no Mac**. `ios/` does not exist yet and is
produced by `expo prebuild`.

### The static export

`dist/` is what gets published to <https://faktenforum.github.io/correctiv-app/> on
every push to `main` (`.github/workflows/pages.yml`). Serve it with the repo's own
server, never a plain one:

```bash
node ../../screens/tools/serve-clean.mjs dist 8099
```

It maps clean URLs (`/artikel`, not `/artikel.html`) and serves `404.html` on a
miss, both of which GitHub Pages does. Without that, Expo Router matches nothing and
shows its "unmatched route" page — which looks like an app bug and is the server.

To reproduce the published site exactly, add the base path. `app.config.js` turns
`EXPO_BASE_URL` into `experiments.baseUrl`; without it every asset URL is absolute
from the domain root, which is correct locally and blank on a project Pages site:

```bash
EXPO_BASE_URL=/correctiv-app npm run build:web
node ../../screens/tools/serve-clean.mjs dist 8099 --base=/correctiv-app
```

See [TROUBLESHOOTING.md](../../TROUBLESHOOTING.md#the-web-target).

### Release APK (demo device)

```bash
cd android && ./gradlew assembleRelease                          # all ABIs
./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a   # a real device
adb install -r app/build/outputs/apk/release/app-release.apk
```

Self-contained (JS bundled, no Metro). Gradle signs it with a per-machine debug key,
which is fine locally; the release workflow re-signs with a stable key so testers can
update in place — see [`signing/README.md`](signing/README.md) and
[RELEASE.md](../../RELEASE.md).

## Layout

```
src/app/                 expo-router routes: (tabs)/ + artikel, suche, spotlight,
                         projekt/[id], serie/[id], video, player, aufruf/[slug],
                         formular, faktenforum, behauptung/[id], atlas,
                         einstellungen, gespeichert, bericht, onboarding, beitreten,
                         backstage, tagebuch/[id], +not-found
app.config.js            app.json plus the one value that cannot be static: the
                         Pages base path, from EXPO_BASE_URL
src/components/ui/       the design system (Typo, Button, Card, Badge, Chip, Screen…)
src/components/          feed | home | discover | media | player | participate |
                         profile — one folder per area
src/components/reader|media/   the two platform splits (.tsx | .web.tsx | props type)
src/lib/platform/expo.ts the core's ports: storage and the bundled content
src/lib/audio/           backend.ts (expo-audio → the core's port), plus thin action
                         and hook wrappers over the core's audio store
src/lib/feeds/           React hooks over the core's feed store, and the search corpus
src/lib/articles/        reader CSS wiring, the bundled articles and covers,
                         in-app URL rules
src/lib/podcasts/        the bundled show snapshots
src/lib/store/core.ts    React bindings for the core's stores
src/lib/theme/           token-bridge output, useColors(), typography, fonts, sizes
palette.js               the dark values and the two fixed role colours, hand-written
signing/                 the committed throwaway test key (see its README)
scripts/                 generators (tokens, fonts, offline articles and podcasts)
__tests__/               jest-expo against real captured feeds and pages
```

## Colour and dark mode

`bg-grey-100` and friends resolve through CSS variables that `.dark:root` redefines,
so surfaces and borders follow the app's appearance setting with **no `dark:` variant
anywhere in this app**. Two exceptions, both deliberate:

- `always-light` and `always-dark` never switch — they are for anything sitting on a
  surface that does not switch either: the brand red, club yellow, a photograph, the
  video stage.
- A colour read in TypeScript (an icon, a `Switch`, a computed style) is a plain
  string and cannot follow the scheme. Use `useColors()` from `lib/theme`.

The setting itself is the authority, not the device: 'system' delegates to the OS,
'light' and 'dark' override it (`lib/theme/appearance.ts`). That file resolves
'system' to a concrete scheme rather than passing it on — the one rule the colour
system cannot survive without, and there is a test for it. The dark values
are hand-written in `palette.js`, because the design tokens' dark block is still a
placeholder.

## Generated, never hand-edited

| Command | Produces |
| --- | --- |
| `npm run tokens` | `tailwind.tokens.generated.js`, `src/lib/theme/tokens.generated.ts`, `readerCss.generated.ts` |
| `npm run fonts` | `src/lib/theme/readerFonts.generated.ts` — base64-subsetted reader fonts (needs `pyftsubset`) |
| `npm run offline-articles` | `src/lib/articles/offlineBundle.generated.ts` — a snapshot of every content feed plus ~15 pre-extracted articles, and `offlineCovers.generated.ts`, their covers inlined as data URIs (needs ImageMagick). On web the snapshots are the *only* articles there are: correctiv.org sends no CORS header |
| `npm run offline-podcasts` | `src/lib/podcasts/offlineBundle.generated.ts` — the seven curated Salon5 shows. Without it the Mediathek falls back to the core's four-show sample seed, which is what a browser always gets otherwise: Castopod sends no CORS header either |

## Checks

```bash
npm test           # jest: token snapshot, cascades, guards
npm run typecheck  # tsc (app) + tsc (tests)
```

Lint and format run from the **repo root** with oxlint/oxfmt (`npm run check` covers
every workspace). Two guards worth knowing about:
`__tests__/web-target.test.ts` (nothing web-incompatible outside a `.web.tsx` split)
and `__tests__/no-numeric-utilities.test.ts` (no numeric NativeWind size or spacing
class — the scale is the design system's, so `w-32` does not mean 32 px; see
TROUBLESHOOTING.md).

## Status

Every tab is real; no stubs. Onboarding, home, reader, discover/search, media
(live radio, seven Castopod series, PeerTube HLS, YouTube embeds, mini and full
player; club bonus content plays in full for everyone), participate (three
CrowdNewsroom callouts with a multi-step form, Faktenforum, Abriss-Atlas), club and
profile (join flow with the app-wide status flip, Backstage, quarterly report, saved
articles, settings).

Verified in the browser: home with full content and all five tabs, the reader with a
real article in an iframe, discover with all 17 entries, every project page under its
own URL, media with real FunFacts videos, and the participate flow into step 1 of the
form. Playback itself is verified on a device, not in the browser.

Sharing an article uses the system share sheet natively and the Web Share API in a
browser, falling back to the clipboard where that is missing.
