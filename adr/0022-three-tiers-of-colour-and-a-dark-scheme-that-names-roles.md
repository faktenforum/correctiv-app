# ADR 0022 — Three tiers of colour, and a dark scheme that names roles

Status: accepted, 2026-09-03.

## Context

wp-design-tokens moved from `501ee10` (tag `v0.1.1`) to `8ed7a28`. The change is one
commit that matters, `9d4d922`, and it replaces the flat colour palette with three
tiers:

| Tier | Tokens |
|---|---|
| primitive | `black`, `white`, `neutral-100…700`, `red-500`, `yellow-400` |
| semantic | `accent`, `accent-alternative`, `background`, `canvas`, `surface`, `on-background`, `on-canvas`, `on-surface`, `on-canvas-muted`, `on-canvas-accent`, `stroke`, `stroke-strong` |
| deprecated v1 | `emphasis`, `alternative`, `grey-100…700` |

The v1 names survive as aliases with unchanged values, so nothing breaks by not
migrating. Upstream will remove them once its consumers have moved.

Two things arrived with it that are not just more names.

**`neutral-600` (#4a4a4a) is a new value.** No v1 grey pointed at it. It exists to
back `on-background`, and it is the only colour in this change with no history.

**The placeholder dark block is gone.** Until now `theme.css` carried a
`prefers-color-scheme: dark` block marked `@TODO Set this to the actual values` and
holding the light values verbatim. `9d4d922` deleted it down to a bare
`@TODO define dark mode theme`. Nothing was lost: this repo's generator never read
that block, and there is a comment in `firstRootBlock()` saying why. What was deleted
was a lie that compiled.

The reason this is an ADR and not ordinary work is that the semantic tier answers a
question `packages/design-tokens/palette.js` had been arguing from scratch since
[ADR 0010](0010-design-tokens-as-a-shared-package.md), and answers it better.

That file used to open with an essay: the grey scale is **not** semantic, because
`grey-100` (#fff) is a page surface *and* white text on a red button, and `grey-700`
(#333) is body text *and* a dark video stage. Inverting the scale for dark mode would
therefore turn the video stage white and the text on the brand red invisible. So each
grey was given the dark value of the role it plays in the *majority* of its uses, and
the minority uses were moved to two invented tokens, `always-light` and `always-dark`.

All of that was true, and none of it is ours to argue any more. A page surface is
`canvas`; white on a red button is the primitive `white`. They are different tokens
now and can move independently, which is exactly what the essay wished for.

## Decision

**Adopt all three tiers, and express the dark scheme at the semantic one.**

`palette.js` no longer holds a dark value per colour. It holds two lists:

- `dark` — a value for every colour that names a **role**. Twelve semantic tokens,
  plus the ten deprecated aliases, which keep the values they had.
- `schemeIndependent` — the eleven primitives, which deliberately do **not** follow
  the scheme. `white` is #ffffff on a dark phone too, because "white" names a value.

The generator's palette check is what holds the split up. Every colour in `theme.css`
must appear in exactly one of the two lists; a colour in neither throws, and the
message says what the choice is. That is the only decision the generator cannot make
for itself, and a colour left out has no symptom of its own — it stays on its light
value in dark mode, in a build that is otherwise green.

**The dark theme did not move.** Each semantic token took the dark value of the
deprecated alias that shares its light value: `canvas` is `grey-100`'s #1a1a1a,
`surface` is `grey-200`'s #242424, `on-canvas-muted` is `grey-600`'s #a8a8a8, and so
on for eleven of the twelve. Only `on-background` is new, because `neutral-600` is.
`apps/mobile/__tests__/tokens.test.ts` asserts the whole table, so "this was a rename
and not a repaint" is checkable rather than claimed.

**The app migrates to the semantic names**, which is the point of the exercise:
`bg-grey-100` → `bg-canvas`, `bg-grey-200` → `bg-surface`, `text-grey-600` →
`text-on-canvas-muted`, `bg-emphasis` → `bg-accent`, and so on. Every one of those is
value-identical in both schemes.

## Consequences

**One migration is not a rename, and it is visible.** `stroke`'s light value is
`neutral-300` #cecece. The app has drawn its hairlines in `grey-300` #e6e6e6, one
step lighter — there is no semantic token at #e6e6e6, so keeping the appearance would
have meant keeping a deprecated alias for the app's most common border. Every border,
divider, input outline, progress track and `<Hairline>` therefore darkens by one step
in light mode, and lightens by one in dark (#3a3a3a → #4a4a4a).

This was checked before it was taken, not after: both schemes were screenshotted
across eleven routes on the web export before and after, and diffed pixel for pixel.
The changed pixels are borders and nothing else. See the PR for the images.

`<Hairline>` moved with the borders rather than separately. It draws the same line as
a `border-b` and had to keep agreeing with it; a divider component and a border
utility disagreeing about the divider colour is worse than either value.

**`always-light` and `always-dark` are now redundant, and are kept anyway.** Since
primitives no longer follow the scheme, `always-light` is exactly `white` and
`always-dark` is exactly `neutral-700`, in both schemes. Removing them is a 37-call
change, and `tools/figma-plugin` (PR #72) binds both by name with a `bind()` that
fails **silently** on a token that has gone — the board would keep drawing with the
last synced hex and quietly stop following the tokens. So they survive one release by
agreement with that PR, which retires them in the same pass as the other ten aliases.

**Three app uses have no semantic successor, and stay on deprecated aliases.** Worth
naming, because they are the feedback upstream needs before it drops the v1 tier:

| Use | Token | Why nothing fits |
|---|---|---|
| `Badge` neutral fill, `ClaimStatusTag` | `grey-250` #f0f0f0 | upstream dropped it from the ramp with "no replacement" |
| `Thumbnail` image placeholder | `grey-300` #e6e6e6 | `neutral-200` as a **fill**; the semantic tier has no surface there |
| faint text: placeholders, chevrons, inactive tabs (45 uses) | `grey-500` #b3b3b3 | no foreground token that faint; `stroke-strong` shares the value but names a line |

The last is the real gap: the app has three levels of foreground text and the semantic
tier has two.

**The `@variant dark` block grew from 10 colours to 33**, which `tools/figma-plugin`'s
`sync-tokens.mjs` reads with no allow-list. The new names reach Figma on their own.

## What this retires

[ADR 0010](0010-design-tokens-as-a-shared-package.md), Context, second paragraph:

- "`theme.css` ships a `prefers-color-scheme: dark` block marked `@TODO Set this to
  the actual values` whose values are the light ones." **False since `9d4d922`** —
  the block is empty. The conclusion drawn from it, that the dark palette is this
  repo's to decide, is unchanged and is why `palette.js` still exists.
- "`palette.js` in this repo assigns every grey by the role it plays in the majority
  of its uses, and records why an inverted scale would be wrong." **False since this
  ADR.** It assigns a value per semantic role, and the argument about the grey scale
  is upstream's answer now, not ours.

Both are struck through in place. The decision 0010 records — that the package is the
shared one and the app writes nothing — is untouched.
