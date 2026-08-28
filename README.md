# CORRECTIV App

The CORRECTIV community in one app: the organisation's investigations, fact checks,
Salon5 radio, CrowdNewsroom callouts, the Faktenforum and the membership club. Built
on *closeness, not a paywall*. Journalism stays free for everyone, and membership adds
proximity.

[**Open the app in a browser**](https://faktenforum.github.io/correctiv-app/preview.html).
No install, no emulator, the same code and the same screens as the Android and iOS
builds, republished on every push to `main`. It opens inside a device frame,
switchable between phone and tablet sizes, because the app is built for a phone and
has no desktop layout. It runs on content bundled into the build, since correctiv.org
sends no CORS header. See [the web target](TROUBLESHOOTING.md#the-web-target).

<p align="center">
  <img src="media/demo.gif" alt="Walkthrough of the CORRECTIV app on Android: live home feed, article reader, media library and the persistent Salon5 live-radio mini player" width="270">
</p>

<p align="center"><sub>The same journey on Android. Every screen:
<a href="screens/">screens/</a></sub></p>

> **Status.** The full journey works end to end: onboarding, home, reader, media,
> participate, club join, backstage, profile. Live content comes from correctiv.org,
> Salon5 and PeerTube, mixed with typed sample data shaped like the API responses that
> will replace it. The real backends (Beabee, Faktenforum GraphQL, payment, SSO) are
> not wired up yet, and joining the club is simulated, which the app says on screen.
> Developed on the Android emulator and in the browser. iOS is maintained in code and
> has not been built. Nothing is on an app store.

## What is in here

One core, one app, and the tokens they are both drawn with.

| | Stack | Targets | Role |
| --- | --- | --- | --- |
| [`packages/app-core`](packages/app-core) | TypeScript, no UI framework | all | The behaviour: model, parsers, services, caches, **all** state |
| [`packages/design-tokens`](packages/design-tokens) | TypeScript, no dependencies | all | The colours, spacing and type scale, generated from the vendored design tokens |
| [`apps/mobile`](apps/mobile) | Expo SDK 56 · React Native 0.85 · expo-router · Uniwind | iOS, Android, **web** | The app |

The core earns its place even with a single app. It imports no UI framework and no
platform SDK, so the feed cascade, the reader, the audio state machine and the
membership logic sit where a change of view layer cannot reach them. That is not
theory here: this repo replaced its entire view layer once and none of that behaviour
moved. A host supplies four small ports and its own screens. See
[ADR 0006](adr/0006-one-core-two-hosts.md).

## Getting started

```bash
npm install         # the whole workspace
npm run check       # typecheck + lint + format + headless tests, ~10 s, no device
```

The web target needs no emulator and no Android SDK.

```bash
npm run web          # browser, Fast Refresh
npm run android      # dev build on emulator or device (once)
npm start            # then: Metro (dev client, NOT Expo Go)
npm run build:web    # static export to apps/mobile/dist/
```

Requirements: Node 20.19 or newer. Android additionally needs JDK 17 and an Android
SDK with `ANDROID_HOME` set. iOS builds via EAS in the cloud, so no Mac is needed, and
has not been built yet.

Before a demo, refresh the bundled offline content. The demo must never depend on
Wi-Fi, and the published web build shows nothing else.

```bash
npm run offline-articles    # ~15 real articles, pre-extracted, with covers
npm run offline-podcasts    # the seven curated Salon5 shows
```

`offline-articles` wants ImageMagick for the covers. Without it it says so and the
lists fall back to remote URLs, which is only visible with no network.

> **Serving the static export yourself?** Use the repo's own server. It maps clean
> URLs (`/artikel` to `artikel.html`) and falls back to `404.html`, both of which
> GitHub Pages does and `python3 -m http.server` does not. Without that, Expo Router
> renders its unmatched-route page and a working app looks broken.
>
> ```bash
> node screens/tools/serve-clean.mjs apps/mobile/dist 8099
> ```

**The device frame linked at the top** works locally too, with presets, rotation, free
resizing and a route field. It ships in the export from `apps/mobile/public/`, so the
same page answers under `npm run web`, under the server above, and on Pages.

```
http://localhost:8081/preview.html          # dev server, Fast Refresh in the frame
http://localhost:8099/preview.html          # a static export
```

Device and route travel in the URL (`preview.html#/artikel?d=ipad-pro-11`), so a
layout finding can be handed over as a link. The frame is the app untouched: inside
it, `useWindowDimensions` and the reader's `48rem` breakpoint see the simulated size.
Dark mode, safe-area insets and touch are not simulated. Those stay DevTools' job.

## Where to go next

| | |
| --- | --- |
| **How it fits together**, and where a given thing lives | [ARCHITECTURE.md](ARCHITECTURE.md) |
| **The traps this toolchain sets**, one row per real incident, and why a green check is not evidence | [TROUBLESHOOTING.md](TROUBLESHOOTING.md) |
| **Why** it is built this way | [`adr/`](adr/README.md) |
| Every screen, and what looking at them found | [`screens/`](screens/) |
| Design tokens, vendored from CORRECTIV's `wp-design-tokens` | [`tokens/`](tokens/README.md) |
| Releases, signing, and the three CI workflows | [RELEASE.md](RELEASE.md) |
| Rules for AI agents working in this repo | [AGENTS.md](AGENTS.md) |

## Licensing and attribution

- **Code:** GNU Affero General Public License v3.0 or later, see [`LICENSE`](LICENSE).
  This covers every workspace, and each `package.json` declares `AGPL-3.0-or-later`.
- **The AGPL is how this repo was started, not a decision CORRECTIV has taken.** It
  was set at the outset and never went to anyone for sign-off. Read it as the working
  assumption it is: the repo stays open source under it, and it holds until CORRECTIV
  decides otherwise. Do not cite it as CORRECTIV's position.
- **`apps/mobile` was scaffolded by `create-expo-app`** and arrived with the Expo
  templates' MIT licence. AGPL applies going forward. The MIT notice is retained as
  attribution for the scaffolded portions in
  [`apps/mobile/NOTICE.md`](apps/mobile/NOTICE.md).
- **Design tokens** in [`tokens/`](tokens/README.md) are vendored from
  [correctiv/wp-design-tokens](https://github.com/correctiv/wp-design-tokens)
  (GPL-2.0-or-later), compatible with AGPL-3.0-or-later.
- **Fonts:** Merriweather and Source Sans 3 (SIL OFL 1.1) and Ionicons (MIT) are
  pulled from npm and redistributed in the build. See
  [`apps/mobile/NOTICE.md`](apps/mobile/NOTICE.md).
- **Sample content and images** are CORRECTIV material.
- Not yet published to any app store, and not affiliated with any store listing.
