# @correctiv/mobile — the NativeScript app

The CORRECTIV app on NativeScript 9 + Vue 3 + Vite (iOS, Android). Being replaced by
[`../mobile-rn`](../mobile-rn), which has a web target and builds for iOS without a
Mac — see [ADR 0004](../../adr/0004-react-native-pivot.md) and
[ADR 0005](../../adr/0005-react-native-over-nativescript.md).

It stays for now, and it is not a museum piece: it is still the **more complete UI**
(43 finished SFCs) and therefore the reference the Expo app is ported from
([ADR 0006](../../adr/0006-one-core-two-hosts.md)). Both apps share
[`@correctiv/app-core`](../../packages/app-core), so a fix to the behaviour lands in
both at once. Only the screens are separate.

## Development

`npm install` runs at the **repo root**. Then, from the root:

```bash
npm run ns:android        # build, deploy and run on the emulator/device
npm run ns:dev:android    # Vite dev server + HMR
npm run ns:build:android  # signed release APK (test keystore)
```

Or from here with the NativeScript CLI (`npm i -g nativescript`):

```bash
ns run android --no-hmr
```

Deterministic one-shot deploy, which kills zombie watchers and verifies the bundle is
actually fresh — a failed build otherwise "successfully syncs" the previous one:

```bash
./scripts/deploy-emulator.sh
```

iOS would need macOS + Xcode and has never been built. Resources and platform guards
are maintained in code.

## Layout

```
src/AppShell.vue      a GridLayout with five parallel <Frame>s — one per tab, lazily
                      mounted and never destroyed, which is what gives per-tab
                      navigation stacks and app-wide reactivity for the membership
                      flip — plus a persistent MiniPlayer row and a custom TabBar
src/app.ts            entry point: the ports, global CSS, element registration,
                      persistence, exclusive playback, central hardware-back handling
src/platform/         the core's four ports against the NativeScript SDK
src/services/         audio.service.ts (TNSPlayer → the core's AudioBackend),
                      reader.ts (reader CSS wiring), image, peertube-offline
src/stores/           core-bindings.ts — the Vue binding for the core's stores.
                      Nothing else: this app has no stores of its own any more
src/views/            home, discover, media, participate, reader, backstage, profile,
                      modals
src/components/       cards, shell, sheets, ui (incl. RemoteImage)
src/composables/      useNavigation, useTheme, useJoinFlow
src/styles/           tokens.generated.scss + typography/components/cards — all global
src/assets/           the reader stylesheet, the offline data bundle, images, audio
src/fonts/            Merriweather, Source Sans 3, Lucide (see fonts/LICENSES.md)
App_Resources/        Android manifest and icons, iOS Info.plist
```

## Four rules this platform enforces

1. **No `<style>` in `.vue` files.** SFC style blocks are extracted and never applied
   at runtime. Everything lives in `src/styles/`.
2. **No router.** `useNavigation()` wraps `$navigateTo` and always passes an explicit
   frame id — `Frame.topmost()` is ambiguous with five parallel frames.
3. **No event modifiers.** `@tap.stop` compiles to `withModifiers`, which
   nativescript-vue 3 does not export.
4. **Stay on Vite 7.** Vite 8 / Rolldown silently drops the NativeScript polyfills and
   every network call then fails on device with a green build
   ([ADR 0002](../../adr/0002-vite-8-rolldown-evaluation.md)).

The rest, including the ones that only bite on a device, are in
[TROUBLESHOOTING.md](../../TROUBLESHOOTING.md#nativescript).

## Offline content

This app bundles the widest offline safety net of the two — feed snapshots, extracted
articles with downloaded covers, and per-show podcast snapshots — and serves them to
the core through the `ContentBundle` port. Refresh before a demo:

```bash
npm run offline-articles -w @correctiv/mobile
npm run offline-podcasts -w @correctiv/mobile
```

Design tokens are pre-generated and committed (`src/styles/tokens.generated.scss`), so
a fresh clone builds with no extra setup. `npm run tokens -w @correctiv/mobile`
regenerates them. Never import `tokens/theme.css` directly: NativeScript's CSS subset
supports neither `rem`, `:root` nor unitless line heights.

## Known gaps

- **iOS live radio.** `AVAudioPlayer` cannot play a live stream; it needs an
  `AVPlayer` wrapper. Android streams the Icecast MP3 directly.
- **No lock-screen metadata.** `TNSPlayer` offers none, so the audio backend accepts
  the core's `nowPlaying` and drops it. Named in `src/services/audio.service.ts`
  rather than silently missing.
- **Authenticated podcasts are unbuildable here.** `@nativescript-community/audio`
  has no `headers` option on its source
  ([ADR 0003](../../adr/0003-audio-capability-spike.md)). That finding is what
  decided the stack.
