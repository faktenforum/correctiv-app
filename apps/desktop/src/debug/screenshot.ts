// An opt-in, in-process window capture — the only way to SEE this host on this machine.
//
// WHY IT HAS TO BE IN-PROCESS, measured rather than assumed. GNOME 45+ refuses
// `org.gnome.Shell.Screenshot` to an unsandboxed caller
// (`GDBus.Error:org.freedesktop.DBus.Error.AccessDenied: Screenshot is not allowed`),
// this session is Wayland so `import`/`xwininfo` see nothing at all, and `grim` is not
// installed. An external screenshot is not available here by any route.
//
// The pipeline is pure GTK4/GSK and runs inside the process: `Gtk.WidgetPaintable` ->
// `Gtk.Snapshot` -> `Gsk.Renderer.render_texture` -> `texture.save_to_png_bytes()`. No
// portal, no compositor cooperation, no OS branch. `@gjsify/devtools` ships exactly
// this as `captureWidgetPng`; it is written out here instead because that function has
// three `return null` paths and does not say which one it took, and on this app it took
// one of them. Each step below reports itself, which is what turned "no renderer?" into
// an answer.
//
// NOT `installDevtools`, which is the fuller facility — a whole `org.gjsify.Devtools`
// D-Bus control plane, including click-driving the UI from outside. It wants the
// `Adw.Application` instance from `vfunc_startup`, and on this host
// `AppRegistry.runApplication` owns that object, so wiring it would need a seam in
// @gjsify/react-native that does not exist yet.
//
// WHY A DELAY AND NOT A SIGNAL. The first frame is not the interesting one: the feed
// stores dispatch their cascades from effects and the bundled snapshot arrives a tick
// later, so capturing on `map` reliably photographs spinners. The delay is a blunt
// instrument and this comment is it being honest about that — a development aid, not a
// test oracle. Something that asserted the resulting widget tree would be
// `runHostProbeApp`, which is a different job and a better one.

import GLib from 'gi://GLib?version=2.0';
import Gio from 'gi://Gio?version=2.0';
import Graphene from 'gi://Graphene?version=1.0';
import Gtk from 'gi://Gtk?version=4.0';

import { dumpTree } from '@gjsify/gtk-host/conformance';

/** One capture attempt, with the reason it failed rather than a bare null. */
function capture(widget: Gtk.Widget, label: string): Uint8Array | null {
  const native = widget.get_native();
  const renderer = native?.get_renderer() ?? null;
  if (renderer === null) {
    console.error(`[desktop] screenshot: ${label} has no Gsk.Renderer (not realised).`);
    return null;
  }

  const width = widget.get_width();
  const height = widget.get_height();
  if (width <= 0 || height <= 0) {
    console.error(`[desktop] screenshot: ${label} measures ${width}x${height}.`);
    return null;
  }

  const paintable = Gtk.WidgetPaintable.new(widget);
  const snapshot = Gtk.Snapshot.new();
  paintable.snapshot(snapshot, width, height);
  const node = snapshot.to_node();
  if (node === null) {
    // The interesting failure, and the one that cost the most to identify: a complete
    // widget tree, a live renderer, a sane size, and an EMPTY snapshot.
    console.error(
      `[desktop] screenshot: ${label} produced an empty Gsk render node at ${width}x${height} ` +
        '(the tree is there, but Gtk.WidgetPaintable recorded nothing).',
    );
    return null;
  }

  const viewport = new Graphene.Rect();
  viewport.init(0, 0, width, height);
  const texture = renderer.render_texture(node, viewport);
  const bytes = texture.save_to_png_bytes().get_data();
  if (bytes === null) {
    console.error(`[desktop] screenshot: ${label} rendered a texture that would not encode.`);
    return null;
  }
  return new Uint8Array(bytes);
}

let armed = false;

/**
 * Arm the capture if `CORRECTIV_DESKTOP_SCREENSHOT` names a path.
 *
 * `CORRECTIV_DESKTOP_SCREENSHOT_DELAY_MS` overrides the wait (default 4000);
 * `CORRECTIV_DESKTOP_SCREENSHOT_QUIT=0` leaves the window open afterwards.
 */
