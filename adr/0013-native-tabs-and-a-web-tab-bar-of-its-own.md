# ADR 0013 — Native tabs on the phone, and a web tab bar of its own

Status: accepted, 2026-08-28. Not yet verified on a device — see the last section.

## Context

The tab bar was ours: `Tabs` from `expo-router`, styled to the design draft down to
the hairline and the 11px label, with the mini player overlaid on top of it at a
height both sides read from one constant. It looked right in every screenshot in
`screens/`.

The argument against it is not that it looked wrong. It is that the tab bar is the
one control in this app a user has already learned somewhere else. A drawn bar
imitates the system's appearance and then stops: no scroll-to-top on a second tap,
no iOS 26 minimise-on-scroll, no growing with the system font size, and press
feedback that is ours rather than the platform's. Every one of those is something a
user knows without being told, and none of them survives being redrawn.

Two things made this the moment. `Tabs` from `expo-router` is **deprecated** in SDK
56 (`@deprecated Use 'expo-router/js-tabs' instead`), so the old import was on a path
Expo is moving off regardless. And `NativeTabs.BottomAccessory` exists in the
installed version — the system slot for the bar Apple Music puts a track in, which is
the mini player's problem solved by the platform instead of by us.

## Decision

**Native tabs on iOS and Android.** `expo-router/unstable-native-tabs`, with the
colours still from the token palette so the bar follows the appearance setting.
Only its shape is the platform's.

**Icons in each platform's own vocabulary**, not one set stretched over both: SF
Symbols on iOS, Material Symbols on Android, each with a filled selected variant.
Ionicons stays what the rest of the app draws with. The tab bar is the part users
read as belonging to their phone rather than to us, and it is the only part that
defers.

**Web keeps the drawn tab bar, as its own layout** — `_layout.web.tsx`, holding what
`_layout.tsx` held before. This is the part worth being explicit about: expo-router's
web implementation of native tabs is 74 lines that render labels and **no icons**.
Sharing one layout would have meant the web inheriting a worse tab bar so that the
code could be the same. Web is published on every push to `main` and is how most
people will ever see this app, so it is a target in its own right, and the right
answer there is the drawn bar rather than a borrowed one it cannot borrow.

The pattern is the repo's existing one (`ReaderView.web.tsx`, `VideoFrame.web.tsx`,
`shareArticle.web.ts`), applied for the first time to a route rather than a
component.

## The mini player, three platforms, three answers

This is the part that changed most, and it is a good illustration of the rule above.

**iOS: `NativeTabs.BottomAccessory`.** The system's own slot. It handles the tab
bar's height and its translucency, and on iOS 26 it knows `regular` and `inline`
placement without being told any of it.

**Android: the overlay, kept.** `NativeTabsView.android.js` reads no accessory —
there is no counterpart. Drawing your own bar above the navigation bar is what
Android media apps do, so the overlay is the Android answer rather than a fallback
from the iOS one.

**Web: unchanged**, because the drawn bar is still there and its height is still
ours.

## Consequences

**The Android height constant changed meaning, and is now a guess.** It used to be a
value we SET — the drawn bar took `height: 56 + insets.bottom` from it, so the bar
and the mini player could not disagree. A native bar sizes itself, and native tabs
expose no height: `useBottomTabBarHeight` belongs to the JS tabs only, and the
documentation says plainly that layout information is unavailable. The same 56 now
means "what Material's `BottomNavigationView` is expected to be", which is what
react-native-screens renders underneath. If it is wrong, the mini player overlaps the
tab bar, and nothing in `npm run check` can see it.

**All five tabs now mount eagerly.** Native tabs do not support lazy loading. The JS
tabs mounted a tab on first visit; five screens now mount at startup, including the
feeds each one kicks off. The documented mitigation is `useIsFocused()` to defer the
contents, which is not done here and is the first thing to reach for if startup gets
slower. Measuring that needs a device.

**Five tabs is now a ceiling, not a choice.** Android's Material tabs cap at five and
the app has exactly five. A sixth is a redesign, not an edit. The triggers are
written out rather than mapped so that this is visible where someone would add one.

**The API is alpha.** `unstable-native-tabs` is the real import path, and Expo says
the API is subject to change. The web half of this decision is insulated from that;
the native half is not.

**`FlatList` inside a tab screen loses scroll-to-top and minimise-on-scroll.** No tab
screen is a `FlatList` today — [ADR 0012](0012-a-list-virtualizer-for-the-unbounded-lists.md)
converted two pushed routes, not tab roots — so this costs nothing yet. It is a
constraint on where the next virtualized list may go.

## What this has not delivered

**None of the native half has been run.** The web export was rebuilt and looked at,
in both appearance settings, and it is unchanged — which verifies only that the
platform split is clean and that the `js-tabs` import swap is transparent. The native
tab bar, the SF Symbols, the Material Symbols, the `BottomAccessory` and the Android
height constant have been read from the installed source and typechecked against
`sf-symbols-typescript` and `expo-symbols`, and that is all. **A green check is not
evidence here in exactly the way [TROUBLESHOOTING.md](../TROUBLESHOOTING.md) means
it.** This needs `npm run android` and a look, and until then the Android mini player
position in particular should be treated as unverified.

**iOS has never been built at all**, which is not new (see the README's status note)
but matters more now: the `BottomAccessory` is the one piece of this that exists only
on the platform nobody here has run.
