# ADR 0008 — Uniwind over NativeWind, and Tailwind v4

Status: accepted, 2026-08-27.

## Context

The app styled itself with NativeWind 4, which is a Tailwind **v3** engine. That
version pin is the whole of this decision: everything else follows from it.

Three things were pushing against it.

`tokens/theme.css` is vendored from `wp-design-tokens`, which declares
`peerDependencies: { tailwindcss: ">=4.1" }` — the tokens have been on v4 for as long
as they have been in this repo, and the app has been reading them through a
translation layer. [`tokens/README.md`](../tokens/README.md) records that mismatch as
one of the reasons the tokens were vendored rather than installed.

The translation layer was `tailwind.tokens.generated.js`: a v3 theme map with colours
shaped as `rgb(var(--color-x) / <alpha-value>)` and a plugin emitting the palette
twice, under `:root` and `.dark:root`. It existed only to restate, in a shape a v3
engine understands, what `theme.css` already said. When the token bridge moved into
`packages/design-tokens` so that the CMS could share it
([#47](https://github.com/faktenforum/correctiv-app/pull/47)), that file was the one
artefact that could not move with it — a v3 theme map is a fact about the engine this
app happens to run on, not about the tokens.

And the appearance setting was the app's most fragile surface. `darkMode: 'class'`
required `'system'` to be resolved by hand before it reached NativeWind, because
passing it through left the JavaScript following the device while the CSS waited for
a class nothing added. That shipped, on the default setting, past a green build and a
browser walk. The rule survived as a test and three paragraphs of comment.

## Decision

Move to **Uniwind 1.11** and **Tailwind v4**.

NativeWind v5 was not an option: it is `5.0.0-preview.4` and its own documentation
says "not intended for production use".

## Consequences

**The token package gains a shareable artefact and loses a private one.**
`packages/design-tokens/theme.css` is plain Tailwind v4 — `@theme` for the scales,
`@variant light` / `@variant dark` for the two palettes. Any v4 consumer imports it,
including a WordPress theme build; `tailwind.config.js` and the v3 map are deleted.

**One file now serves both consumers, where two units were needed before.** The
generator resolved everything to px because NativeWind inlined `rem` against a root
size of 14. Uniwind resolves `rem` against 16 — the CSS convention, and the base
`wp-design-tokens` assumes — so `theme.css` keeps `rem` and the app still lands on the
same pixels. Every named spacing and radius token was checked to resolve to the
identical value it had under the v3 map; the numeric step is 2 px in both.

**The appearance rule inverted.** `'system'` is one of Uniwind's registered themes:
it resolves the device scheme itself and reports the resolved value, and it emits
both a `.light`/`.dark` class and a `prefers-color-scheme` fallback, so the two halves
cannot drift apart. `lib/theme/appearance.ts` now passes the setting through
verbatim, and resolving it by hand would be the new bug. The test that guarded the
old rule guards the new one, and keeps the story of the old defect — the discipline
it demands is unchanged: **check all three settings, and check `'system'` against both
device schemes.**

**Uniwind reaches deeper into Metro than NativeWind did.** It replaces
`transformerPath`, wraps `resolveRequest`, and rewrites every `react-native` and
`react-native-web` import to `uniwind/components` so `className` reaches the core
components. It takes the existing `resolveRequest` as its base, so the two resolver
workarounds in `metro.config.js` survive — but `withUniwindConfig` must be the
outermost wrapper, and that is a requirement, not a preference.

**Third-party components need wrapping.** Only `react-native` imports are rewritten,
so `react-native-safe-area-context`'s `SafeAreaView` would drop a `className`
silently. `components/ui/SafeAreaView.tsx` wraps it with `withUniwind`, which maps
`className` to `style`.

**There is no Babel step any more.** Uniwind is a Metro plugin; `babel.config.js` is
back to `babel-preset-expo` alone.

## What was checked

The engine decides how the app looks, so the check was pixels rather than a green
build — sampled, not eyeballed, after reading a screenshot wrong once.

Android (API 36), all four appearance combinations: `System` on a light device →
`255,255,255`; `System` on a dark device → `26,26,26` with text at `168,168,168`;
explicit light on a dark device → white; explicit dark on a light device →
`26,26,26`. The full `tour-android.sh` ran with no missed step.

Web: light and dark via `prefers-color-scheme`, surfaces *and* text flipping in
opposite directions at the same four points — `255,255,255`/`32,32,32` for the page,
`54,54,54`/`242,242,242` for a headline.
