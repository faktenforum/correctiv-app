// The pipeline, wearing GTK's own media interface — so the toolkit's control strip
// drives it and nothing here draws a button.
//
// ## Why this exists rather than a drawn overlay
//
// The screen asks for `nativeControls`, and until this file the shim accepted the
// prop and drew nothing: there was NO WAY TO PAUSE. The two ready-made answers were
// measured before writing anything.
//
// `Gtk.Video` plus `Gtk.MediaFile` is the short road, and it does not reach this
// stream. MEASURED on the real FunFacts master playlist, GTK's own media backend
// never prepares it — `prepared=false` for 6.4 s, `duration=0`, `hasAudio=false`,
// `hasVideo=false`, and no error either, so it does not even fail loudly. Nor is
// there a rendition to fall back to: PeerTube's own API answers `hasAudio=false` for
// every video file it lists (2160p, 1440p, 1080p, 720p), because it splits the sound
// into a rendition of its own. Only the master playlist carries both tracks, and
// only `playbin3` plays it.
//
// `Gtk.MediaControls` is the other, and it needs a `GtkMediaStream` — which is what
// this is. MEASURED on the same playlist through this exact shape:
//
//     is a GdkPaintable: true      is a GtkMediaStream: true
//     t= 900ms playing=true  intrinsic=640x360  controls visible
//       → pause   t=3600ms playing=false
//       → play    t=5400ms playing=true
//
// So the toolkit gets a stream it understands, and the control strip, the seek bar
// and the volume slider are Adwaita's rather than ours.
//
// ## The two interfaces, and the trap between them
//
// `GtkMediaStream` IS a `GdkPaintable`, and a subclass must say so: without
// `Implements: [Gdk.Paintable]` GJS refuses the class outright — "does not implement
// Gdk.Paintable, add Gdk.Paintable to your implements array" — which is the good
// failure. The frames belong to the sink's own paintable, so every paintable vfunc
// forwards to it and its two invalidate signals are re-emitted from here; a
// forwarding that dropped them would leave a still image.
//
// ## What has to be told, not asked
//
// A `GtkMediaStream` does not discover its own duration: until `stream_prepared` is
// called the strip has no seek bar, and until `update` is called the bar does not
// move. Both are driven from a tick while playing, because GStreamer answers
// `query_duration` only once the demuxer has read enough — measured, not on the first
// turn of the loop.

import Gdk from 'gi://Gdk?version=4.0';
import GLib from 'gi://GLib?version=2.0';
import GObject from 'gi://GObject?version=2.0';
import Gst from 'gi://Gst?version=1.0';
import Gtk from 'gi://Gtk?version=4.0';

/** How often the seek bar's position is refreshed while playing. */
const TICK_MS = 250;

const NS_PER_US = 1000;

/** Just enough of the sink's paintable to forward to it. */
type InnerPaintable = {
  snapshot(snapshot: Gdk.Snapshot, width: number, height: number): void;
  get_intrinsic_width(): number;
  get_intrinsic_height(): number;
  get_intrinsic_aspect_ratio(): number;
  connect(signal: string, handler: () => void): number;
};

/**
 * A `Gtk.MediaStream` over one `playbin3`, painting what its sink paints.
 *
 * The pipeline and the sink's paintable are handed in rather than made here, so the
 * backend keeps owning the element it has to tear down.
 */
