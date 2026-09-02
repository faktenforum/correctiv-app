// The desktop entry point.
//
// ## The ordering constraint, which is the whole content of this file
//
// Three things have to happen and two of them cannot happen at module scope:
//
//   1. `registerBuiltinWidgets()` — the GTK widget table the reconciler resolves tags
//      against. Pure data, safe at import.
//   2. `configureStyle({ tokens, sheet })` — must run BEFORE the first styled element
//      renders, because the class compiler resolves `bg-grey-100` against the token
//      scale when it MINTS the class. Configure it late and every class already minted
//      resolved against `MINIMAL_TOKENS`.
//   3. `registerRootComponent` — builds the `Adw.ApplicationWindow` and renders into it.
//
// Step 2 cannot go above step 3, and finding that out is the reason this file has a
// comment instead of three lines. `StyleSheet` constructs a `Gtk.CssProvider` and
// installs it on the DEFAULT `Gdk.Display`, and `Adw.StyleManager.get_default()` wants
// the same display — neither exists until `Gtk.init()`, which `AppRegistry` calls
// inside the application's `activate`. Doing it at module scope aborts the process
// before any of it: `Gdk-ERROR **: gdk_display_manager_get() was called before
// gtk_init()`, SIGABRT and a core dump, measured.
//
// So it happens at the top of the root component's first render, which
// `AppRegistry.runApplication` reaches only after the window exists — and still before
// any child of it has rendered a single class.
//
// ## The palette is chosen once, here
//
// `Adw.StyleManager:dark` is what the user is actually looking at, as opposed to
// `color-scheme`, which is what the application asked for. Reading it picks one of the
// two generated token scales, so `bg-grey-100` is a white page surface in light and
// `#1a1a1a` in dark — the same two palettes the phone and the web target use, from the
// same generated file.
//
// It is read ONCE per launch, and that is this host's one real divergence from the
// phone, where the same setting flips both halves live. `configureStyle` installs a
// module-level scale and the sheet mints a class per declaration set, so
// re-configuring mid-session would change what NEW classes resolve to while every
// widget already on screen kept the class it was given — half the window in each
// scheme. Adwaita's own chrome still follows the setting immediately (see
// `shims/uniwind.ts`); the app's token colours need a restart. Named here, in that
// shim, and in README.md.

// Version-pinned, like every other `gi://` import in this tree — and it replaces an
// `imports.gi.Adw` that resolved UNVERSIONED. On GJS that read the one Adw the process
// had; through `@gjsify/node-gi`'s `imports` proxy it became `requireGi('Adw',
// undefined)`, an unversioned namespace resolution, which is the hazard the WebView
// shim's own header spells out in capitals for WebKit. Importing the module here is
// safe; only the display-dependent READ below must stay inside its guard.
import Adw from 'gi://Adw?version=1';

import { registerBuiltinWidgets } from '@gjsify/gtk-host';
import { configureStyle, registerRootComponent } from '@gjsify/react-native';
import { RouterRoot } from '@gjsify/react-native/router';
import { manifest } from 'virtual:gjsify-rn-routes';

import { armScreenshot } from './debug/screenshot.js';
import { tokensFor } from './generated/tokens.generated.js';
import { persistedAppearance } from './platform/storage.js';
import { sheet } from './style/sheet.js';

registerBuiltinWidgets();

let styleConfigured = false;

/**
 * Idempotent, and guarded rather than left to run per render: `configureStyle` would
 * happily re-assign the same scale every time, but re-reading `Adw.StyleManager` on
 * every render of the root is work with no answer that can change (see above).
 */
function configureStyleOnce(): void {
  if (styleConfigured) return;
  styleConfigured = true;
  // The READ stays here, not at module scope: `StyleManager.get_default()` needs a
  // `Gdk.Display`, which does not exist until `Gtk.init()` has run inside `activate`.
  // Hoisting it is the measured `gdk_display_manager_get() was called before
  // gtk_init()` abort, and the import above is deliberately separate so that the guard
  // is the only thing anyone has to preserve.
  const manager = Adw.StyleManager.get_default();

  // APPLY THE USER'S PREFERENCE FIRST, then read what it produced.
  //
  // `StyleManager:dark` answers "what is on screen", and at this point that is still
  // the SYSTEM scheme: the app's own preference lives in a Redux slice that hydrates
  // asynchronously, and `useAppearance()` applies it to `color-scheme` several frames
  // later — by which time this palette has been minted and every class stamped from it.
  // A user whose preference differs from the system therefore got Adwaita's chrome in
  // one scheme and the app's own token colours in the other, from the first frame, with
  // no way back short of changing the system to match. README named only the
  // MID-SESSION switch as a limitation; this was wrong at startup, with nothing
  // switched at all.
  //
  // Reading the preference straight out of the settings file is the narrow fix: it is
  // the same value `useAppearance()` goes on to apply, so that later call becomes a
  // no-op rather than a second opinion, and both halves agree from the first frame.
  const preference = persistedAppearance();
  if (preference === 'light') manager.colorScheme = Adw.ColorScheme.FORCE_LIGHT;
  else if (preference === 'dark') manager.colorScheme = Adw.ColorScheme.FORCE_DARK;

  configureStyle({ tokens: tokensFor(manager.dark), sheet: sheet() });
}

function App() {
  configureStyleOnce();
  // Opt-in and env-gated; a no-op unless CORRECTIV_DESKTOP_SCREENSHOT names a path.
  armScreenshot();
  return <RouterRoot manifest={manifest} />;
}

await registerRootComponent(App, {
  // Experimental by name. This build is a feasibility demonstration and must not be
  // mistaken for a shipped CORRECTIV application by a desktop that indexes it —
  // `.desktop` files, the shell's app grid and D-Bus activation all key off this.
  applicationId: 'org.correctiv.AppDesktopExperimental',
  title: 'CORRECTIV (Desktop, experimentell)',
  // `defaultWidth`/`defaultHeight`, not `width`/`height`. The wrong names were
  // accepted by JavaScript and ignored, and the window stayed at the documented
  // 900x700 default — which is exactly the kind of silently-dropped option that a
  // typecheck catches and a screenshot does not.
  defaultWidth: 1100,
  defaultHeight: 820,
});
