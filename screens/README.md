# Screens — the three versions, shot the same way

A visual record of every screen in all three versions of this app, captured with the
same step names so they can be read side by side.

It exists because of the rule in [`AGENTS.md`](../AGENTS.md): a green check is not
evidence. The weaker version of that rule — extracting text with `uiautomator dump`
and `document.body.innerText` — proves the right *words* are on screen and nothing
about how it looks. Every finding in the table below survived a green build, a green
typecheck and a green test run, and each one was found by looking at a picture.

| Set | What it is | Worth as a reference |
| --- | --- | --- |
| [`draft/`](draft/) | The design draft in [`docs/`](../docs/) rendered in Chrome at 402×874 | **The** visual target. Generated from the `design-entwurf` sibling repo, not app code |
| [`nativescript/`](nativescript/) | `apps/mobile`, superseded by [ADR 0004](../adr/0004-react-native-pivot.md) | Still the closest match to the draft in places. Read it for layout decisions, do not add features to it |
| [`expo/`](expo/) | `apps/mobile-rn`, the live app | The thing under test |

Captured 2026-08-05 at commit `26ef0c9`, emulator `Medium_Phone` (Android 7.0 API
36, 1080×2400). The draft is pinned to light mode so it matches the emulator's.

## Three-way comparison

Order in each image: **draft · NativeScript · Expo**.

| | |
| --- | --- |
| [Home](compare/10-home-top.webp) | ![Home](compare/10-home-top.webp) |
| [Entdecken](compare/30-entdecken.webp) | ![Entdecken](compare/30-entdecken.webp) |
| [Mediathek](compare/40-mediathek.webp) | ![Mediathek](compare/40-mediathek.webp) |
| [Mitmachen](compare/50-mitmachen.webp) | ![Mitmachen](compare/50-mitmachen.webp) |
| [Profil](compare/60-profil.webp) | ![Profil](compare/60-profil.webp) |

## What the comparison found

| Seen in a screenshot | Cause | Which version was right |
| --- | --- | --- |
| A video card grown into a full-screen black rectangle | `w-64` does not exist in the token scale, so the class was dropped and `aspectRatio` scaled the height off the title's width | draft & NativeScript |
| Podcast covers half size, titles breaking mid-word | `w-32` means 64px here, not Tailwind's 128 | both |
| Play buttons at half size everywhere | same 2px-per-unit scale: `w-10` is 20px, `w-12` 24px | both |
| Failed thumbnails rendered as a broken-image glyph on black | expo-image's own placeholder; on this project failing thumbnails are routine | NativeScript, which degrades quietly |
| Home shouting and Mediathek whispering | the dark treatment was on Home's small tile instead of Mediathek's radio banner | both |
| A live badge with two dots | the component draws the dot and the label repeated it | both |
| No date in Home's masthead | never built; `formatDateWeekdayDe` sat unused in the core | both |
| Hero without kicker or byline, image inset instead of edge to edge | never built | both |
| No participate module and no Backstage card on Home | never built | both |

Fixed in [#30](https://github.com/faktenforum/correctiv-app/pull/30), which also
adds `__tests__/no-numeric-utilities.test.ts` so the token-scale trap cannot come
back silently.

Two differences are deliberate and stay: Expo shows video channels as horizontal
rails where the draft uses a vertical list (the rail is what NativeScript settled
on too), and app settings live on their own route instead of inline in the profile,
because they need to be deep-linkable.

## Regenerating

The emulator needs a window — headless dies on SELinux denying `execheap` to
SwiftShader's shader JIT.

```bash
# Expo build
cd apps/mobile-rn/android && ./gradlew assembleRelease
adb install -r app/build/outputs/apk/release/app-release.apk
OUT=out/expo bash screens/tools/tour-android.sh          # the five tabs
OUT=out/expo bash screens/tools/tour-android-routes.sh   # the pushed routes, by deep link

# NativeScript build — same package id, so it replaces the Expo one
adb uninstall org.correctiv.app.prototype
adb install apps/mobile/platforms/android/app/build/outputs/apk/debug/app-debug.apk
OUT=out/nativescript ACTIVITY=com.tns.NativeScriptActivity bash screens/tools/tour-android.sh

# Design draft
python3 -m http.server 8098 --directory docs &
node screens/tools/tour-draft.mjs http://localhost:8098/index.html out/draft \
  --tour=screens/tools/tour-draft.json
```

Then convert for the repo — full-resolution PNGs are ~1.1 MB each, WebP at 540px
is ~50 KB and still legible:

```bash
magick in.png -resize 540x -strip -quality 82 out.webp
```

## Caveats

- The draft is one interactive shell inside an iOS frame, so its tour has to click
  through the app the way a user would; the Expo routes are reached by deep link
  (`correctiv://<route>`) instead, which cannot drift when a layout changes.
- Podcast series show sample data in the Expo shots: Castopod, Icecast and
  `tube.funfacts.de` serve a Let's Encrypt chain that this emulator image does not
  trust. That is an ops finding, not an app defect — see the traps table in the
  root [`README.md`](../README.md).
- The draft's content is fixed sample data with a fixed date; both builds pull live
  feeds, so the articles differ between the sets by design.
