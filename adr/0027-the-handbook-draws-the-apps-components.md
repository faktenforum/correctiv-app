# ADR 0027 — The handbook draws the app's components, and the app's rendering is the one that counts

Status: accepted, 2026-09-11.

## Context

`/components` in the handbook lists all 47 components of `apps/mobile` with their
props, their prose and their source link, and shows none of them. To see one, a
reader opens a row and the page boots the **whole app** in an iframe, at phone width,
three at a time ([`src/lib/rows.ts`](../apps/handbook/src/lib/rows.ts) says why three).
A frame always carries a viewport, so what a reader gets for `Hairline` — a one-pixel
line — is a 393 px phone with a line somewhere on it.

The obvious alternative is for the handbook to import the component and render it in
its own React tree. The handbook is Vite and React; the app is Expo, React Native and
Metro. Whether those meet is not a design question, it is a measurement, and the
measurement had never been taken honestly. [Issue #113](https://github.com/faktenforum/correctiv-app/issues/113)
asked for it.

## What was measured

`apps/handbook/scripts/measure-direct.mjs` runs one `vite build` per component from
`apps/handbook`, each with a throwaway entry that imports that one file and renders
it, and prints how many survive. It is committed so the number can be re-taken rather
than believed.

Three runs, in order, and the order is the finding:

| Run | Result |
|---|---|
| The repository root's `vite`, which was **7.3.6**, hoisted for vitest | 16 of 47 |
| The handbook's own **Vite 8**, Rolldown, nothing else changed | **7 of 47** |
| Vite 8 with the recipe below | **47 of 47** |

The first run was wrong and flattering. It invoked `node_modules/.bin/vite` from the
repository root, which is vitest's Vite 7, not the one the handbook builds with. On
the real bundler the number went **down**: Rolldown refuses Flow outright,
`[PARSE_ERROR] Flow is not supported`, where Rollup's acorn pass had only tripped
over JSX inside CommonJS. Vite 8 is the stricter of the two. The seven that survived
it unaided were `media/VideoFrame`, `media/VideoFrame.web`, `player/ProgressBar`,
`reader/ReaderView`, `reader/ReaderView.web`, `ui/Card` and `ui/Hairline`.

**The recipe is three things, and there is no fourth.**

1. **`vite-plugin-rnw` 0.0.12**, which strips the Flow that Rolldown refuses, treats
   `.js` in `react-native*`/`expo*` as JSX, and defines `__DEV__` and the rest of the
   runtime globals React Native expects. This is the plugin Uniwind's own documented
   Vite setup prescribes. Pre-1.0, and accepted knowingly: what it does is
   mechanical, it is 400 lines, and the alternative is doing the same work here.
2. **`.web.*` ahead of the bare extensions in `resolve.extensions`.** Metro's
   platform split, spelled out. `react-native-safe-area-context` ships
   `SafeAreaView.web.js` and `NativeSafeAreaProvider.web.js` beside native files, and
   without the order it resolves the native ones. The plugin carries a list of its
   own and it is not enough: a plugin's `config()` result is appended to the user's,
   arrays concatenate, and a bare `.js` written at the config level wins. Measured
   twice — by the first run of this recipe, which reported 7 of 47 with the plugin
   and a bare-first list, and again on 2026-09-11 by shortening the list with the
   plugin in place: `ui/SafeAreaView`, `ui/Screen` and `ui/ScreenHeader` fail on
   `[UNLOADABLE_DEPENDENCY] Could not load react-native-web/Libraries/Utilities/codegenNativeComponent`,
   from a spec file only the native half reaches.
3. **Breaking the `@expo-google-fonts` chain out of `@/lib/theme`.** See below.

No stub. Not the store, not the router, not the webview.

### And one thing the count cannot see

The two plugins both alias `react-native`, an alias list is searched
first-match-first, and the earlier plugin's entry wins the merge. Measured both
ways on 2026-09-11, on the built site, by reading the drawn `Card` out of the DOM:

| order | `Card`'s element | on screen |
|---|---|---|
| `rnw()`, then `uniwind()` | `css-g5y9jx rounded-md p-m bg-canvas border border-stroke` | correct, and follows the scheme |
| `uniwind()`, then `rnw()` | `css-g5y9jx` | **no ground, no border, and `Hairline` invisible** |

With `react-native` aliased to `react-native-web`, `className` reaches the DOM and
the app's own stylesheet does the rest. Uniwind's components resolve a `className`
themselves, and in this bundle they resolve it to nothing.

**Every automatic signal is identical in both rows.** The build is green, the
measurement above reports 47 of 47 in both, the page renders, no error is logged, and
`Typo` — which reads its colour in TypeScript rather than through a class — is
correct either way, so even a colour check on the text passes. The only thing that
sees it is somebody looking at the picture. `test/direct.test.ts` now asserts the
order so that at least the *next* person cannot reintroduce it silently.

### The three things that are not walls

**The store is not a bundling blocker.** `@/lib/store/core` is reachable from nearly
every component through `@/lib/theme/appearance.ts`, and it parses and bundles. Store
access is a *runtime* precondition — a `Provider` and configured ports — not a
bundling one, and `useColors()` reads `useUniwind().theme` rather than the store, so
a component that only needs a colour needs no store at all. An earlier claim that the
store was one of the walls was wrong.

**The router is not one either.** `expo-router` bundles. What it does not have is
routes, which again is a runtime question.

**The webview is not one.** `VideoFrame` and `ReaderView` both build while importing
`react-native-webview`, and both were among the seven that built before the recipe.

### The font chain, which was a wall

`apps/mobile/src/lib/theme/index.ts` re-exported `./fonts`, and `fonts.ts` imported
`@expo-google-fonts/merriweather` and `@expo-google-fonts/source-sans-3`. Those
resolve to React Native asset registrations, which only Metro can answer. `lib/theme`
is the app's most-imported module — every `useColors`, every typography constant —
so **every component in the app had Expo's font loader in its import graph** to reach
a colour token.

What a component actually wants from that module is a family *name*, which is a plain
string. So `fonts.ts` keeps the names and `fontFamilyFor()`, a new `font-assets.ts`
holds the five files, the barrel does not re-export it, and `app/_layout.tsx` — the
only consumer of `fontAssets`, verified against the whole tree — imports it by path.
`__tests__/web-target.test.ts` fails if any of those three facts stops being true.

### The `ui` barrel, which is the same shape one level up

Most of the components that failed the second run never touch an icon. They write
`import { Typo } from '@/components/ui'`, and the bundler has to parse the barrel's
whole export graph, which includes `ScreenHeader` and `Thumbnail` with their
`@expo/vector-icons` and `expo-image` imports. **One barrel import inherits every UI
component's dependencies.**

That is a finding about `apps/mobile` and it is not acted on here: with the recipe in
place those files build anyway, so changing 45 import lines would be churn against a
problem that is now only a size. `src/components/direct.tsx` in the handbook imports
by file and a test keeps it that way, which is enough to stop the handbook's own
bundle from paying for it. Whether the app should import siblings by file is its own
change.

### Two Vites in one tree

`vitest@3.2.7` has `vite` as a regular **dependency** (`^5.0.0 || ^6.0.0 || ^7.0.0-0`),
not a peer, and so does `vite-node`. npm hoisted that 7.3.6 to `node_modules/vite`
while the handbook's 8 sat in `apps/handbook/node_modules/vite`. Every *plugin*
resolves `vite` from where the plugin is installed, which is the root — so
`uniwind/vite`'s own `require('vite/package.json')` reported 7, and Uniwind handed a
Vite 8 build its esbuild configuration.

Fixed by adding `vite` to the **root** `package.json`'s devDependencies. npm then
puts 8 at `node_modules/vite`, where the plugins and the handbook both find it, and
nests vitest's 7 under `node_modules/vitest/node_modules/vite`, where only vitest
looks. `overrides` would have been the wrong tool: it would hand vitest a major it
does not declare. Two copies remain and that is fine; the one at the root is the
right one. `apps/handbook/test/toolchain.test.ts` asserts it, and
`TROUBLESHOOTING.md`, "Two Vites in one tree", carries the symptom.

The tell, measured both ways on 2026-09-11 by pointing Uniwind at each version in
turn: on the 7 path it emits **`optimizeDeps.esbuildOptions` … is now deprecated**,
twice. On the 8 path that is gone. The `resolve.alias` `customResolver` deprecation
is **not** a tell — Uniwind emits it on both paths, because both of its alias
configurations use one.

## Decision

**The handbook draws the app's components in its own React tree, and the app's own
bundle stays as the rendering that counts.**

`apps/handbook/src/components/direct.tsx` is a registry of what this site draws. It
is the measurement rather than a description of one: an entry that does not build
fails `vite build`, so there is no manifest to keep in step. `direct-ids.ts` beside
it holds the ids as plain data, and typing the registry as `Record<DirectId, …>` is
what stops the two from drifting.

`ui/Card` and `ui/Hairline` ship in it, which is the proof and nothing more. The
components page that is built around this — cards, a detail route, the switch between
the two renderings — is the next change and is not here.

**Where the two renderings disagree, the app's is right.** The handbook's is a second
build of the same source with a different bundler; it exists so a reader can see a
component at the size the component is, not so it can be an authority. Nothing
compares the two automatically and nothing should: screenshot diffing is the flakiest
thing in CI, and a check that reddens without cause gets switched off. A disagreement
is a finding for a person.

## The dark-mode trap, which is ADR 0008's defect reachable by a new route

**The handbook must hand its appearance setting to `Uniwind.setTheme()`. Painting a
`.dark` class on the document element is not enough.**

Measured in a browser on 2026-09-11, first on a probe page drawing `Typo`, `Badge`,
`Chip` and `Hairline`. Adding `dark` to `<html>` — which is exactly what
`apps/handbook/src/theme.ts` does, and all it does — moved the CSS variables:
`canvas` went to `#1a1a1a` and `accent` to `#ff6173`. `useUniwind().theme` stayed at
`light`, so `Typo`'s colour stayed pinned at `#333`, which against `#1a1a1a` is very
nearly invisible. `Uniwind.setTheme('dark')` fixed it, `#333` to `#f2f2f2`, and
`setTheme('light')` put it back. The fixed half was then re-read off the built site,
in all four appearance combinations; the table is below.

The cause is in Uniwind's web runtime: its module constructor reads
`document.documentElement.classList` **once**, and the site's appearance setting is
applied afterwards. Classes reach the CSS variables; they do not reach anything that
reads a colour in TypeScript, which is `useColors()` and therefore every `<Typo>` in
the app.

[ADR 0008](0008-uniwind-over-nativewind.md) records the same failure in the
NativeWind era: `darkMode: 'class'` left "the JavaScript following the device while
the CSS waited for a class nothing added", and it shipped past a green build and a
browser walk. This is that defect, from the other side, in a second host. Nothing in
this repository's checks would catch it, because every mechanism involved is working
correctly; they are simply two mechanisms.

`DirectPreview.tsx` therefore reads the class off `<html>` — `dark`, `light`, or
neither, which is the "System" setting — and calls `Uniwind.setTheme()` with it,
`'system'` included, which is Uniwind's own adaptive mode. It reads the class rather
than taking a prop because `theme.ts`'s `useAppearance` is `useState` held in
`App.tsx`, and a second call to it would be a second, independent setting.
`test/direct.test.ts` fails if the call disappears.

**So the appearance matrix is not optional for this change.** All four, measured on
the built site with `Card` drawn, on 2026-09-11:

| setting | device scheme | page ground | drawn ground | `Typo` |
|---|---|---|---|---|
| System | light | `#ffffff` | `#ffffff` | `#333333` |
| System | **dark** | `#1a1a1a` | `#1a1a1a` | `#f2f2f2` |
| Light | dark | `#ffffff` | `#ffffff` | `#333333` |
| Dark | light | `#1a1a1a` | `#1a1a1a` | `#f2f2f2` |

The second row is the default on both halves and the one that has already shipped
broken. Note that the device scheme was emulated for this table, which is legitimate
*here* — everything measured is in this document — and is not for the framed app:
emulation forces the feature into every frame and makes `AppFrame`'s `color-scheme`
propagation look inert (TROUBLESHOOTING.md, "Design tokens and styling"). For the
frame, change the machine's own scheme.

## What it costs

**Two Tailwind instances in one document, deliberately.** The handbook's
`styles/app.css` imports `@correctiv/design-tokens/theme.standalone.css`; the app's
`global.css`, which `DirectPreview.tsx` pulls in, imports `theme.css` plus `uniwind`.
Both come from one generator, so `--color-canvas` is one value written twice rather
than two values. A drawn component takes its variables from the app's sheet and its
theme from the call above. `apps/handbook/test/styles.test.ts` still refuses a
literal colour anywhere in this package, which is what keeps a third palette from
appearing.

**The site's bundle grew.** 1,181.59 kB to 1,392.09 kB (gzip 362.83 to 435.72), and
the stylesheet 68.22 kB to 74.49 kB, for two components. That is react-native-web,
Uniwind's runtime and — through `Typo` → `@/lib/theme` → `appearance.ts` — the core's
store. It is not per component; the next forty-five are close to free.

**`apps/handbook` now reaches into `apps/mobile`.** `vite.app.mjs` holds that reach in
one file, shared by the site's config and the measurement script so the number is
about the build it claims to be about.

## What is still open

**Fonts.** The exploratory measurement stubbed `@expo-google-fonts/*` with the
family-name strings, and breaking the chain out of the barrel has the same effect
without a stub: the families are *applied* — `fontFamilyFor()` returns
`Merriweather_400Regular` and `<Typo>` sets it — and no font file is loaded, because
loading one is `expo-font`'s job and there is no Expo here. So a drawn component's
sizes, weights and line heights are the app's and its typeface is the browser's
fallback, which is visible in the handbook beside the framed app and looks like what
it is. How the handbook loads Merriweather and Source Sans 3 for a directly drawn
component is unresolved; the reader font subsets in
`lib/theme/readerFonts.generated.ts` are one candidate and were not tried.

**`vite-plugin-rnw` is pre-1.0** and has one maintainer. If it goes away, its two
loads of work — Flow removal and the React Native defines — are reproducible here in
well under a hundred lines, and this ADR names them for that reason.

**Which components are worth drawing** is a different question from which ones build.
All 47 build; `direct.tsx` has two. The rest arrive with the page built for them.

## What this retires

[ADR 0002](0002-vite-8-rolldown-evaluation.md), its decision line: **"Stay on
`@nativescript/vite@2.0.3` / Vite 7."** **Struck in place.** The NativeScript half of
that sentence was already moot under
[ADR 0007](0007-removing-the-nativescript-host.md); the Vite half was not, and it was
still the only ADR in the repository saying anything about which Vite this project
runs. `apps/handbook` has built with Vite 8 and Rolldown since 2026-09, and after
this change so does everything that resolves `vite` from the root. 0002's
measurement — a bundler that can silently drop a polyfill and stay green — is
untouched and is the reason the record is kept.

Nothing else in 0002 is affected. Its polyfill finding was about
`@nativescript/vite`'s virtual entry module, which is not in this tree.