export function armScreenshot(): void {
  // Guarded, because the call site is a component body and React renders it more than
  // once. Unguarded, every render armed another timer: the first one captured, wrote the
  // file and closed the window, and each later one then found an unmapped window and
  // reported a failure — so a run ended with an error message describing a capture that
  // had in fact succeeded seconds earlier.
  if (armed) return;
  armed = true;

  const path = GLib.getenv('CORRECTIV_DESKTOP_SCREENSHOT');
  if (path === null || path === '') return;

  const requested = Number(GLib.getenv('CORRECTIV_DESKTOP_SCREENSHOT_DELAY_MS') ?? '4000');
  const delay = Number.isFinite(requested) && requested > 0 ? requested : 4000;
  const quit = GLib.getenv('CORRECTIV_DESKTOP_SCREENSHOT_QUIT') !== '0';

  GLib.timeout_add(GLib.PRIORITY_DEFAULT, delay, () => {
    // The first MAPPED toplevel, not item 0: `get_toplevels()` lists every toplevel GTK
    // knows about, and an unmapped one has no renderer at all.
    const toplevels = Gtk.Window.get_toplevels();
    let window: Gtk.Window | null = null;
    for (let index = 0; index < toplevels.get_n_items(); index++) {
      const candidate = toplevels.get_item(index) as Gtk.Window;
      if (candidate.get_mapped()) {
        window = candidate;
        break;
      }
    }
    if (window === null) {
      console.error(
        `[desktop] screenshot: none of the ${toplevels.get_n_items()} toplevel window(s) is mapped. ` +
          'Raise CORRECTIV_DESKTOP_SCREENSHOT_DELAY_MS.',
      );
      return GLib.SOURCE_REMOVE;
    }

    // RAISE IT FIRST, then capture on a later frame.
    //
    // A complete widget tree, a live renderer, a sane size and an EMPTY snapshot is
    // what an unfocused window looks like: on Wayland the compositor stops asking a
    // surface it is not showing to draw, GTK's frame clock throttles with it, and
    // `Gtk.WidgetPaintable` then has no recorded content to hand over. That is why the
    // same code captures a freshly presented probe window and not this one.
    //
    // `present()` asks for focus; the second timeout gives the frame clock a chance to
    // run before anything is measured. If this still comes back empty the log below
    // says so with the tree attached, which distinguishes "nothing drew" from "nothing
    // rendered".
    window.present();
    GLib.timeout_add(GLib.PRIORITY_DEFAULT, 1200, () => {
      captureNow(window as Gtk.Window, path, quit);
      return GLib.SOURCE_REMOVE;
    });
    return GLib.SOURCE_REMOVE;
  });
}

/**
 * Write the PNG, creating the directory the caller named.
 *
 * `GLib.file_set_contents` THROWS when the parent directory is absent, and that throw
 * leaves a timeout callback — so GJS prints it as `JS ERROR: GLib.FileError` with no
 * `[desktop]` prefix. Anything reading the log then sees an application error where the
 * application was fine: the route sweep hands over `dist/sweep/<route>.png`, a build
 * wipes `dist/`, and one absent directory reported all 25 routes as refusals. A
 * development aid must not be able to look like the thing it is there to observe.
 *
 * So the directory is created (the caller named a path, which is the request), and a
 * write that still fails reports itself the way every other step in this file does.
 */
function writePng(path: string, png: Uint8Array, label: string): boolean {
  const parent = Gio.File.new_for_path(path).get_parent();
  try {
    parent?.make_directory_with_parents(null);
  } catch {
    // Already there — the ordinary case on every run after the first.
  }
  try {
    GLib.file_set_contents(path, png);
  } catch (error) {
    console.error(`[desktop] screenshot: could not write ${path} (the ${label}): ${error}`);
    return false;
  }
  console.log(`[desktop] screenshot: wrote ${png.length} bytes to ${path} (the ${label}).`);
  return true;
}

/** The capture itself, once the window has been raised and a frame has passed. */
function captureNow(window: Gtk.Window, path: string, quit: boolean): void {
  // Tried outermost-first and each attempt names itself, so the log says WHAT was
  // captured rather than leaving the reader to assume it was the whole window.
  const attempts: Array<readonly [string, Gtk.Widget | null]> = [
    ['window', window as unknown as Gtk.Widget],
    [
      'window content',
      (window as unknown as { get_content?: () => Gtk.Widget | null }).get_content?.() ?? null,
    ],
    ['first child', (window as unknown as Gtk.Widget).get_first_child()],
  ];

  for (const [label, widget] of attempts) {
    if (widget === null) continue;
    const png = capture(widget, label);
    if (png === null) continue;
    if (!writePng(path, png, label)) return;
    if (quit) window.close();
    return;
  }

  console.error(
    '[desktop] screenshot: every candidate failed. The widget tree below shows whether ' +
      'the app rendered at all — a full tree plus an empty snapshot is a capture ' +
      'problem, not a rendering one:\n' +
      dumpTree(window as unknown as Gtk.Widget),
  );
}
