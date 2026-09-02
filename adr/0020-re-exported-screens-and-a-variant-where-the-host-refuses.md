# ADR 0020 — The desktop host re-exports the phone's screens, and varies one only where the host refuses

Status: accepted, 2026-09-02. Scoped to `apps/desktop`, which ships nothing and says so
in its first sentence. The rule recorded here is the one thing about that host no file
states: three route files differ from the phone and twenty-four do not, and *what makes
a fourth one admissible* is a decision, not something a reader can infer from three
examples.

## Context

[ADR 0006](0006-one-core-two-hosts.md) prices a host at four ports plus its own screens,
and [ADR 0007](0007-removing-the-nativescript-host.md) records that the estimate stopped
being theoretical when the NativeScript host was deleted. The GTK4 host tested the first
half and it held exactly: `src/platform/` and `src/audio/` are the whole adapter.

The second half is where the estimate misleads. "Its own screens" was true of the
NativeScript host, which had a view vocabulary of its own — but `@gjsify/react-native`
renders React Native's own names onto GTK4, so the phone's screens are already written in
this host's vocabulary. A tree of twenty-seven screens *of its own* would be twenty-seven
files drifting against a phone that changes weekly, and the drift is the quiet kind: a
route exists on the phone, is simply absent here, and the desktop build stays green while
a screen is missing.

So the screens were not written. They are re-exported, and the interesting question
became the opposite one: **when is a host allowed to keep a copy?** Left unanswered it
answers itself, once per inconvenience, and the tree that results is a fork nobody
decided on.

[ADR 0012](0012-a-list-virtualizer-for-the-unbounded-lists.md) chose `FlatList` over
`FlashList` for the sake of this host before it existed, and closed with "No gjsify
target exists in this repo. If one is ever built, three things this app does today are
not answered by `@gjsify/react-native`'s support table and would need their own
decisions". One was built. All three decisions are made, and that sentence is retired at
the end of this file.

## Decision

**The desktop route tree re-exports the phone's screens. A file varies only for a cause
it names in its own header, and there are exactly three admissible causes.**

Twenty-four of twenty-seven route files are one line:

```ts
export { default } from '@/app/(tabs)/index';
```

The three that are not, each with the cause that put it there:

1. **The ports.** `src/app/_layout.tsx` hands the core `gtkPlatform` + `gstAudio`
   instead of `expoPlatform` + `expoAudio`, and drops `import '@/global.css'` because
   that file is Uniwind's Metro entry and there is no Metro here. Everything else in it
   is the phone's file in the phone's order, so a `diff` between the two is short enough
   to read. This is ADR 0006's adapter, not a screen difference.
2. **A platform idiom an ADR already argues for.** `src/app/(tabs)/_layout.tsx` is an
   `Adw.ViewStack` + `Adw.ViewSwitcher` rather than a bottom tab bar.
   [ADR 0013](0013-native-tabs-and-a-web-tab-bar-of-its-own.md) already says each
   platform should present the tab bar in its own idiom rather than have one drawing
   stretched over all of them; a desktop window has no bottom bar, and drawing one would
   be the exact mistake that ADR argues against. The web target has a third layout for
   the same reason.
3. **An import the support table refuses.** `src/app/artikel.tsx` exists because
   `Animated` is a refusing export (gjsify ADR 0032, tier P3: a subsystem rather than a
   component, and doing it badly is worse than not doing it). There is no prop-level
   answer to an import with no implementation, so the screen renders the reader header
   without the 160 ms fade and says so at the top of the file.

**A refused *prop* is never a fourth cause**, and that exclusion is the load-bearing half
of this decision. The GTK layer refuses about 110 prop uses by name across this app, and
every one of those refusals is correct. They are answered in this order:

- **First, on the phone**, if the phone's own idiom already answers it. That is not a
  concession to the desktop host: it is usually a place where the app was inconsistent
  with itself and no other host complained.
- **Otherwise once, in `src/shims/react-native.tsx`**, which is why the build aliases the
  bare `react-native` specifier to a file of ours rather than straight to
  `@gjsify/react-native`. One deliberate answer — implemented, mapped, or dropped with
  the reason written down — instead of 110 render-time throws.
- **A variant, never.** A copy of a screen is the unit that drifts, and it drifts to
  avoid a prop that a single line in the shim would have answered for every screen at
  once.

