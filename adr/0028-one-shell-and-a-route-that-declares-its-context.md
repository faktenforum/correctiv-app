# ADR 0028 — One shell, and a route that declares its context

Status: accepted, 2026-09-11.

## Context

`apps/handbook/src/App.tsx` was one 330-line component that special-cased the
workbench seven times: `isApp`, `APP_VIEW`, `useWorkbench(isApp)`, a ternary for the
toolbar, one for the tools panel, one for the status bar, and `onFull`. What the
right sidebar held was decided by two booleans (`contents !== null`, `isApp`), and
whether it was open lived in a `useState` that forgot on every navigation — except on
`/workbench`, where `workbench/store.ts` wrote it to the hash under `tools`. Which
inspector panels were open was local to `workbench/ui/Panels.tsx` and reached no link
at all.

Three consequences, and none of them is cosmetic.

**The shell learned what a view had after the view had rendered it.** `useSections`
reads the headings a page put in the DOM, so "is there a contents list" was answered
one commit late. The toggle appeared, then the panel had something in it.

**The workbench was a second site inside the first.** Every part of it that was not
the frame — its controls, its panels, its readout, its link — reached its place
through a branch in `App.tsx` written for it by name. A second view wanting a context
bar would have been an eighth branch.

**Everything about the panel was unshareable.** Opening the console from a warning
count, opening the props of a component, opening a document's contents: none of it
was in the address, so none of it could be handed to anyone. On `/workbench` it was,
which is the proof that it was worth having.

Beside that, `/components` listed all 45 components of `apps/mobile` and drew them by
booting the whole app in an iframe, three at a time. [ADR 0027](0027-the-handbook-draws-the-apps-components.md)
measured the other way of drawing them and shipped two as proof; this is the page
built around that measurement.

## Decision

**The route declares, and the page fills.**

`apps/handbook/src/shell/views.ts` is a table, one row per view kind. It names the
right panel's sections in order, which of them start open, whether the panel starts
open, what the panel is called, how wide it docks, whether the view fills the
header's context bar, whether it owns the status line, whether `full=1` means
anything on it, and what happens to all of that below the wide breakpoint. It is pure
data and imports no React, so `test/shell.test.ts` reads it without pulling the page
tree in.

`apps/handbook/src/shell/slots.tsx` is how a page fills what the route declared. The
shell renders a target element for every slot the declaration names; the page renders
its content **through a React portal into that target**, from wherever in its own
tree suits it.

Portals rather than a page returning a `{ sections }` object, for one reason that is
not style: **a page's state has to stay in one tree.** `/components`' filter query is
read by the header's bar and by the grid. `/design`'s "loaded" flag is read by the
main area and by the reload button in the context bar. The component route's
rendering switch is read by the panel and by the stage. With a portal each of those
is an ordinary `useState` in the page, and React context crosses a portal unchanged.
And the shell still knows whether a panel exists before the page's first render,
because that comes from the table.

A section's badges are a slot of their own, `<id>:tags`, because they stay visible
while the section is shut — "0 warnings" is worth reading without opening the console
— and because the trigger that carries them is the shell's chrome.

### The address, on every route

`apps/handbook/src/shell/address.ts` owns the hash everywhere, in one grammar:

```
#<head>?<params>
   head    an app route on /workbench (`/artikel`), a heading id on a document
           (`the-four-ports`), empty elsewhere
   params  tools=1|0   the panel, written only when it differs from the default
           open=a,b,c  the open sections, same rule
           full=1      chrome gone, only where the view can go full
           + everything the open view keeps, passed through untouched
```

**The two halves cannot collide**, which is what lets one grammar serve both: an app
route starts with `/` and a heading id never does, because `plugin/markdown.ts`'s
`slug()` strips everything but letters, digits, spaces and hyphens.

**A parameter is written only when it differs from the view's declared default.**
That is what keeps a document clean — a reader who toggled nothing keeps a plain
`#the-four-ports`, and the link most people paste is what it was before this change —
and it is what makes a stale parameter harmless, because what the hash says is re-read
against the new view's defaults rather than carried over.

**What it costs, and the two halves of the answer.** `#the-four-ports?tools=1` is not
an anchor the browser scrolls to, because the fragment is no longer an element id. So
the site scrolls itself. That was already half true: `router.tsx` has always scrolled
by `getElementById` after an in-site click, because the target does not exist until
the route has rendered. `App.tsx` adds the other half, on load and on a step through
history, keyed on route and head together so that toggling a panel does not throw the
reader back up the page.

