# CORRECTIV App — Prototype

A mobile app prototype for the CORRECTIV community: the organisation's
investigations, fact checks, Salon5 radio, CrowdNewsroom callouts, the Faktenforum
and the membership club in one place — built on *closeness, not a paywall*.
Journalism stays free for everyone; membership adds proximity.

### ▶ [Preview it in a browser — faktenforum.github.io/correctiv-app](https://faktenforum.github.io/correctiv-app/)

A web version of the app, published on every push to `main`: the same code and the
same screens as the Android and iOS builds, so no install and no emulator are needed
to click through it. It runs on content bundled into the app, because correctiv.org
sends no CORS header — see [the web target](TROUBLESHOOTING.md#the-web-target).

<p align="center">
  <img src="media/demo.gif" alt="Walkthrough of the CORRECTIV app prototype on Android: live home feed, article reader, media library and the persistent Salon5 live-radio mini player" width="270">
</p>

<p align="center"><sub>The same journey on Android. Every screen in every version:
<a href="screens/">screens/</a></sub></p>

> **Status —** functional prototype covering the full demo journey: onboarding →
> home → reader → media → participate → club join → backstage → profile. Live
> content from correctiv.org, Salon5 and PeerTube, mixed with typed sample data
> shaped like the future API responses. Real backend integrations (Beabee,
> Faktenforum GraphQL, payment, SSO) are deliberately out of scope, so a later
> phase swaps only the data layer. Developed on the Android emulator and in the
> browser; iOS is maintained in code but has not been built.

## What is in here

One core, two app hosts.

| | Stack | Targets | Role |
| --- | --- | --- | --- |
| [`packages/app-core`](packages/app-core) | TypeScript, no UI framework | all | The behaviour: model, parsers, services, caches, **all** state |
| [`apps/mobile-rn`](apps/mobile-rn) | Expo SDK 56 · React Native 0.85 · expo-router · NativeWind | iOS, Android, **web** | The app going forward |
| [`apps/mobile`](apps/mobile) | NativeScript 9 · Vue 3 · Vite | iOS, Android | Being replaced — still the more complete UI, and the reference to port from |

The core is the point: it imports no UI framework and no platform SDK, so the same
feed cascade, reader, audio state machine and membership logic drive both apps.
A host supplies four small ports and its own screens.
See [ADR 0006](adr/0006-one-core-two-hosts.md).

## Getting started

```bash
npm install         # the whole workspace
npm run check       # typecheck + lint + format + 357 headless tests, ~10 s, no device
```

**The app going forward** — the web target needs no emulator and no Android SDK:

```bash
npm run web          # browser, Fast Refresh
npm run android      # dev build on emulator/device (once)
npm start            # then: Metro (dev client, NOT Expo Go)
npm run build:web    # static export to apps/mobile-rn/dist/
```

**The NativeScript app** — needs the Android SDK and the NativeScript CLI
(`npm i -g nativescript`):

```bash
npm run ns:android   # build, deploy and run on the emulator/device
```

Requirements: Node ≥ 20.19. For Android additionally JDK 17 and an Android SDK with
`ANDROID_HOME` set. For iOS, `apps/mobile-rn` builds via **EAS in the cloud, no Mac
needed**; `apps/mobile` would need macOS + Xcode and has never been built.

Before a demo, refresh the bundled offline content — the demo must never depend on
Wi-Fi, and the published web build shows nothing else:

```bash
npm run offline-articles    # both apps: ~15 real articles, pre-extracted
npm run offline-podcasts    # Salon5 podcast snapshots
```

> **Serving the static export yourself?** Use the repo's own server — it maps clean
> URLs (`/artikel` → `artikel.html`) and falls back to `404.html`, both of which
> GitHub Pages does and `python3 -m http.server` does not. Without that, Expo Router
> renders its *unmatched route* page and a working app looks broken:
>
> ```bash
> node screens/tools/serve-clean.mjs apps/mobile-rn/dist 8099
> ```

**Judging a layout at phone or tablet size** — `/preview.html` puts the app in an
iframe sized to a device, with presets, rotation, free resizing and a route field.
It ships in the export from `apps/mobile-rn/public/`, so the same page answers under
`npm run web`, under the server above, and on Pages:

```
http://localhost:8081/preview.html          # dev server, Fast Refresh in the frame
http://localhost:8099/preview.html          # a static export
```

Device and route travel in the URL — `preview.html#/artikel?d=ipad-pro-11` — so a
layout finding can be handed over as a link. The frame is the app untouched: inside
it, `useWindowDimensions` and the reader's `48rem` breakpoint see the simulated size.
Dark mode, safe-area insets and touch are *not* simulated; those stay DevTools' job.

## Where to go next

| | |
| --- | --- |
| **How it fits together**, and where a given thing lives | [ARCHITECTURE.md](ARCHITECTURE.md) |
| **The traps this toolchain sets** — one row per real incident, and why a green check is not evidence | [TROUBLESHOOTING.md](TROUBLESHOOTING.md) |
| **Why** it is built this way — the six decisions | [`adr/`](adr/README.md) |
| Every screen in all three versions, side by side | [`screens/`](screens/) |
| Design tokens, vendored from CORRECTIV's `wp-design-tokens` | [`tokens/`](tokens/README.md) |
| Releases, signing, and the three CI workflows | [RELEASE.md](RELEASE.md) |
| Rules for AI agents working in this repo | [AGENTS.md](AGENTS.md) |

## Licensing & attribution

- **Code:** GNU Affero General Public License v3.0 or later — see [`LICENSE`](LICENSE).
  This covers every workspace; each `package.json` declares `AGPL-3.0-or-later`.
- **`apps/mobile-rn` was scaffolded by `create-expo-app`** and arrived with the Expo
  templates' MIT licence. AGPL applies going forward (CORRECTIV's decision,
  2026-08-05); the MIT notice is retained as attribution for the scaffolded portions
  in [`apps/mobile-rn/NOTICE.md`](apps/mobile-rn/NOTICE.md).
- **Design tokens** in [`tokens/`](tokens/README.md) are vendored from
  [correctiv/wp-design-tokens](https://github.com/correctiv/wp-design-tokens)
  (GPL-2.0-or-later), compatible with AGPL-3.0-or-later.
- **Fonts:** Merriweather and Source Sans 3 (SIL OFL 1.1), Lucide (ISC), Ionicons
  (MIT) — see [`apps/mobile/src/fonts/LICENSES.md`](apps/mobile/src/fonts/LICENSES.md).
- **Sample content and images** are CORRECTIV material, included for prototyping.
- This is a prototype, not a released product, and is not affiliated with any
  app-store listing.
