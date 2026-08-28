# CORRECTIV App, agent rules

Only what you cannot read off the code. Follow the links; do not restate them here.

- [ARCHITECTURE.md](ARCHITECTURE.md), core, ports, colour, where things live
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md), the traps, and **why a green check is not evidence**
- [adr/](adr/README.md), the decisions, and which of their claims have expired

## Where code goes

Behaviour goes in `packages/app-core`. The app holds screens, its store binding and
one file implementing the ports. Ask whether what you are writing is a screen; if
not, it belongs in the core. That the app is currently the only host is not a reason
to relax this, because the core is what survived the last change of view layer. The
core imports no UI framework and no platform SDK, so needing a platform means
declaring a port, not widening an allow-list. Derived state is an exported selector
taking state, never a store method.
([ADR 0006](adr/0006-one-core-two-hosts.md))

`apps/mobile` is the app. Its web export is published on every push to `main`, so
anything that lands there is public.

Colours come from classes (`bg-grey-100`), which follow the appearance setting on
their own. Reading a colour in TypeScript needs `useColors()`, or it is pinned to
light. `always-light` and `always-dark` are the exceptions and mean it.

## Decisions

`adr/` records **why**, not what. Add one when a choice would otherwise have to be
argued from scratch later: a dependency swapped, a boundary moved, a capability
measured and rejected. Not for ordinary work, and not for anything the code already
says.

**Keep them current, and only where it matters.** An ADR is a record, so it is never
rewritten to look right in hindsight. The reasoning is the part worth having, even
when the conclusion has moved on. When a later decision voids a claim in an earlier
one, strike that claim through where it stands, add one clause saying what voided it,
and link the ADR that did. Leave the argument around it intact. The newer ADR carries
a section naming every statement it retires, so the two halves cannot drift apart.

Do not strike through a claim that is merely old. Only one that is now **false**,
where someone reading it would act on it and be wrong.

## Language

English for everything a developer reads: code, comments, test names, CLI output,
commits, PRs, `.md`. German, formal *Sie*, for everything a user reads, and only
there. The codebase is fully English as of 2026-08-12, so a German comment now is a
regression, not a leftover.

User-facing text goes in one obvious place per screen, not interpolated through the
markup. Multilingual support is under consideration.

German typography, not English: quotation marks are „…“, and the em dash does not
appear at all. Where a sentence wants a break, use a comma or a full stop; the
Halbgeviertstrich – belongs only where neither will do. English prose quoting a
German label takes straight quotes on both sides.

## Checks

`npm run check` at the root: typecheck, oxlint, oxfmt, tests, about ten seconds. Do
not introduce eslint or prettier.

**A green check proves nothing about how the app looks or whether it runs.** After a
route, a bundle config or a platform split, run `npm run build:web`, then
`node screens/tools/serve-clean.mjs apps/mobile/dist 8099` and open it. A plain
static server maps no clean URLs and makes a working app look broken. After layout,
screenshot it and look (`screens/tools/tour-android.sh`, compared against
`screens/`), or open `/preview.html`, which frames the web target at a phone or
tablet size. Anything touching colour has to be seen in **both** appearance settings
*and* with the setting on "System" against a dark device. That last combination is
the app's default and is the one that has already shipped broken.
