# Screens

Every screen of the app, shot on an Android emulator under fixed step names.

It exists because of the rule in [`AGENTS.md`](../AGENTS.md): a green check is not
evidence. Extracting text with `uiautomator dump` proves the right words are on
screen and nothing about how it looks. Every finding these rounds produced survived a
green build, a green typecheck and a green test run, and every one was found by
looking at a picture.

## The set

[`android/`](android/) holds 29 shots, one per step, from `apps/mobile-rn`. Shot on
2026-08-27 at `0919402` on `Medium_Phone_API_36` at 1080x2400, over Metro from a clean
worktree.

The AVD matters. Earlier sets used `Medium_Phone`, which is API 24. Dark mode does not
exist below API 29, so that device cannot show the app's default appearance at all and
reports light no matter what is set.

**The set is light mode throughout, on purpose.** It is a layout record. Appearance is
checked separately, on all four combinations of setting and device scheme, because
three of them are invisible here. See the appearance entry in
[`TROUBLESHOOTING.md`](../TROUBLESHOOTING.md).

Later rounds can add `ios/` and `web/` beside it under the same step names.

## Shooting a set

The emulator needs a window. Headless dies on SELinux denying `execheap` to
SwiftShader's shader JIT.

```bash
cd apps/mobile-rn/android && ./gradlew assembleRelease && cd -
adb install -r apps/mobile-rn/android/app/build/outputs/apk/release/app-release.apk

OUT=out/android bash screens/tools/tour-android.sh          # the five tabs
OUT=out/android bash screens/tools/tour-android-routes.sh   # the pushed routes, by deep link
```

Then convert. Full-resolution PNGs are about 1.1 MB each, WebP at 540px is about
50 KB and still legible.

```bash
for p in out/android/*.png; do
  magick "$p" -resize 540x -strip -quality 82 "screens/android/$(basename "$p" .png).webp"
done
```

Look at the web export in the same pass. It is the only place where
back-without-history and a directly opened route can be tested at all.

```bash
npm run build:web -w apps/mobile-rn
node screens/tools/serve-clean.mjs apps/mobile-rn/dist 8099
```

`serve-clean.mjs` maps `/artikel` to `artikel.html` and falls back to `404.html` the
way GitHub Pages does. A plain `python3 -m http.server` does neither, and Expo Router
then renders its unmatched-route page, which looks exactly like a broken route in the
app.

To reproduce what is actually published, build with the Pages base path and serve
underneath it. This is the only way to catch an asset URL that resolves from the
domain root. On `localhost:8099/` such a build looks fine and on the real site it is a
blank page.

```bash
EXPO_BASE_URL=/correctiv-app npm run build:web -w apps/mobile-rn
node screens/tools/serve-clean.mjs apps/mobile-rn/dist 8099 --base=/correctiv-app
# then open http://localhost:8099/correctiv-app/
```

## What makes a screenshot evidence

Each of these cost a wrong conclusion or a worthless committed picture.

- **A screenshot is only evidence about the build it came from.** One set was shot
  between 13:40 and 14:21 from APKs built at 14:46, and the commit it claimed to
  document landed at 15:12. Every picture showed an app one commit out of date, and
  one showed a feature that commit had deleted. Shoot after building, from the build
  you mean to document, and write down the commit.
- **A screenshot is only evidence about the part of the screen it shows.** The
  reader's floating controls were invisible against a white article background, and
  every committed reader shot is of the first viewport, where they sit over the hero
  image and look right. Scroll before you judge. On a route whose content is an
  `<iframe>`, scroll the frame, or every shot comes out identical, which reads as
  "checked" and is not.
- **Wait for Metro.** One attempt had to be thrown away because Metro was still
  building its cold bundle when the tour started. The app reloaded midway and the last
  four steps were shot against the onboarding screen the reload landed on.
- **A `MISS` is not a picture.** The tours report a missed step and walk on regardless.
  Two committed screenshots documented nothing for that reason and nobody looked at
  them. Read the tour's log, then look at what it produced.
- **Extracted text is the weak version of all of this**, and stale besides. A React
  Native text node that ticks keeps reporting its old value to `uiautomator dump`. See
  the first section of [`TROUBLESHOOTING.md`](../TROUBLESHOOTING.md).

## What these shots do not show

- Podcast series show sample data. Castopod, Icecast and `tube.funfacts.de` serve a
  Let's Encrypt chain this emulator image does not trust. That is an ops finding, not
  an app defect. See
  [`TROUBLESHOOTING.md`](../TROUBLESHOOTING.md#data-sources).
- `83-video` is a black frame. The embed's error message is gone, but this emulator
  image renders no YouTube video, so that playback works is not verified here and
  belongs on the device test.
- Home's hero can be a grey placeholder. The article the feed puts first sometimes
  carries no cover at all, no `og:image` and no image in the feed item. Both the app
  and its predecessor degrade quietly, which is what the first comparison round asked
  for.
- On the web export, Home's articles come from the bundled snapshot rather than the
  network, because correctiv.org sends no `Access-Control-Allow-Origin`. Judge layout
  on the emulator shots. The web build shows a snapshot as old as the last
  `npm run offline-articles`.

## Where the comparison history went

Five rounds compared this app against the design draft and the NativeScript build,
between 2026-08-05 and 2026-08-27. Both of those sets are gone from the repo. The
draft lives in the `design-entwurf` sibling checkout, and the NativeScript host was
removed on 2026-08-12
([ADR 0007](../adr/0007-removing-the-nativescript-host.md)).

What the rounds found is fixed and shipped, in
[#30](https://github.com/faktenforum/correctiv-app/pull/30),
[#31](https://github.com/faktenforum/correctiv-app/pull/31) and
[#32](https://github.com/faktenforum/correctiv-app/pull/32). The lessons that outlived
the findings are the rules above. The tables themselves are in the git history of this
file, which is where a record of a deleted app belongs.
