# CORRECTIV App — agent rules

Only what you cannot read off the code. Follow the links; do not restate them here.

- [ARCHITECTURE.md](ARCHITECTURE.md) — core, ports, colour, where things live
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) — the traps, and **why a green check is not evidence**
- [adr/](adr/README.md) — the seven decisions

## Where code goes

Behaviour goes in `packages/app-core`; the app holds screens, its store binding and
one file implementing the ports. Ask whether what you are writing is a screen — if
not, it belongs in the core. That the app is currently the only host is not a reason
to relax this: the core is what survived the last change of view layer. The core
imports no UI framework and no platform SDK; needing a platform means declaring a
port, not widening an allow-list. Derived state is an exported selector taking state,
never a store method. ([ADR 0006](adr/0006-one-core-two-hosts.md))

`apps/mobile-rn` is the app. Its web export is published on every push to `main`, so
anything that lands there is public.

Colours come from classes (`bg-grey-100`), which follow the appearance setting on
their own. Reading a colour in TypeScript needs `useColors()`, or it is pinned to
light; `always-light` / `always-dark` are the exceptions and mean it.

## Language

English for everything a developer reads: code, comments, test names, CLI output,
commits, PRs, `.md`. German, formal *Sie*, for everything a user reads — and only
there. The codebase is fully English as of 2026-08-12; a German comment now is a
regression, not a leftover.

User-facing text goes in one obvious place per screen, not interpolated through the
markup — multilingual support is under consideration.

## Checks

`npm run check` at the root: typecheck + oxlint + oxfmt + tests, ~10 s. Do not
introduce eslint or prettier.

**A green check proves nothing about how the app looks or whether it runs.** After a
route, a bundle config or a platform split: `npm run build:web`, then
`node screens/tools/serve-clean.mjs apps/mobile-rn/dist 8099` and open it — a plain
static server maps no clean URLs and makes a working app look broken. After layout:
screenshot it and look
(`screens/tools/tour-android.sh`, compared against `screens/`), or open `/preview.html`,
which frames the web target at a phone or tablet size. Anything touching colour has
to be seen in **both** appearance settings — half the palette is invisible in the
other one.