And a hash that says nothing does not shut the panel. Following a link inside a
rendered document sets a bare `#the-four-ports` with no `?`; parsed against the
defaults that would close a panel somebody had opened, so what they last asked for is
held and put back with `replaceState` — which does not scroll, and the browser has
already scrolled on the click.

Every write is `replaceState`. Toggling a panel is not a place to come back to, and a
back button that walked through six panel states is a back button nobody can use to
leave the page.

### Two defaults that look inconsistent and are not

**`/workbench` opens shut**, although it is the view with the most tools on it.
`RELEASE.md` hands out that address to people who want to see the app, and `tools=1`
exists precisely so somebody debugging can opt in and send the opened state as a
link. **`/design` and `/components/<group>/<name>` open open**, because a reader
arrives at those to use the panel rather than to look past it: the design page's main
area is a Figma frame and everything else about it is in the sections, and the
component page's props are the second thing anybody came for.

### Below 1024, the context is the page

`WIDE` stays `(min-width: 64rem)`, which is also `HOST_BELOW` in `workbench/devices.ts`,
so the shell's line and the device line are one number.

A `narrow: 'drawer'` view keeps today's sheet. A `narrow: 'page'` view — design,
component, workbench — has no panel and no drawer at that width: the sections are
rendered inline after the page, at the column's full width, and the header's toggle
is hidden because there is nothing to toggle. Where the main area is a frame, it
shrinks to a button that sets `full=1`.

The workbench is the exception inside the exception, and it is declared rather than
special-cased: `fullWhenNarrow` is true for it alone, because that is what it has
always done below 1024 — the header, the rail, a sidebar and a status line are most
of a 390px screen, and the app is what the link was for.

### The frame moves to the component's own page

`/components` draws **no frames at all**. Each card draws the component itself, in
this site's React tree, when the reader presses Draw.

The reason is a mechanism and not a taste. **A drawn component takes the space its
content needs; a frame always carries a viewport.** A card of roughly 300px would
have to scale a 393pt device window down, the way `workbench/ui/Stage.tsx` already
does, and show a shrunken phone with a component somewhere on it instead of the
component. On `/components/<group>/<name>` the relation inverts: the frame has room,
the device size becomes a real choice again, and `workbench/devices.ts` already holds
the presets for it. That is also the panel's second justification — props, source,
device size and the rendering switch all belong on the right.

The three-frame cap and the "load all" control went with the frames; `src/lib/rows.ts`
and its test are deleted.

**Nothing compares the two renderings and nothing should.** Screenshot diffing is the
flakiest thing in CI, and a check that reddens without cause gets switched off. Where
they disagree the app's bundle is right (ADR 0027), and the disagreement is a finding
for a person.

### The registry's roster is the app's own catalogue

ADR 0027 shipped `src/components/direct.tsx` with two entries typed out by hand, each
importing its component by file so the `ui` barrel's dependencies stayed out of the
bundle. That was right for a proof and wrong for a page: writing specimens for
forty-five components here would be a second answer to "what does this component look
like", and the copy nobody edits.

So the registry imports `CATALOGUE` from `apps/mobile/src/gallery/catalogue.tsx`. It
already says what every component is shown with, in the props' own words, with the
awkward cases deliberately in it, and the app's own
`__tests__/gallery-catalogue.test.ts` fails when a component is missing from it —
a guarantee a list in the handbook could not have.

What the handbook adds is the one thing the app cannot know: which of those entries
its React tree can actually mount. That is `NOT_DRAWN` in `src/components/direct-ids.ts`,
**a list of exceptions rather than of members**, each with the reason in the words the
card prints.

**Measured on 2026-09-11, and the list is empty.** All 45 entries draw. Two things
were needed and both are one line:

| missing | what threw | components affected |
|---|---|---|
| a redux `Provider` | react-redux refuses rather than degrading | everything that selects from a slice |
| a `SafeAreaProvider` | `useSafeAreaInsets` refuses rather than defaulting | `LoginGate`, `RecoveryScreen`, `Screen`, `ScreenHeader`, `SafeAreaView` |

The store is `apps/mobile`'s own instance, `coreStore`, not a second one, so the
components' bound actions are bound to the store they read. The insets are stated as
zero rather than measured, because a page has no notch and a provider that measures
its own box renders nothing until it has an answer. Nothing else is stubbed: not the
router, not the webview, not the ports — `packages/app-core`'s default platform is
`createMemoryPlatform()`, so a thunk that reaches for storage gets an empty answer
instead of throwing.

