# Design tokens (vendored)

The binding source of truth for colours, spacing and type, copied from
**[correctiv/wp-design-tokens](https://github.com/correctiv/wp-design-tokens)**.

| | |
|---|---|
| Upstream | `https://github.com/correctiv/wp-design-tokens` |
| Commit | `501ee105a35db74c8ad2de7abd46449ff8da11fb` (tag `v0.1.1`) |
| Upstream licence | GPL-2.0-or-later — compatible with this repo's AGPL-3.0-or-later |

## Why vendored, and not a submodule or an npm dependency

- **npm dependency is not available.** The package declares
  `peerDependencies: { tailwindcss: ">=4.1" }`, but NativeWind v4 requires
  Tailwind v3 (`tailwindcss@3.4.19` is what the tree resolves). Installing it
  anyway needs `--force` or a repo-wide `legacy-peer-deps`, i.e. either a
  recorded conflict or peer checking switched off for all ~940 packages.
- **A submodule is more apparatus than 11 KB of CSS deserves.** It would put a
  `--recurse-submodules` requirement on every clone and a `submodules: true` on
  every CI checkout, to deliver two files that change a few times a year.
- **The apps never needed the source at all.** Everything derived from these
  files is generated and committed, which is why the app renders correctly on a
  fresh clone. The source is needed for exactly two things: regenerating, and
  detecting drift.

Vendoring gives both of those everywhere — including CI, where the drift check
used to skip itself — at the cost of having to notice upstream changes by hand.
That trade is recorded below.

## What is here, and what reads it

| File | Consumed by |
|---|---|
| `theme.css` | `apps/mobile-rn/scripts/generate-tokens.mjs` and `apps/mobile/scripts/sync-tokens.mjs`, both via `scripts/tokens-source.mjs` |
| `typography.css` | **nothing, programmatically.** Hand-transcribed into `apps/mobile-rn/src/lib/theme/typography.ts` and `apps/mobile/src/styles/typography.scss` |

`utility.css` exists upstream and is deliberately not vendored: nothing in this
repo reads or mirrors it.

Both files are kept **byte-identical** to upstream — no added header — so that a
plain `diff` against a fresh checkout is meaningful, and because `theme.css` is
embedded verbatim into the reader WebView via `readerCss.generated.ts`.

### Known gap

`typography.css` is mirrored by hand in two places, so drift there is invisible
to the checks. It is vendored anyway to make the reference reviewable in-repo and
to leave the door open for a generated typography scale later.

## Updating

```bash
# 1. Has upstream moved? Compare against the commit recorded above.
git ls-remote https://github.com/correctiv/wp-design-tokens.git HEAD

# 2. Copy the files in (from any checkout of the token repo), then:
npm run tokens                     # regenerates apps/mobile   (SCSS)
npm run tokens -w @correctiv/mobile-rn   # regenerates apps/mobile-rn (3 artefacts)

# 3. Update the commit in the table above, and commit source + generated
#    files together.
```

Step 2 is not optional: `apps/mobile-rn/__tests__/tokens.test.ts` regenerates
and byte-compares, so a token change without regeneration fails CI. That is the
check the vendoring exists to make possible.
