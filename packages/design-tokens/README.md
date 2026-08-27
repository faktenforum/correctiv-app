# @correctiv/design-tokens

The CORRECTIV design tokens, resolved into shapes a program can use: a Tailwind v4
theme carrying two complete colour palettes, the same values as typed constants in
px, and `theme.css` as a string for embedding in the article reader.

The source of truth is `tokens/theme.css` at the repo root — vendored from
[correctiv/wp-design-tokens](https://github.com/correctiv/wp-design-tokens), see
[tokens/README.md](../../tokens/README.md).

Three files are written by hand — `palette.js`, `scripts/generate.mjs` and
`src/index.ts`. Everything else here comes out of the generator and is never edited:
`npm run tokens` would overwrite the edit, and the drift check in
`apps/mobile-rn/__tests__/tokens.test.ts` fails the build if it does not. Note that
the two CSS files are generated despite not being named `*.generated.*` — their
names are the import paths a consumer writes.

No UI framework and no platform SDK — the same rule
[`@correctiv/app-core`](../app-core/README.md) lives by, for the same reason. This
package additionally has no dependencies at all, which app-core cannot claim: it
carries an HTML parser for its DOM extraction backend.

## Who consumes it

| Consumer | Uses |
|---|---|
| `apps/mobile-rn` | `theme.css` (through Uniwind), the typed constants via `src/lib/theme`, and the reader CSS |
| CORRECTIV WordPress CMS | `theme.standalone.css` — *next*, not yet wired up |

```css
/* An app whose bundler already defines the light/dark variants — i.e. Uniwind. */
@import '@correctiv/design-tokens/theme.css';

/* Anything else on Tailwind v4: same tokens, variant definitions included. */
@import '@correctiv/design-tokens/theme.standalone.css';
```

The class half of the switch reads `:where(.dark, .dark *)`, which compiles against
`:scope` — the **root element**. A `dark` class on `<body>` does nothing; it has to
be on `<html>`. Worth knowing before reaching for `body_class()`, because the
`prefers-color-scheme` half keeps working either way, so a toggle would fail while
the automatic path looked fine.

That the standalone file actually works for a consumer with no Uniwind is checked
on every PR: `apps/mobile-rn/__tests__/design-tokens-standalone.test.ts` compiles it
with plain Tailwind and asserts the colour utilities appear and both dark paths carry
the dark values. It is there because this file has already been wrong twice, and
neither time was loud — see the test's own header.

Two files because `@variant light { … }` is an error unless something has defined
that variant. Uniwind defines it, so the app must not define it a second time and
shadow Uniwind's own; a plain Tailwind v4 build defines nothing, so the standalone
file brings its own. Importing `theme.css` alone into a plain v4 build fails with
`Cannot use @variant with unknown variant: light` — which is how this was found.

```ts
import { colors, colorsDark, spacingPx } from '@correctiv/design-tokens/tokens.generated';
import { READER_DARK_CSS, THEME_CSS } from '@correctiv/design-tokens/reader.generated';
```

Subpath imports, as above, so that reading one colour does not also pull in the
reader's embedded copy of `theme.css`. The `exports` wildcard names the `.ts`
extension — unlike `@correctiv/app-core`'s, which does not. That package is only
ever resolved by Metro and by this repo's own `tsconfig` paths, both of which guess
the extension; this one is meant to be read from outside the repo, where nothing
guesses and an extensionless target is simply a file that does not exist.
`src/index.ts` re-exports both and explains what the package deliberately leaves to
its hosts — the loaded font family names, which are React Native asset names rather
than token facts.

## Layout

```
palette.js                the dark values and the two role colours, hand-written
scripts/generate.mjs      the generator
theme.css                 the Tailwind v4 theme — what the app imports
theme.standalone.css      the same, plus the light/dark variant definitions
src/tokens.generated.ts   typed constants
src/reader.generated.ts   theme.css as a string, plus the dark override block
src/index.ts              the barrel, and the boundary explained
```

`palette.js` exists because `theme.css` ships a dark block that is a placeholder
holding the light values. It records how each grey was assigned by role, and why an
inverted scale would be wrong. Read it before adding a colour.

## Regenerating

```bash
npm run tokens          # from the repo root
```

That writes all four artefacts in one pass over `theme.css`, so the two colour
schemes cannot be parsed twice and disagree. Nothing is written outside this
package.

**Generated files are never hand-edited.** They carry a header saying so.
`apps/mobile-rn/__tests__/tokens.test.ts` regenerates them and byte-compares on
every CI run, so a hand edit — or a token change without a regeneration — is a
failed PR rather than silent drift.
