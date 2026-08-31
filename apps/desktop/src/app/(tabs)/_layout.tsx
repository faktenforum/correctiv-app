// The desktop tab layout.
//
// Three layouts now exist for these five routes, and ADR 0013 is the reason that is
// correct rather than duplicated: the tab bar is the one control a user has already
// learned somewhere else, so each platform should present it in its own idiom rather
// than have one drawing stretched over all three.
//
//   `_layout.tsx`     native tabs (iOS/Android) — the system's bar
//   `_layout.web.tsx` the drawn bar — because the web has no system bar to borrow
//   this file         `Adw.ViewStack` + `Adw.ViewSwitcher` — the desktop's own idiom
//
// A desktop window has no bottom tab bar, and drawing one would be the exact mistake
// ADR 0013 argues against. `Adw.ViewSwitcher` is the GNOME counterpart: it sits in
// the header bar where the window title would be, which is Adwaita's own placement,
// and it is driven by the view stack's own page model — so a route file adds a button
// with no tab-bar bookkeeping. Its NARROW/WIDE policy also means the same declaration
// gives icons-only in a narrow window and icons-beside-labels in a wide one.
//
// ## Two things the phone has here and this does not
//
// NO ICONS. `Tabs.Screen` accepts `title` and refuses every other option by name, so
// the switcher is labels only. That is a real difference from both other layouts, and
// it is the router's current surface rather than a choice made here — `Adw.ViewStackPage`
// carries an icon name (`icon-name`) that this layer does not expose yet. The tab
// ORDER is identical to the other two, which ADR 0013 asks for explicitly: it is the
// same information architecture.
//
// NO MINI PLAYER. On the phone and on the web it is an overlay pinned above the tab
// bar, at a height both sides read from one constant. There is no bottom bar to pin it
// above here, and it cannot simply be wrapped around `<Tabs>`: the switcher is
// created with `slot="title"`, which resolves against the PARENT, so putting a
// `Gtk.Box` between this layout and the header bar takes the switcher's slot away and
// the router refuses it by name. Giving the desktop a mini player means either an
// `Adw.ToolbarView` bottom bar owned by the entry, or the router exposing the
// switcher's placement — both are more than a layout change, so it is absent and said
// so. The full player at `/player` is reachable and works; what is missing is the
// persistent strip, not the playback.

import { Tabs } from 'expo-router';

export default function TabsLayout() {
  return (
    <Tabs>
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="entdecken" options={{ title: 'Entdecken' }} />
      <Tabs.Screen name="mediathek" options={{ title: 'Mediathek' }} />
      <Tabs.Screen name="mitmachen" options={{ title: 'Mitmachen' }} />
      <Tabs.Screen name="profil" options={{ title: 'Profil' }} />
    </Tabs>
  );
}
