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
import { initFonts } from '@gjsify/gtk-host/fonts';
import { configureStyle, registerRootComponent } from '@gjsify/react-native';
import { RouterRoot } from '@gjsify/react-native/router';
import { manifest } from 'virtual:gjsify-rn-routes';

import { armScreenshot } from './debug/screenshot.js';
import { tokensFor } from './generated/tokens.generated.js';
import { persistedAppearance } from './platform/storage.js';
import { alignFamilies } from './style/font-map.js';
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

let fontsRegistered = false;

/**
 * Put the two brand faces on the font map, and say what happened.
 *
 * The faces are staged into `data/fonts/` by `scripts/stage-fonts.mjs` and declared
 * to `gjsify ship` as `gjsify.ship.fonts`; the launcher exports `GJSIFY_FONT_DIR` at
 * wherever that directory ended up, because only the launcher knows whether the
 * payload became `/usr`, a `Contents/Resources` or `C:\Program Files`. `initFonts()`
 * reads that variable itself. `scripts/start.mjs` sets it for a dev run so the two
 * paths do not diverge.
 *
 * ## Why this LOGS instead of asserting
 *
 * The outcome is legitimately different on each platform, and only one of the three
 * shapes is a defect:
 *
 *   * **registered** — a fontconfig-backed Pango took the faces. Linux, and Windows.
 *   * **declined** — `pango_font_map_add_font_file()` is a vfunc and the CoreText map
 *     implements none, so macOS answers `G_IO_ERROR_NOT_SUPPORTED`. That is not a
 *     failure: a `.app` carries `ATSApplicationFontsPath`, so the OS activated the
 *     staged directory before this process started and the faces are already there.
 *     The corollary is worth knowing while developing: running the bundle directly on
 *     macOS, outside a `.app`, has no brand typeface and cannot have one.
 *   * **failed** — a face the map refused for any other reason. This one is ours.
 *
 * An assertion would have to encode all three, and would then be wrong on the next
 * platform. Pango's own failure mode is the reason there is any output at all: it does
 * not report a missing family, so `set_family('Merriweather')` against a map that
 * never got the file resolves to the default sans and nothing anywhere says a word.
 */
function registerFontsOnce(): void {
  if (fontsRegistered) return;
  fontsRegistered = true;
  const result = initFonts();
  if (result.dir === undefined) {
    console.warn(
      '[desktop] fonts: GJSIFY_FONT_DIR is not set, so no brand face was registered. ' +
        'Pango will substitute the system UI font in the chrome.',
    );
    return;
  }
  const parts = [`${result.registered.length} registered`];
  if (result.declined.length > 0) {
    parts.push(`${result.declined.length} declined by the font map (expected on macOS)`);
  }
  if (result.failed.length > 0) parts.push(`${result.failed.length} FAILED`);
  console.log(`[desktop] fonts: ${result.dir} — ${parts.join(', ')}.`);
  for (const failure of result.failed) {
    console.warn(`[desktop] fonts: ${failure.path}: ${failure.message}`);
  }

  // And then ask the MAP, because the registration count is not the thing that matters.
  // Measured on Windows: five faces reported registered, and `Merriweather` was not on
  // the map under that name — it is `Merriweather 18pt` there and `Merriweather` on
  // Linux, from the same bytes. `alignFamilies()` reconciles the two and `missing` is
  // what Pango will substitute silently, so it is a warning rather than a count.
  const families = alignFamilies();
  const found = [
    ...families.exact,
    ...families.aliased.map(([declared, actual]) => `${declared} as "${actual}"`),
  ];
  console.log(
    `[desktop] fonts: ${families.onMap} families on the map; this app has ${found.join(', ') || 'none of its own'}.`,
  );
  for (const family of families.missing) {
    console.warn(
      `[desktop] fonts: "${family}" is on no font map under any name this recognises. ` +
        'Pango will substitute it without saying so.',
    );
  }
}

function App() {
  // Before the style, and before anything renders: a family Pango does not know is
  // substituted at DRAW time with no diagnostic.
  registerFontsOnce();
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
