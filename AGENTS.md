# CORRECTIV App — agent rules

Only what you cannot read off the code. Follow the links; do not restate them here.

- [ARCHITECTURE.md](ARCHITECTURE.md) — core, hosts, ports, where things live
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) — the traps, and **why a green check is not evidence**
- [adr/](adr/README.md) — the six decisions

## Where code goes

Behaviour goes in `packages/app-core`; an app holds screens, its store binding and
one file implementing the ports. Ask whether what you are writing is a screen — if
not, it belongs in the core and both apps get it. The core imports no UI framework
and no platform SDK; needing a platform means declaring a port, not widening an
allow-list. Derived state is an exported selector taking state, never a store
method. ([ADR 0006](adr/0006-one-core-two-hosts.md))

`apps/mobile-rn` (Expo) is the app going forward; `apps/mobile` (NativeScript) is
being replaced but not frozen — keep both compiling. Its web export is published on
every push to `main`, so anything that lands there is public.

## Language

English for everything a developer reads: code, comments, commits, PRs, `.md`.
German, formal *Sie*, for everything a user reads. Touching a file with German
comments? Translate the parts you touch. User-facing text goes in one obvious place
per screen, not interpolated through the markup — multilingual support is under
consideration.

## Checks

`npm run check` at the root: typecheck + oxlint + oxfmt + tests, ~10 s. Do not
introduce eslint or prettier. Root scripts run the Expo app; NativeScript is `ns:`.

**A green check proves nothing about how the app looks or whether it runs.** After a
route, a bundle config or a platform split: `npm run build:web`, then
`node screens/tools/serve-clean.mjs apps/mobile-rn/dist 8099` and open it — a plain
static server maps no clean URLs and makes a working app look broken. After layout:
screenshot it and look
(`screens/tools/tour-android.sh`, compared against `screens/`), or open `/preview.html`,
which frames the web target at a phone or tablet size. Core changes reach
both apps — the Expo one you can see in a browser, the NativeScript one needs the
emulator or an explicit note that it was not checked.
