// The desktop tab layout.
//
// Three layouts now exist for these five routes, and ADR 0013 is the reason that is
// correct rather than duplicated: the tab bar is the one control a user has already
// learned somewhere else, so each platform should present it in its own idiom rather
// than have one drawing stretched over all three.
//
//   `_layout.tsx`     native tabs (iOS/Android) — the system's bar
//   `_layout.web.tsx` the drawn bar — because the web has no system bar to borrow
//   this file         `Adw.ViewStack` + `Adw.ViewSwitcher`/`Adw.ViewSwitcherBar`
//
// A WIDE window has no bottom tab bar, and drawing one would be the exact mistake
// ADR 0013 argues against. `Adw.ViewSwitcher` is the GNOME counterpart: it sits in
// the header bar where the window title would be, which is Adwaita's own placement,
// and it is driven by the view stack's own page model — so a route file adds a button
// with no tab-bar bookkeeping.
//
// A NARROW window is a different platform, and the same idiom says so. Below the width
// where the switcher fits, Adwaita moves it into an `Adw.ViewSwitcherBar` at the
// bottom of the window, which is what every adaptive GNOME application does and what a
// Linux phone running this exact binary needs — the same codebase, so the desktop's
// narrow layout IS the phone's. The router does that itself now; this file only
// declares the tabs. Above the threshold nothing changed.
//
// ## What the phone has here and this does not
//
// NO MINI PLAYER. On the phone and on the web it is an overlay pinned above the tab
// bar, at a height both sides read from one constant. It cannot simply be wrapped
// around `<Tabs>`: the switcher is created with `slot="title"`, which resolves against
// the PARENT, so putting a `Gtk.Box` between this layout and the header bar takes the
// switcher's slot away and the router refuses it by name. There IS a bottom bar to pin
// it above now, in the narrow layout, which removes one of the two reasons this was
// absent — but only in that layout, and a strip that appears with the window width is
// worse than one that is honestly missing. The full player at `/player` is reachable
// and works; what is missing is the persistent strip, not the playback.

import { Tabs } from 'expo-router';

export default function TabsLayout() {
  return (
    <Tabs>
      <Tabs.Screen name="index" options={{ title: 'Home', iconName: 'go-home-symbolic' }} />
      <Tabs.Screen
        name="entdecken"
        options={{ title: 'Entdecken', iconName: 'view-grid-symbolic' }}
      />
      <Tabs.Screen
        name="mediathek"
        options={{ title: 'Mediathek', iconName: 'applications-multimedia-symbolic' }}
      />
      <Tabs.Screen
        name="mitmachen"
        options={{ title: 'Mitmachen', iconName: 'system-users-symbolic' }}
      />
      <Tabs.Screen
        name="profil"
        options={{ title: 'Profil', iconName: 'avatar-default-symbolic' }}
      />
    </Tabs>
  );
}
