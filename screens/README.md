# Screens

Every screen of the app, shot on an Android emulator under fixed step names.

It exists because of the rule in [`AGENTS.md`](../AGENTS.md): a green check is not
evidence. Extracting text with `uiautomator dump` proves the right words are on
screen and nothing about how it looks. Every finding these rounds produced survived a
green build, a green typecheck and a green test run, and every one was found by
looking at a picture.

## The set

[`android/`](android/) holds 31 shots, one per step, from `apps/mobile`. Shot on
2026-09-02 from the release APK of the review round on `Medium_Phone_API_36` at
1080x2400, night mode off. Both tours ran clean, with no `MISS`.

**This is the first set that opens at the door.** Since
[ADR 0016](../adr/0016-a-door-at-the-root-and-an-entitlement-not-an-amount.md) a
cleared app starts at the login gate, so `tour-android.sh` opens with three steps that
did not exist before, `00-gate`, `00-gate-failed` and `00-gate-no-access`, and signs
in before `01-onboarding-welcome`. That step keeps its name because the screen it
shows has not changed, and every step after it is reached exactly as before. The
door's waiting state lasts 1.5 s and is not in the tour; the browser check covers it.

`04-onboarding-club` is **gone**, not missing: the onboarding's fourth step was the
club pitch, and [ADR 0018](../adr/0018-removing-the-guest.md) removed it along with
every other branch that addressed someone who had not paid. The walk now ends that
sequence on "Fertig".

The rest were re-shot rather than carried over, and three of them are the reason two
ADRs exist. The first round after the door still showed "Sie sind als Gast unterwegs"
on the profile of an account that had just signed in, and offered "Erstmal umsehen"
two screens after a door that could not be looked past
([ADR 0018](../adr/0018-removing-the-guest.md)). The round after *that* still printed
"Ihr Beitrag: 10 € / Monat" for an account that had never set one, because the slice
defaults to ten and the row rendered unconditionally
([ADR 0019](../adr/0019-identity-lives-in-the-session.md)). None of the three was
visible in a test. All three were visible in a picture.

The **native tab bar** ([ADR 0013](../adr/0013-native-tabs-and-a-web-tab-bar-of-its-own.md))
arrived with the previous set and is unchanged here: Material Symbols instead of
Ionicons, and Material 3's pill behind the selected item.

[`web/`](web/) holds the five tab screens at the same step names plus the reader on a
fact check, from the static export, shot at a 540x1200 viewport. The reader is there
because it is where the verdict plaque shows, and the plaque is what
[ADR 0015](../adr/0015-reading-correctiv-org-through-its-rest-api.md) corrected: this
article was labelled "Falsch" until it read "Teilweise falsch". It exists because the tab bar
is now the one part of the app that is deliberately **not** the same on both, and a
claim like that should be checkable by looking rather than by reading the ADR. It is
five shots, not 29: the rest of the web build differs from Android only in the ways
the note at the end of this file already lists, and a second full set would be 24
pictures nobody compares.

The AVD matters. Earlier sets used `Medium_Phone`, which is API 24. Dark mode does not
exist below API 29, so that device cannot show the app's default appearance at all and
reports light no matter what is set.

**The set is light mode throughout, on purpose.** It is a layout record. Appearance is
checked separately, on all four combinations of setting and device scheme, because
three of them are invisible here. See the appearance entry in
[`TROUBLESHOOTING.md`](../TROUBLESHOOTING.md).

Later rounds can add `ios/` beside them under the same step names.

## Shooting a set

The emulator needs a window. Headless dies on SELinux denying `execheap` to
SwiftShader's shader JIT.

```bash
cd apps/mobile/android && ./gradlew assembleRelease && cd -
adb install -r apps/mobile/android/app/build/outputs/apk/release/app-release.apk

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
npm run build:web -w apps/mobile
node screens/tools/serve-clean.mjs apps/mobile/dist 8099
```

The `web/` set has no tour script, because the repo has no browser-automation
dependency and adding one to take five pictures would be the wrong trade. They were
shot by driving a browser at a 540x1200 viewport over `/`, `/entdecken`,
`/mediathek`, `/mitmachen` and `/profil`, waiting for the feeds to settle, and
converting with the same `magick` line as below. Any tool that does that produces a
comparable set; what matters is the viewport and the step names.

`serve-clean.mjs` maps `/artikel` to `artikel.html` and falls back to `404.html` the
way GitHub Pages does. A plain `python3 -m http.server` does neither, and Expo Router
then renders its unmatched-route page, which looks exactly like a broken route in the
app.

To reproduce what is actually published, build with the Pages base path and serve
underneath it. This is the only way to catch an asset URL that resolves from the
domain root. On `localhost:8099/` such a build looks fine and on the real site it is a
blank page.

```bash
EXPO_BASE_URL=/correctiv-app npm run build:web -w apps/mobile
node screens/tools/serve-clean.mjs apps/mobile/dist 8099 --base=/correctiv-app
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
- **Neither is a dead emulator.** `set -uo pipefail` does not stop the walk when the
  device goes away: every step prints `error: no devices/emulators found`, `shot`
  redirects an empty stream into a `.png`, and the tour still ends with `done`. One run
  produced 31 zero-byte files and a clean-looking log. Check the device is attached
  before converting, and check the file sizes after.
- **A shot of a colour scheme has to carry its own proof.** A dark page and a light
  one are told apart by eye, and an eye has been wrong here once already: a shot that
  measured `rgb(32,32,32)` at three points was reported as light. There is no browser
  tour in `screens/tools/` — the sets here are Android, and appearance is checked by
  hand — so this is the rule for whoever drives a browser next: fix the scheme where it
  cannot drift, on the browser context at creation rather than with `emulateMedia` on a
  page, keep one page per walk, and next to every shot log
  `matchMedia('(prefers-color-scheme: dark)')`, the class on `<html>` and
  the computed background of the element that paints the page. Then measure the file
  (`magick shot.png -format '%[pixel:p{5,5}]' info:`) before saying what it shows.
  Chromium's PNG stores the app's `#1a1a1a` as `32,32,32` behind an embedded ICC
  profile, so compare against the light value, not against the token.
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
- Home's articles used to come from the bundled snapshot on the web export, because
  correctiv.org's RSS feeds send no `Access-Control-Allow-Origin`. Since
  [ADR 0015](../adr/0015-reading-correctiv-org-through-its-rest-api.md) the app reads
  the REST API, which does send it, so the web build has a live path. **The five `web/`
  shots were re-taken from that build on 2026-09-01** and show live content: the lead
  article is that morning's. The `android/` set is older and still shows the state
  before it.

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
