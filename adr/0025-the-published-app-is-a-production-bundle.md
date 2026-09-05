# ADR 0025 — The published app is a production bundle, and the workbench gives up its handle

Status: accepted, 2026-09-05.

## Context

[ADR 0024](0024-the-handbook-owns-the-root.md) publishes the app one directory below
the handbook, at `/app/`, and `apps/mobile/app.config.js` turns `EXPO_BASE_URL` into
`experiments.baseUrl` so that Expo Router knows about the prefix.

The workbench's most useful panels need the app's dev handle: the appearance setting
is written through the app's own store, and the inspector reads that store back. A
production export sets `__DEV__` false, the app leaves no handle, and both panels are
inert on the very site they are published to. So `build:web` was given `--dev`, the
deploy asserted the handle was present, and for a while this looked like a cheap win:
a third more JavaScript, and React's development warnings, in exchange for a
debuggable published demo.

## What the trade actually was

A development bundle applies `experiments.baseUrl` to asset URLs and **not to route
matching**. Every route under the base falls through to the app's own 404.

What made it hard to see is that the door still renders. `apps/mobile/src/app/_layout.tsx`
draws the sign-in door outside the router, so a signed-out visitor sees a working app,
and only somebody past the door sees anything else. Every check the deploy runs was
green, every screenshot taken of the published site was of the door, and the app was
broken for everybody it is for.

Measured on 2026-09-05, one URL and one fixture, three builds:

| build | base | signed in at `/app/entdecken` | dev handle |
| --- | --- | --- | --- |
| `--dev` | `/app` | the app's own 404 | present |
| `--dev` | `/correctiv-app/app` | the app's own 404 | present |
| production | `/app` | Entdecken renders | absent |

The live site at the time, built from `main` before this change, served the app at the
site root with base `/correctiv-app` and a production bundle, and rendered Entdecken
correctly. So this is not about the depth of the base path and not about Pages. It is
`--dev`.

## Decision

`build:web` exports production. `pages.yml` fails the deploy when the bundle carries
`__correctiv`, because the handle is the tell for a `--dev` export and the assertion is
therefore the inverse of the one it used to make.

The published workbench has no store handle. It says so, on the panels that need one
and in the status line, which is what it did before `--dev` was tried and is the
behaviour `Readout` and `NeedsDev` were written for.

## What this costs

The appearance control and the inspector work against a local dev server and not
against the published site. Everything else the workbench does needs no handle and
holds on Pages: the device frame, the route field, the storage fixtures, the console,
the palette overrides and the measure checks.

The same limit applies to the dev server, which is a development bundle by definition.
Locally the frame reaches the app's first screen and no further, so the route field is
a desktop convenience there rather than a way to walk the app. `TROUBLESHOOTING.md`,
"The web target", carries the measurement.

## What would change this

A second export. Publishing a production app at `/app/` and a development one beside
it would give the workbench a handle to talk to without breaking the app anybody
opens, at the cost of a second bundle in the artifact and a switch in the shell. That
is a real option and it is not taken here, because the published site is a demo first.

## What this retires

Nothing in an earlier record. [ADR 0014](0014-the-preview-shell-as-a-package.md)'s
note that `expo export` sets `__DEV__` false and the published demo therefore has no
handle is true again, and its open question, whether a `?debug` escape hatch should
expose the handle in an export, is still open and still undecided.
