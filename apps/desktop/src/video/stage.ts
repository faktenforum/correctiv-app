// What makes the video stage behave like a video stage: a click that pauses, a
// double click and a button for full screen, and a control strip that gets out of the
// way. Full screen is a window of its own — see `openFullscreen` — and Escape belongs
// to it.
//
// ## Why this is not in the shim
//
// `shims/` imports no `gi://`, on purpose: every shim duck-types the widget it was
// handed (`applyAutoFocus` in `react-native.tsx` is the pattern) so the React side
// stays a React side. Controllers cannot be duck-typed — they have to be
// CONSTRUCTED — so the construction lives here, beside the pipeline, and the shim
// hands over two widgets and three callbacks.
//
// ## What `Gtk.MediaControls` does not bring
//
// It is the strip, and only the strip: play, seek, time, volume. `Gtk.Video` adds the
// behaviour around it and does not expose it, so the auto-hide, the click and full
// screen are wired here rather than borrowed.
//
// AND IT DOES NOT FADE. A `Gtk.Revealer` would give the crossfade `Gtk.Video` has,
// and the host declines it: `GtkRevealer` is in the generated property table but is
// not curated, so a child placed in one is refused by name. So the strip is shown and
// hidden outright. Named because it is the visible difference from GTK's own player,
// and it costs one curated descriptor upstream to close.

import Gdk from 'gi://Gdk?version=4.0';
import GLib from 'gi://GLib?version=2.0';
import Gtk from 'gi://Gtk?version=4.0';

import type { VideoStream } from './stream.js';

/** How long the strip stays after the pointer stops moving. */
const HIDE_AFTER_MS = 2500;

/** The two widgets and the three answers this needs from the player. */
export interface StageTarget {
  /** The `Gtk.Overlay` the controllers go on. */
  readonly overlay: unknown;
  /** The `Gtk.MediaControls` that is shown and hidden. */
  readonly controls: unknown;
  /**
   * The picture — the CLICK TARGET, and not the overlay.
   *
   * A click gesture on the overlay also hears the clicks its own children take: the
   * full-screen button sits in that overlay, so pressing it both went full screen AND
   * toggled play, which is exactly the "it pauses when I switch to full screen" that
   * was reported. On the picture, "a click on the video" means the video.
   */
  readonly surface: unknown;
  readonly isPlaying: () => boolean;
  readonly togglePlay: () => void;
  /** Asked for on a double click. The caller owns the full-screen window. */
  readonly requestFullscreen: () => void;
}

type Widget = {
  add_controller(controller: Gtk.EventController): void;
  remove_controller(controller: Gtk.EventController): void;
  get_root(): unknown;
};

/** The window a widget sits in, for a full-screen window to be transient for. */
const windowOf = (widget: unknown): Gtk.Window | null => {
  const root = (widget as Widget).get_root();
  return root instanceof Gtk.Window ? root : null;
};

/** What a full-screen window needs: the frames, the stream to drive, a stage to sit over. */
export interface FullscreenTarget {
  /** The sink's `GdkPaintable` — the SAME one the page's picture shows. */
  readonly paintable: unknown;
  /**
   * The stream, so the full-screen strip drives the same playback.
   *
   * The app's own `VideoStream` and not any `Gtk.MediaStream`, because binding a
   * second strip to a live stream needs `bindControls` — see below.
   */
  readonly stream: VideoStream;
  /** Any widget in the page, to find the window this should sit over. */
  readonly anchor: unknown;
  /** Told when the full-screen window has gone, so an icon can follow. */
  readonly onClosed: () => void;
}

/**
 * THE VIDEO GOES FULL SCREEN, NOT THE WINDOW.
 *
 * `window.fullscreen()` on the app's own window was the first shape and it is the
 * wrong one: it makes the whole application fill the screen — header bar, title,
 * description and all — with the video still a 548 px box in the middle of it.
 * Measured, the window went to 2560x1440 and the picture stayed 548x308.
 *
 * So this opens a window of its own, full screen, holding nothing but the frames and
 * a strip. Nothing is REPARENTED: the page's picture keeps its own widget and this
 * one takes a SECOND `Gtk.Picture` on the same `GdkPaintable`. A paintable is a
 * passive drawing interface and has no single owner, which is what makes that safe —
 * and it keeps the reconciler's subtree exactly where the reconciler put it.
 *
 * Answers a closer, and closes itself on Escape or on its own button.
 */