The cost is the one ADR 0027 named as a finding about `apps/mobile`: the catalogue
imports `@/components/ui`, so this bundle now carries `@expo/vector-icons` and
`expo-image`. The site's bundle went from 1,392 kB to 2,514 kB (gzip 436 to 701),
plus the icon fonts as separate assets. That is paid knowingly — every one of the
forty-five is drawn here, so every one of them is needed anyway — and the alternative
was a second catalogue.

### A visible way past the app's door (issue #112)

`holdTheDoorOpen` in `workbench/frame/seed.ts` already wrote an admitted session
before a frame booted, because the app's root layout renders `LoginGate` **instead of**
the router until the session carries an entitlement. What [issue #112](https://github.com/faktenforum/correctiv-app/issues/112)
asks for beyond that is that the bypass be **visible** and **greppable**, and that it
cannot reach a production build.

- It writes an account named `Handbuch` rather than a plausible person, so the
  profile screen says where the session came from without anybody knowing this file
  exists.
- It writes one key, `handbook:seeded`, outside the app's own two prefixes —
  `persist()` writes back only the keys a slice declares, so anything invented under
  `kv:store.` is dropped on the app's first write.
- `apps/mobile/src/gallery/Gallery.tsx` prints one line when that key is present:
  "Session seeded by the handbook, not signed in."
- Choosing a storage fixture takes the mark away with everything else, because a
  fixture is a whole state.

**No `__DEV__` branch anywhere**, and that is deliberate: ADR 0025 measured that a
route component returning `null` outside a development build is still pre-rendered
into the export as a blank public page, so guarding a component is not the same as
keeping something out of a build. What keeps the bypass out of production is simpler
than a flag — **it is not in the app**. `holdTheDoorOpen` is the handbook's code, and
`test/workbench/seed.test.ts` fails if the string ever appears under `apps/mobile`.
The same test holds the key's two spellings against each other, which is the fact
that would otherwise rot: two files, one string, and a rename in either would leave a
bypass with no marker.

The issue's open question, "where the switch lives", is answered as: in the
handbook's frame, not in the app's settings.

## Why not the alternatives

**Leave the workbench special and give the other views their own layouts.** Cheapest,
and it is what was there. It fails at the second view that wants a context bar, which
arrived in this same change: `/components` and `/reference` both have a filter that
belongs in the header, and `/design` has two frame controls. Three copies of a branch
written by name is where a shell stops being one.

**A page returns its sections as data.** Tidier to read and it cannot carry state: the
filter in the header and the grid below it are one query, and passing a rendered
`ReactNode` up to the shell would either duplicate the state or lift it into `App.tsx`,
which is where it was and is what this change is undoing.

**Keep the panel state in React and out of the URL.** It is what every view except
the workbench did. The workbench is the counter-example: `tools=1` is the difference
between the link `RELEASE.md` hands out and the link somebody sends a colleague to
show them a console error, and that difference is worth having on a document's
contents and on a component's props too.

**Put the device frame on the card, and the drawing on the detail page.** The
mechanism above settles it: a frame on a card is a phone at forty per cent with the
thing you asked about somewhere inside it.

## What it costs

**A page can now write a slot the route did not declare, and it draws nothing.** In
development it warns once; in CI `test/shell.test.ts` reads every page as text,
collects its `<Slot id="…">` literals and fails on one the table has no place for, as
well as on a declared section nobody fills. That is a string-matching test and it is
the honest kind here: the alternative is rendering eleven pages in a test runner to
ask a question about a portal.

**A section's content is mounted while the section is shut.** Radix unmounts a closed
collapsible's children, which would take the slot's target with it — and with the
target gone the page's `Slot` renders nothing, so the console's level filter and the
component route's device choice would reset every time somebody collapsed the section
they live in. `forceMount` plus `hidden` keeps them; `hidden` is `display: none`, so
a shut section is out of the accessibility tree either way.

**The workbench's state and the shell's address meet in exactly one file.**
`pages/Workbench.tsx` writes the frame's half into `rest` and `workbench/store.ts`
reads the hash back on `hashchange`. There is no loop to guard against, because
`shell/address.ts` writes with `replaceState` and that fires no event: only a person
editing the address bar, or a step through history, reaches the listener.

**One address with more than one writer needs a rule, and it cost two defects to
find it.** Both were invisible to every check and both were found by wrapping
`history.replaceState` and reading the trace.

- A patch used to be merged onto the address as the last *render* left it, so two
  writes inside one tick — the frame moving and a reader collapsing a section —
  made the second carry the first's old value. Collapsing Console while the app
  navigated left `open=` out of the URL and the section open on screen.
- The reconciling effect that puts held panel state back after a plain anchor
  click used to run on every address, and a parent's effects run *after* its
  children's: holding the first render's address, it wrote the empty string over
  what the page had just written. On `/workbench` at 390px that wiped the `full=1`
  the view asks for at that width, so the app opened with its chrome on a phone.

The rule: a patch lands on what the last patch left, whether or not React has
rendered in between; and the reconciler acts only on a hash it actually parsed and
only when that hash carries no parameters at all.

**`tools` and `full` left `PreviewState`.** They were always the two fields in it that
were not about the frame. `workbench/state.ts` is `fromAddress`/`toAddress` now
instead of `parseHash`/`writeHash`, and `store.ts` lost its `owning` flag and both of
its `history.replaceState` calls — the flag existed only because the hash belonged to
other views while they were open, and the shell owns it on all of them now.

## What is still open

**The "Drawn here" filter currently filters nothing**, because `NOT_DRAWN` is empty
and all forty-five draw. It is kept because it is the control that finds the
minority whichever way the number goes, and the count beside it — "45 folders, 47
components, 47 drawn here" — is computed rather than typed, so the page never claims
a number it did not count. If the list stays empty for long, the segment is the thing
to delete, not the mechanism behind it.

**The status line's default is one line of prose and one exception.** `/design`
appends the commit it was built from, because that is a fact about the current view;
every other non-owning view says where it is. A third such exception would be the
signal that the status line wants a declaration of its own.

**Fonts are still open**, unchanged from ADR 0027: a drawn component's sizes, weights
and line heights are the app's and its typeface is the browser's fallback.

**Two components fetch on mount and fail by CORS in a browser** — `LiveBanner` asks
icecast for the station status and an article row asks correctiv.org for a reading
time. Both degrade exactly as they do in the app, and both log an error in the
console while doing it. That is the app's own behaviour made visible rather than
anything this page introduces, and it is a reason to read
TROUBLESHOOTING.md's "Data sources" before reading the console on this page.

## What this retires

[ADR 0027](0027-the-handbook-draws-the-apps-components.md), two claims, **struck in
place**:

- Its context, "three at a time (`src/lib/rows.ts` says why three)". There are no
  frames on that page at all now and the file with the cap in it is deleted. The
  observation around it — that a frame always carries a viewport, so `Hairline` in
  one is a phone with a line somewhere on it — is the reason for both records and is
  untouched.
- Its decision, "`ui/Card` and `ui/Hairline` ship in it, which is the proof and
  nothing more" and "the components page that is built around this … is the next
  change and is not here". This is that change. The registry's roster is the app's
  own catalogue and the two hand-written entries are gone; the argument above them,
  that the registry is the measurement rather than a description of one, is why the
  exceptions are a list and not a manifest, and is untouched.

**Two comments in the code**, both deleted with the thing they described:
`App.tsx`'s "that parameter predates this shell", about `tools` — it is every view's
parameter now — and `workbench/ui/Panels.tsx`'s "which panels are open is local to
this component rather than part of `PreviewState`", which was the whole of what
`open=` in the address replaces.

**`TROUBLESHOOTING.md`**, one sentence rewritten rather than struck, because it is a
living document: "`/components` draws each component in its own frame" is now
`/components/<group>/<name>`. Everything the entry says about `about:blank`, the
poll and the two readings of a frame's address is unchanged and is what
`AppFrame.tsx` still does.

**Nothing in [ADR 0014](0014-the-preview-shell-as-a-package.md) or
[ADR 0024](0024-the-handbook-owns-the-root.md) is affected, and both were read for
it.** 0014's same-origin argument is why any of this works and is untouched; its
capability table is a list of property accesses across a frame boundary and none of
them moved. 0024's "the shell is a route of `apps/handbook` now, `/workbench`" is
more true after this change than before it, not less: what this ADR removes is the
seven branches that made that route behave like a separate application while being
one. Neither ADR claims the workbench is its own shell — 0014 says the opposite, that
it is not a host — so there is nothing here to strike.
