# CORRECTIV App — agent rules

Only what you cannot read off the code. Architecture and history live in
[`ARCHITECTURE.md`](ARCHITECTURE.md), [`TROUBLESHOOTING.md`](TROUBLESHOOTING.md) and
[`adr/`](adr/README.md) — go there when you need them, not before.

## Where code goes

One core, two app hosts. **Behaviour belongs in `packages/app-core`**: the model, the
parsers, the services, the caches and all of the state. What stays in an app is its
screens, its store binding, and one file implementing the core's four ports
([ADR 0006](adr/0006-one-core-two-hosts.md)).

- Adding a feature? Ask first whether the part you are writing is a screen. If it is
  not, it goes in the core, and both apps get it.
- The core imports **no** UI framework and **no** platform SDK.
  `packages/app-core/test/boundary.test.ts` will fail you and name the file.
- If the core needs a platform capability, declare a port in `src/ports/index.ts` and
  let each host implement it. Do not widen an allow-list.
- Derived state is an **exported selector taking state**, never a store method — a
  method reads past Vue's dependency tracking and the template silently stops
  updating.

`apps/mobile-rn` (Expo) is the app going forward; `apps/mobile` (NativeScript) is
being replaced but is **not** frozen — it is still the more complete UI and the
reference to port from. Keep both compiling.

`docs/` is a generated design mockup, not app source.

## Checks

- `npm run check` at the root = typecheck + lint + format + test, about ten seconds.
- Linter and formatter are `oxlint` / `oxfmt`. Do not introduce eslint or prettier.
- Root scripts run the **Expo** app (`npm run android`, `npm run web`). The
  NativeScript ones are prefixed `ns:`.

## A green check is not evidence

Five defects reached a branch past a green build, typecheck and test run: a webview
that does not exist on web, a dev bundle that died before rendering, a 404 on every
dynamic route, a startup crash from a duplicated React, an empty article list. Each
was found by opening the app in a browser; none by CI.

So after touching a route, a bundle-level config or anything platform-split, build the
web export and look at it: `npm run build:web`, then serve `apps/mobile-rn/dist/`
**with clean-URL mapping** (`/artikel` → `artikel.html`). A plain
`python3 -m http.server` renders Expo Router's unmatched-route page, which looks
exactly like an app bug.

Extracting text is the weak version of this. `uiautomator dump` and
`document.body.innerText` prove the right words are on screen and nothing about how it
looks — nine further defects hid behind exactly that, among them a video card grown
into a full-screen black rectangle. So after touching layout, **take a screenshot and
look at it**: `screens/tools/tour-android.sh` walks a build on the emulator, and
`screens/README.md` holds the three versions side by side with what the last
comparison found.

Touching the core's behaviour reaches both apps. The Expo one you can see in a
browser; the NativeScript one needs the emulator, or an explicit note that it was not
checked there.
