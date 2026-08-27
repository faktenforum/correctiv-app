# @correctiv/design-tokens

The CORRECTIV design tokens, resolved into shapes a program can use: two complete
colour palettes, the spacing and type scales in px, radii, durations, and
`theme.css` as a string for embedding.

The source of truth is `tokens/theme.css` at the repo root — vendored from
[correctiv/wp-design-tokens](https://github.com/correctiv/wp-design-tokens), see
[tokens/README.md](../../tokens/README.md). Nothing here is authored by hand except
`palette.js`.

No UI framework, no platform SDK, no dependencies — the same rule
[`@correctiv/app-core`](../app-core/README.md) lives by, for the same reason.

## Who consumes it

| Consumer | Uses |
|---|---|
| `apps/mobile-rn` | the typed constants (via `src/lib/theme`), the reader CSS, and the Tailwind map the generator writes into the app |
| CORRECTIV WordPress CMS | the typed constants — *next*, not yet wired up |

```ts
import { colors, colorsDark, spacingPx } from '@correctiv/design-tokens/tokens.generated';
import { READER_DARK_CSS, THEME_CSS } from '@correctiv/design-tokens/reader.generated';
```

Subpath imports, as above, so that reading one colour does not also pull in the
reader's embedded copy of `theme.css`. `src/index.ts` re-exports both and explains
what the package deliberately leaves to its hosts — font families and the Tailwind
v3 theme map, which are React Native facts, not token facts.

## Layout

```
palette.js             the dark values and the two fixed role colours, hand-written
scripts/generate.mjs   the generator
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

That writes all three artefacts, `apps/mobile-rn/tailwind.tokens.generated.js`
included — one pass over `theme.css`, so the two colour schemes cannot be parsed
twice and disagree.

**Generated files are never hand-edited.** They carry a header saying so.
`apps/mobile-rn/__tests__/tokens.test.ts` regenerates them and byte-compares on
every CI run, so a hand edit — or a token change without a regeneration — is a
failed PR rather than silent drift.