export const PipelineStream = GObject.registerClass(
  { GTypeName: 'CorrectivPipelineStream', Implements: [Gdk.Paintable] },
  class PipelineStream extends Gtk.MediaStream {
    private pipeline!: Gst.Element;
    private inner!: InnerPaintable;
    private tick = 0;
    private done = false;

    /** Not a constructor argument: `registerClass` owns the construction. */
    attach(pipeline: Gst.Element, inner: InnerPaintable): void {
      this.pipeline = pipeline;
      this.inner = inner;
      inner.connect('invalidate-contents', () => this.invalidate_contents());
      inner.connect('invalidate-size', () => this.invalidate_size());
    }

    /** Point the pipeline somewhere else, and forget what it knew. */
    open(uri: string | null): void {
      if (this.done) return;
      this.stopTicking();
      // `prepared` is the base class's OWN property, which is why this class keeps no
      // flag of its own: `stream_prepared`/`stream_unprepared` are what move it, and a
      // second copy here would be a second truth.
      if (this.prepared) this.stream_unprepared();
      // READY rather than NULL: `playbin3` refuses a new `uri` while it runs, and NULL
      // throws away the sink's paintable binding that the picture above is holding.
      this.pipeline.set_state(Gst.State.READY);
      this.pipeline.set_property('uri', uri ?? '');
      if (uri === null || uri === '') return;
      // THE STREAM'S OWN `playing` IS THE AUTHORITY HERE, and this line is the whole
      // reason the first attempt showed a black picture with the strip claiming to
      // play. `useVideoPlayer(url, setup)` calls `play()` in its setup callback, which
      // runs BEFORE the url is known — the app's own `/video` route fetches it — so the
      // stream is already marked playing by the time a url arrives. Calling `play()`
      // again is then a no-op, `vfunc_play` never runs, and the pipeline sits in READY
      // for ever: measured, `0:00 / -0:01` and no frame after seven seconds. So the
      // pipeline is put where the stream already says it is, rather than waiting to be
      // told a second time.
      this.pipeline.set_state(this.playing ? Gst.State.PLAYING : Gst.State.PAUSED);
      if (this.playing) this.startTicking();
    }

    release(): void {
      if (this.done) return;
      this.done = true;
      this.stopTicking();
      this.pipeline.set_state(Gst.State.NULL);
    }

    private stopTicking(): void {
      if (this.tick !== 0) {
        GLib.source_remove(this.tick);
        this.tick = 0;
      }
    }

    /**
     * Tell the strip where the playhead is, and how long the piece is once that is
     * knowable. Both numbers are microseconds; GStreamer answers nanoseconds.
     */
    private startTicking(): void {
      if (this.tick !== 0 || this.done) return;
      this.tick = GLib.timeout_add(GLib.PRIORITY_DEFAULT, TICK_MS, () => {
        if (this.done) {
          this.tick = 0;
          return GLib.SOURCE_REMOVE;
        }
        const [hasDuration, duration] = this.pipeline.query_duration(Gst.Format.TIME);
        if (!this.prepared && hasDuration) {
          this.stream_prepared(true, true, true, Number(duration) / NS_PER_US);
        }
        const [hasPosition, position] = this.pipeline.query_position(Gst.Format.TIME);
        if (this.prepared && hasPosition) this.update(Number(position) / NS_PER_US);
        return GLib.SOURCE_CONTINUE;
      });
    }

    // --- Gtk.MediaStream ---

    vfunc_play(): boolean {
      if (this.done) return false;
      this.pipeline.set_state(Gst.State.PLAYING);
      this.startTicking();
      return true;
    }

    vfunc_pause(): void {
      if (this.done) return;
      this.pipeline.set_state(Gst.State.PAUSED);
      // The tick stays: a paused stream still reports where it stands, and the strip
      // reads that when the user drags the bar.
    }

    vfunc_seek(timestamp: number): void {
      if (this.done) {
        this.seek_failed();
        return;
      }
      const ok = this.pipeline.seek_simple(
        Gst.Format.TIME,
        Gst.SeekFlags.FLUSH | Gst.SeekFlags.KEY_UNIT,
        timestamp * NS_PER_US,
      );
      if (ok) this.seek_success();
      else this.seek_failed();
    }

    vfunc_update_audio(muted: boolean, volume: number): void {
      if (this.done) return;
      this.pipeline.set_property('mute', muted);
      this.pipeline.set_property('volume', volume);
    }

    // --- Gdk.Paintable, forwarded to the sink's own ---
    //
    // FORWARDED, AND NOT PAINTED THROUGH. The picture above renders the SINK's
    // paintable directly, because one of these three forwards cannot work: a `double`
    // returned from `vfunc_get_intrinsic_aspect_ratio` never reaches the caller.
    //
    // MEASURED, with the override instrumented: it is called 28 times, the sink
    // answers it `1.7777777777777777` inside the call, the override then returns a
    // literal `1.7777777` — and `stream.get_intrinsic_aspect_ratio()` still answers
    // `0.000`. The two integer forwards beside it work (640x360 arrives), so it is
    // that return value and not the dispatch. `Gtk.Picture` reads the aspect for
    // `content-fit`, gets 0, and snapshots the video ONE PIXEL WIDE — measured,
    // `lastSnapshotSize=1x261`, which is the thin line this file first shipped.
    //
    // They stay because they are correct and cost nothing: the day that marshalling
    // works, the stream can be the picture's paintable and this comment retires.

    vfunc_snapshot(snapshot: Gdk.Snapshot, width: number, height: number): void {
      this.inner.snapshot(snapshot, width, height);
    }

    vfunc_get_intrinsic_width(): number {
      return this.inner.get_intrinsic_width();
    }

    vfunc_get_intrinsic_height(): number {
      return this.inner.get_intrinsic_height();
    }

    vfunc_get_intrinsic_aspect_ratio(): number {
      return this.inner.get_intrinsic_aspect_ratio();
    }
  },
);

export type PipelineStreamInstance = InstanceType<typeof PipelineStream>;
