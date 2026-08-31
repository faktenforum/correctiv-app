// The one generated stylesheet this host owns, and why it is ours rather than the
// layer's default.
//
// `configureStyle({ tokens })` alone lets @gjsify/react-native build a private
// `StyleSheet` on first use. That is enough to render, and not enough here: two of
// the shims in `../shims/` need to mint a class of their own. `Ionicons` has to
// colour a symbolic icon, which on GTK is the CSS `color` property on a
// `Gtk.Image` — there is no widget property for it — and `expo-image` has to size a
// `Gtk.Picture`. Both are declarations this layer would never see, because neither
// widget arrives through a `className`.
//
// Holding the sheet here means those classes land in the SAME document as the ones
// the class compiler mints, so the GTK inspector shows one provider and a rule
// cannot be shadowed by a second one at a different priority.

import { StyleSheet } from '@gjsify/gtk-host/style';

/**
 * Constructed lazily: `StyleSheet` builds a `Gtk.CssProvider` and installs it on
 * the default `Gdk.Display`, so building it at module scope would need a display at
 * IMPORT time — before `Gtk.init()` in every application. The failure would be an
 * import that throws rather than a render that does.
 */
let instance: StyleSheet | null = null;

export function sheet(): StyleSheet {
  instance ??= new StyleSheet();
  return instance;
}

/**
 * A class name for one CSS declaration, or `null` when there is nothing to say.
 *
 * `classFor` refuses an empty declaration set by name, so the guard is here rather
 * than at each of the three call sites.
 */
export function classForColor(property: string, value: string | undefined | null): string | null {
  if (value === undefined || value === null || value === '') return null;
  return sheet().classFor([`${property}: ${value}`]);
}
