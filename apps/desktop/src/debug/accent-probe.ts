// Can an application give libadwaita an ARBITRARY accent colour, or only pick one of
// Adwaita's nine?
//
// It looked like the latter, and that reading was wrong in a way that turns a choice
// into a limitation: `Adw.AccentColor` is an enum — BLUE, TEAL, GREEN, YELLOW, ORANGE,
// RED, PINK, PURPLE, SLATE — and `Adw.StyleManager:accent-color` reports the system's
// pick. But the accent reaches widgets as CSS, so the question is what happens when the
// app defines the CSS itself.
//
// MEASURED NUMERICALLY rather than eyeballed. Adwaita's `.accent` style class sets
// `color: var(--accent-color)`, and `Gtk.Widget.get_color()` reads a resolved
// foreground — so a label wearing that class reports the accent as an RGBA.
//
// Run:  npm run accent-probe -w @correctiv/desktop
//       npm run accent-probe -w @correctiv/desktop -- --legacy
//
// MEASURED 2026-09-09 on libadwaita 1.9.3 / GTK 4.22.4, asking for `#ff5c5c`:
//
//   nothing installed (the system's)      0.504 0.817 1.219
//   :root { --accent-color: #ff5c5c }     1.000 0.361 0.361   exactly what was asked
//   @define-color accent_color #ff5c5c    1.231 0.570 0.551   applies, but not as given
//
// So an arbitrary colour IS available, through the CSS custom properties libadwaita
// moved to in 1.6. Why the pre-1.6 `@define-color` reads back differently is NOT
// measured here and is therefore not claimed.
//
// Two things to know before comparing any of these numbers by eye. The readings run
// ABOVE 1.0 — the untouched system blue reports `1.219` in its blue channel — so
// `get_color()` on GTK 4.22 is not handing back plain 0..1 sRGB. And the first version
// of this probe injected BOTH spellings into one process and concluded that
// `@define-color` "did not win", which was a confounded reading with the variable still
// installed at the same provider priority. One spelling per process, hence `--legacy`.

import Adw from 'gi://Adw?version=1';
import Gdk from 'gi://Gdk?version=4.0';
import GLib from 'gi://GLib?version=2.0';
import Gtk from 'gi://Gtk?version=4.0';

Gtk.init();
Adw.init();

const manager = Adw.StyleManager.get_default();
const style = manager as unknown as Record<string, unknown>;
print(`libadwaita ${Adw.MAJOR_VERSION}.${Adw.MINOR_VERSION}.${Adw.MICRO_VERSION}`);
print(
  `accentColor enum: ${String(style.accentColor)}  systemSupports: ${String(style.systemSupportsAccentColors)}`,
);

const accented = new Gtk.Label({ label: 'accent', cssClasses: ['accent'] });
/** `.suggested-action` sets `color: var(--accent-fg-color)`, so this reads the OTHER one. */
const suggested = new Gtk.Button({ label: 'suggested', cssClasses: ['suggested-action'] });
const holder = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL });
holder.append(accented);
holder.append(suggested);
const window = new Gtk.Window({ child: holder, defaultWidth: 240, defaultHeight: 120 });
window.present();

const show = (widget: Gtk.Widget): string => {
  const c = widget.get_color();
  return `${c.red.toFixed(3)} ${c.green.toFixed(3)} ${c.blue.toFixed(3)}`;
};
const rgba = (): string => `standalone ${show(accented)} | on-accent fg ${show(suggested)}`;

/** Install a provider at the APPLICATION priority, the way an app ships a theme tweak. */
const inject = (css: string): void => {
  const provider = new Gtk.CssProvider();
  provider.load_from_string(css);
  const display = Gdk.Display.get_default();
  if (display === null) throw new Error('no display');
  Gtk.StyleContext.add_provider_for_display(
    display,
    provider,
    Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION,
  );
};

const loop = new GLib.MainLoop(null, false);
let step = 0;

/**
 * Which spelling to try, from `--legacy` on the command line.
 *
 * SEPARATE RUNS, because the first version of this probe injected the CSS-variable
 * spelling and then the `@define-color` one into the same process and reported that the
 * second "did not win" — a confounded reading, since the variable was still installed
 * at the same provider priority. One spelling per process is the only clean question.
 */
const legacy = ARGV.includes('--legacy');

/**
 * `--bg-only`: set ONLY `--accent-bg-color` and see whether the standalone
 * `--accent-color` follows.
 *
 * This decides a design question rather than satisfying curiosity. libadwaita keeps two
 * accents — the background one a `.suggested-action` button is painted with, and the
 * standalone one accent-coloured TEXT uses, which has to stay legible on the window
 * background. If Adwaita DERIVES the second from the first, an application should set
 * only the first and leave the contrast work to the toolkit.
 */
const bgOnly = ARGV.includes('--bg-only');

/**
 * `--legacy-standalone`: `@define-color accent_color` and NOTHING else.
 *
 * The decisive test for a claim this probe got wrong once. The `--legacy` run set both
 * `accent_color` AND `accent_bg_color` and read back a value that was not the one
 * given, which was written up as "the legacy spelling applies but differently". Then
 * `--bg-only` produced the SAME number from the background alone — so the likelier
 * story is that the legacy standalone name was ignored and what moved the reading was
 * Adwaita deriving the standalone accent from the background. This separates them.
 */
const legacyStandalone = ARGV.includes('--legacy-standalone');

/**
 * `--light`: force the light scheme before measuring.
 *
 * The accessibility question, and the one that decides whether an app may lean on the
 * derivation. In the dark scheme Adwaita LIGHTENS the standalone accent so it stays
 * legible on a dark window. If it does not DARKEN it for a light window, an app that
 * sets only the background accent gets a low-contrast accent text in light mode.
 */
if (ARGV.includes('--light')) {
  manager.colorScheme = Adw.ColorScheme.FORCE_LIGHT;
  print('forced the LIGHT scheme');
}

GLib.timeout_add(GLib.PRIORITY_DEFAULT, 500, () => {
  step += 1;
  if (step === 1) {
    print(`1. untouched, the system accent:  ${rgba()}`);
    if (legacyStandalone) {
      inject('@define-color accent_color #ff5c5c;');
    } else if (bgOnly) {
      inject(':root { --accent-bg-color: #ff5c5c; }');
    } else if (legacy) {
      // The pre-1.6 spelling, on its own.
      inject('@define-color accent_color #ff5c5c; @define-color accent_bg_color #ff5c5c;');
    } else {
      // The 1.6+ spelling: libadwaita's named colours became CSS custom properties.
      inject(':root { --accent-color: #ff5c5c; --accent-bg-color: #ff5c5c; }');
    }
    return GLib.SOURCE_CONTINUE;
  }
  print(
    `2. after ${legacyStandalone ? '@define-color accent_color ONLY' : bgOnly ? '--accent-bg-color ONLY' : legacy ? '@define-color both' : '--accent-color + bg'}:\n   ${rgba()}`,
  );
  if (bgOnly) {
    print('   MOVED means Adwaita derives the standalone accent; UNCHANGED means it does not');
  }
  window.destroy();
  loop.quit();
  return GLib.SOURCE_REMOVE;
});

loop.run();