The ordering was not theoretical when it was written down. `(tabs)/profil.tsx` rendered
three `<Typo onPress>` rows; the layer refuses `onPress` on a `Gtk.Label`, correctly,
because a label emits no `clicked`. Because the tab stack mounts all five tabs from `/`,
the uncaught `PrimitiveError` ended the whole tree: Home captured 12 848 bytes where it
had captured 92 125. The fix was rule one — wrap the rows in a `Pressable`, which is the
construction the rest of this app already uses for a tappable line of text — in the
**phone's** screen, at 93 470 bytes and no refusal in the log. A desktop variant of the
whole profile tab would have fixed the same crash, left the phone inconsistent with
itself, and added a twenty-eighth file to keep in step for ever.

## Two tests hold it, in both directions

Neither needs GTK, and both run in `npm run check`, because the failure they guard
against is invisible on the machine of whoever built the thing.

- **`apps/desktop/test/route-tree.test.ts`** compares the two trees file by file. A
  screen the phone grows and this host does not is a failure; so is a desktop file the
  phone does not have, which is where a desktop-only screen would have to be argued for
  rather than appear.
- **`apps/desktop/test/support-gate.test.ts`** reproduces gjsify's build-time support
  gate against the same published support table, over the phone's source. Its
  `ANSWERED_BY_A_DESKTOP_VARIANT` list holds exactly one entry, `Animated`, and it is
  checked in the **other** direction too: when `Animated` lands upstream the test fails
  and names the variant that can now be deleted. Without that half a hand-written copy
  outlives its reason, because nobody re-checks.

## Consequences

**The desktop host is a second reader of every phone screen.** A construct only one
renderer tolerates becomes a failure here, and the profil crash is the shape of that:
`<Typo onPress>` was not wrong on the phone, it was merely the one place the app spelled
a tappable line of text differently from everywhere else, and no other host was ever
going to say so.

**A phone screen costs nothing here until it grows a refused import.** That is the whole
economy of the arrangement, and it is why the cost of this host is its shims and its
adapter rather than its screens.

**`npm run check` at the repo root typechecks and tests this workspace**, which is how
both guards above run at all. It is also why a change to the phone's route tree can fail
a check in a workspace the author was not editing; that is the guard working.

## What this does not settle

**Props are still checked at render time, per screen, and that is a real hole.** The
support gate is import-level: the profil crash passed through it green, passed the
typecheck, passed the build, and only then took the tree down. `npm run route-sweep` is
the only oracle for a refused prop today, and it needs a GTK session, a built bundle and
an admitted profile.

The named next step is `@gjsify/react-native/prop-table` — a published subpath with a
generated `PROPS.md`, so a consumer can read the layer's per-prop answers as data. The
gate already reads this app's source; with the table beside it, `<Typo onPress>` is a
failing assertion in about a second inside `npm run check`, instead of a screenshot that
is 80 000 bytes too small. That is the same trade this whole host is built on: a refusal
that names itself, moved as early as it can be moved.

**Nothing here decides whether the desktop host ships.** It is a feasibility
demonstration, it is not built by CI, and the rule above is about keeping it cheap enough
that the question stays open.

## What this retires

From [ADR 0012](0012-a-list-virtualizer-for-the-unbounded-lists.md)'s "What this has not
delivered", all in the paragraph headed *The desktop host is a reason, not a plan*. The
sentence is struck through there; the argument around it stands, because the reason
`FlatList` won the tie is unchanged and the host it was chosen for now exists.

- **"No gjsify target exists in this repo."** False since `apps/desktop`.
- **The three decisions it said "would need their own decisions", all now made.**
  `Animated` is the one variant this arrangement admits (cause 3 above, `artikel.tsx`).
  `hitSlop` is dropped in `src/shims/react-native.tsx` with the reason written down — it
  is an 8 px expansion of a *touch* target on a platform whose pointer is a mouse, so
  there is nothing to preserve. Remote-URL images are answered by
  `src/shims/expo-image.tsx`, which fetches the URL and decodes it to a `Gdk.Texture`
  rather than handing `Gtk.Picture` something it cannot take; that shim's header quotes
  ADR 0012's sentence as the gap it closes.

Nothing in a later ADR. [ADR 0013](0013-native-tabs-and-a-web-tab-bar-of-its-own.md)'s
per-platform tab idiom and [ADR 0016](0016-a-door-at-the-root-and-an-entitlement-not-an-amount.md)'s
door are both *carried out* here rather than corrected: the tab layout is cause 2, and
the door is not a cause at all, because the gate is the phone's own component rendered
from the phone's own branch.