export function openFullscreen(target: FullscreenTarget): () => void {
  const anchor = windowOf(target.anchor);

  const picture = new Gtk.Picture({
    paintable: target.paintable as Gdk.Paintable,
    canShrink: true,
    contentFit: Gtk.ContentFit.CONTAIN,
    hexpand: true,
    vexpand: true,
  });
  // THROUGH `bindControls`, or opening full screen moves the playhead. A strip bound
  // to a stream that stands past ten seconds asks it to seek to 10.00 s — measured, and
  // measured against a fake stream with no GStreamer in it, so it is the widget and not
  // this pipeline. `stream.ts` carries the numbers and refuses the seek for the length
  // of this call.
  const controls = target.stream.bindControls(
    () =>
      new Gtk.MediaControls({
        mediaStream: target.stream,
        valign: Gtk.Align.END,
        hexpand: true,
      }),
  );
  const leave = new Gtk.Button({
    iconName: 'view-restore-symbolic',
    valign: Gtk.Align.START,
    halign: Gtk.Align.END,
    marginTop: 8,
    marginEnd: 8,
    cssClasses: ['osd', 'circular'],
  });
  const overlay = new Gtk.Overlay({ hexpand: true, vexpand: true });
  overlay.set_child(picture);
  overlay.add_overlay(controls);
  overlay.add_overlay(leave);

  const window = new Gtk.Window({
    child: overlay,
    // Its own window, and tied to the app's: a full-screen video that outlived the
    // page behind it would be a window with no way back to anything.
    transientFor: anchor ?? undefined,
    destroyWithParent: true,
    title: 'Video',
  });

  let closed = false;
  const close = (): void => {
    if (closed) return;
    closed = true;
    window.destroy();
    target.onClosed();
  };

  leave.connect('clicked', close);
  const keys = new Gtk.EventControllerKey({ propagationPhase: Gtk.PropagationPhase.CAPTURE });
  keys.connect('key-pressed', (_c: Gtk.EventControllerKey, keyval: number): boolean => {
    if (keyval !== Gdk.KEY_Escape) return false;
    close();
    return true;
  });
  window.add_controller(keys);
  // ON THE PICTURE, NOT THE OVERLAY, for the reason `StageTarget.surface` carries one
  // layer up: a bubble-phase controller on a `Gtk.Overlay` receives the pointer events
  // its own children were the target of, and this overlay holds the leave button and
  // the strip. With the gesture on the overlay, pressing either would ALSO have toggled
  // play.
  //
  // WHAT IS EVIDENCE FOR THAT, exactly: the page's own stage had the gesture on its
  // overlay and the reported symptom was the full-screen button pausing the video,
  // which moving the gesture to the picture fixed. And `installStage` below still keeps
  // its MOTION controller on the overlay precisely because an ancestor hears its
  // children — that is what reveals the strip when the pointer is over the picture, and
  // it is measured in the driven run. The click case in THIS window was moved for that
  // reason rather than after reproducing it separately: synthetic pointer input needs a
  // tool this machine does not have, so it is one press nobody has counted.
  const click = new Gtk.GestureClick();
  click.connect('pressed', (_g: Gtk.GestureClick, presses: number): void => {
    const stream = target.stream;
    // ONE CLICK PAUSES, TWO LEAVE — and the second undoes the first's pause, so the
    // playback state comes out of full screen where it went in. GTK delivers the single
    // press before it can know a second is coming, so both live on one gesture and the
    // double click corrects rather than pretends. `installStage` does the same in the
    // other direction.
    if (stream.playing) stream.pause();
    else stream.play();
    if (presses >= 2) close();
  });
  picture.add_controller(click);
  window.connect('close-request', () => {
    close();
    // TRUE, because `close` has already destroyed the window. `false` propagates to
    // GTK's default handler, whose job is to destroy it — a second destroy on the same
    // object. Not observed to critical, and not worth leaving as a question when the
    // signal's own contract has a word for "handled".
    return true;
  });

  window.fullscreen();
  window.present();
  return close;
}

/**
 * Wire the stage up. Answers the teardown, which the caller must run: a controller
 * left on a widget and a timeout left on the loop both outlive the screen.
 */
export function installStage(target: StageTarget): () => void {
  const overlay = target.overlay as Widget;
  const controls = target.controls as Gtk.Widget;

  let hide = 0;
  const cancelHide = (): void => {
    if (hide !== 0) {
      GLib.source_remove(hide);
      hide = 0;
    }
  };

  /**
   * Show the strip, and take it away again once the pointer has been still — unless
   * the video is PAUSED, where a strip that vanished would leave no way back.
   * `Gtk.Video` keeps its own for the same reason.
   *
   * THE TIMER KEEPS ASKING WHILE PAUSED rather than giving up on the first no, and
   * that is a defect this shape had: a one-shot that fired while paused was gone, and
   * `reveal` is only reached from a pointer or a click — so measured in the app, a
   * pause inside the first 2.5 s left the strip up for the rest of the screen's life,
   * `mapped=true` five seconds after playback had resumed with the pointer never
   * moved. Repeating, it hides within one period of the resume instead.
   */
  const reveal = (): void => {
    controls.visible = true;
    cancelHide();
    hide = GLib.timeout_add(GLib.PRIORITY_DEFAULT, HIDE_AFTER_MS, () => {
      if (!target.isPlaying()) return GLib.SOURCE_CONTINUE;
      hide = 0;
      controls.visible = false;
      return GLib.SOURCE_REMOVE;
    });
  };

  const surface = target.surface as Widget;
  const click = new Gtk.GestureClick();
  click.connect('pressed', (_gesture: Gtk.GestureClick, presses: number): void => {
    // ONE CLICK PAUSES, TWO GO FULL SCREEN, and the second click undoes the first's
    // pause so the playback state comes out where it went in. GTK delivers the
    // single press before it knows a second is coming, so this is the honest way to
    // have both on one gesture rather than pretending the first did not happen.
    if (presses >= 2) {
      target.togglePlay();
      target.requestFullscreen();
    } else {
      target.togglePlay();
    }
    reveal();
  });
  surface.add_controller(click);

  const motion = new Gtk.EventControllerMotion();
  motion.connect('motion', () => reveal());
  motion.connect('leave', () => {
    cancelHide();
    if (target.isPlaying()) controls.visible = false;
  });
  overlay.add_controller(motion);

  // NO KEY CONTROLLER HERE. Escape belongs to the full-screen window, which owns its
  // own; in the page there is nothing to escape from, and a capture-phase handler on
  // the app's window would be answering for every screen.

  reveal();

  // The two controllers and the timeout are what outlive the screen; the widgets do
  // not, so nothing here restores their state. The strip is the reconciler's, and a
  // `controlled` that flips takes the whole overlay out of the tree — there is no
  // hidden strip for a later stage to inherit.
  return (): void => {
    cancelHide();
    surface.remove_controller(click);
    overlay.remove_controller(motion);
  };
}
