// The pipeline, wearing GTK's own media interface — so the toolkit's control strip
// drives it and nothing here draws a button.
//
// ## Why this exists rather than a drawn overlay
//
// The screen asks for `nativeControls`, and until this file the shim accepted the
// prop and drew nothing: there was NO WAY TO PAUSE. The two ready-made answers were
// measured before writing anything, and RE-MEASURED on 2026-09-09 against GTK 4.22.4
// and the same feed.
//
// `Gtk.Video` plus `Gtk.MediaFile` is the short road, and it does not reach this
// stream. GTK's own media backend never prepares the FunFacts master playlist:
// `prepared=false` through 7.2 s, `duration=0`, `hasAudio=false`, `hasVideo=false`
// and `error=none`, so it does not even fail loudly. `Gtk.MediaFile` has no
// `new_for_uri` either, so the playlist can only arrive as a `Gio.File`, and the
// demuxer then resolves its segments against a URI the file abstraction has taken
// away.
//
// Nor is there a rendition to fall back to. PeerTube's own API answers
// `hasAudio=false` for every video rendition it lists — six of them, 2160p down to
// 360p, measured across three FunFacts videos — and puts the sound in an `Audio only`
// rendition of its own. Only the master playlist carries both tracks, and only
// `playbin3` plays it.
//
// `Gtk.MediaControls` is the other answer, and it wants a `GtkMediaStream` — which is
// what this is. MEASURED on the same playlist through this exact shape:
//
//     is a GdkPaintable: true      is a GtkMediaStream: true
//     t= 900ms playing=true  intrinsic=640x360  controls visible
//       → pause   t=3600ms playing=false
//       → play    t=5400ms playing=true
//
// So the toolkit gets a stream it understands, and the control strip, the seek bar
// and the volume slider are Adwaita's rather than ours.
//
// ## What has to be told, not asked
//
// A `GtkMediaStream` does not discover its own duration: until `stream_prepared` is
// called the strip has no seek bar, and until `update` is called the bar does not
// move. Both are driven from a tick while playing, because GStreamer answers
// `query_duration` only once the demuxer has read enough — measured, not on the first
// turn of the loop.
//
// AND `duration-changed` IS NOT WHAT ANNOUNCES IT, which was the obvious next move and
// is measurably useless here. MEASURED on the real feed: the pipeline posts
// `message::duration-changed` three times, all three BEFORE it is in PAUSED, and a
// `query_duration` from inside each of the three handlers answers `none`. The number
// only appears on the turn of the tick after that. So the tick is not a poll standing
// in for a signal, it is the only thing that ever knows.
//
// It does not discover the END either. MEASURED on the real feed, seeked to 843 s of
// 850: the pipeline posts EOS on its bus and then sits in PLAYING with the position
// frozen at 850.1 s, for ever. Nothing watched that bus, so the strip kept its pause
// icon over a video that had stopped and the tick re-sent the same timestamp four
// times a second. An unplayable URI is the same hole from the other end: measured, a
// 404 posts three errors — `Forbidden`, then `Internal data stream error.`, then one
// about not enough data — while the screen kept a black picture and a `0:00` clock
// indefinitely. The bus is watched now, the way `audio/backend.ts` watches its own,
// and each of the two is handed to the call GTK has for it.
//
// ## What is NOT here any more: the paintable forwards
//
// `GtkMediaStream` IS a `GdkPaintable`, and this class used to override all four
// paintable vfuncs and forward them to the sink's paintable, so that one object could
// be both what the strip drives and what the picture shows. Three measurements
// retired that, and the third is why it was a defect rather than dead weight:
//
//   - THE ASPECT FORWARD MADE THE ANSWER WORSE THAN NO FORWARD AT ALL. A `double`
//     returned from `vfunc_get_intrinsic_aspect_ratio` never reaches the caller —
//     measured on GJS 1.88.1, an override returning `1.7777777` is ENTERED (28 times,
//     instrumented, with the sink answering `1.7777777777777777` inside the call) and
//     the caller still reads `0.000`, on a plain `GObject.Object` and on a
//     `Gtk.MediaStream` subclass alike, while a `double` PROPERTY round-trips. With
//     NO override, `GdkPaintable`'s own default divides the two integer forwards and
//     answers `1.7777778`, and THAT arrives. So the forward was never "correct and costing
//     nothing": it replaced a working default with 0, which is what drew the video
//     one pixel wide (`lastSnapshotSize=1x261`).
//   - NOTHING RENDERS THIS OBJECT. The page's picture and the full-screen window's
//     picture both take the SINK's paintable, which keeps JS out of the frame path: a
//     forwarded `vfunc_snapshot` would be one JS call per frame per picture, for work
//     the sink already does natively. That is the permanent answer rather than a
//     workaround waiting on GJS.
//   - THE FORWARDING LEAKED THE WHOLE PIPELINE. It needed the sink paintable's two
//     invalidate signals re-emitted from here, and nothing ever disconnected them:
//     the paintable held a closure holding this stream, this stream holds the
//     pipeline, the pipeline holds the sink that owns the paintable. Measured at
//     `release()`, both handlers were still connected — an uncollectable ring, one per
//     visit to a video screen.
//
// With the overrides gone the `Implements: [Gdk.Paintable]` array goes with them:
// measured, GJS refuses a class that overrides a paintable vfunc without declaring
// the interface ("add Gdk.Paintable to your implements array") and accepts one that
// overrides none. The subclass is a `GdkPaintable` either way, by inheritance.

import GLib from 'gi://GLib?version=2.0';
import GObject from 'gi://GObject?version=2.0';
import Gst from 'gi://Gst?version=1.0';
import Gtk from 'gi://Gtk?version=4.0';

/** How often the seek bar's position is refreshed while playing. */
const TICK_MS = 250;

const NS_PER_US = 1000;

/**
 * The flags every seek in this file uses.
 *
 * ACCURATE AND NOT `KEY_UNIT`, which is measured and is the difference between a seek
 * bar and an ornament. On this HLS stream `FLUSH | KEY_UNIT` returns `true` and throws
 * the playhead back to the start: asked for 300 s from 19.2 s it landed at 3.7 s, and
 * asked for 10 s, 60 s and 600 s it landed at 0.00 s every time. `FLUSH | ACCURATE`
 * lands: 120 s, 45 s, 700 s, 5 s and 400 s all arrived within the three seconds the
 * sampling itself takes. `FLUSH` alone and `FLUSH | KEY_UNIT | SNAP_BEFORE` fail the
 * same way `KEY_UNIT` does, and the pipeline answers `seekable=true range 0..850s`
 * throughout — so this is the key-unit snap picking the first segment of the playlist,
 * not an unseekable stream.
 */
const SEEK_FLAGS = Gst.SeekFlags.FLUSH | Gst.SeekFlags.ACCURATE;

const PipelineStream = GObject.registerClass(
  { GTypeName: 'CorrectivPipelineStream' },
  class PipelineStream extends Gtk.MediaStream {
    private pipeline!: Gst.Element;
    private bus: Gst.Bus | null = null;
    private busHandlers: number[] = [];
    private tick = 0;
    private done = false;
    /** True only inside `bindControls`, where a seek is the strip's and not a user's. */
    private binding = false;
    /** What the pipeline says it carries, read off its stream collection. */
    private tracks = { audio: false, video: false };

    /**
     * Take the pipeline, and start listening to it.
     *
     * Private in spirit: `createVideoStream` below is the only caller and the class is
     * not exported, so nothing outside this file can hold a stream whose pipeline was
     * never attached.
     */
    attach(pipeline: Gst.Element): void {
      this.pipeline = pipeline;
      const bus = pipeline.get_bus();
      if (bus === null) return;
      this.bus = bus;
      bus.add_signal_watch();
      this.busHandlers = [
        bus.connect('message::eos', () => this.onEndOfStream()),
        bus.connect('message::error', (_bus: Gst.Bus, message: Gst.Message) =>
          this.onError(message),
        ),
        bus.connect('message::stream-collection', (_bus: Gst.Bus, message: Gst.Message) =>
          this.onStreamCollection(message),
        ),
      ];
    }

    /** Point the pipeline somewhere else, and forget what it knew. */
    open(uri: string | null): void {
      if (this.done) return;
      this.stopTicking();
      // READ BEFORE THE UNPREPARE, and that order is measured: `stream_unprepared`
      // puts `playing` to false, along with the timestamp and the duration. Read after
      // it, every video but the first went to PAUSED, because the first one had left
      // the stream prepared.
      const wanted = this.playing;
      // `prepared` is the base class's OWN property, which is why this class keeps no
      // flag of its own: `stream_prepared`/`stream_unprepared` are what move it, and a
      // second copy here would be a second truth.
      if (this.prepared) this.stream_unprepared();
      // READY rather than NULL: `playbin3` refuses a new `uri` while it runs, and NULL
      // throws away the sink's paintable binding that the picture above is holding.
      this.pipeline.set_state(Gst.State.READY);
      this.pipeline.set_property('uri', uri ?? '');
      if (uri === null || uri === '') return;
      if (!wanted) {
        this.pipeline.set_state(Gst.State.PAUSED);
        // THE TICK RUNS FOR A PAUSED OPEN TOO, or the strip has nothing to show. It is
        // what calls `stream_prepared`, and a PAUSED pipeline answers `query_duration`
        // — measured, the number arrives on the same turn the pipeline reaches PAUSED.
        // Without this the seek bar stayed dead and the clock read `0:00 / -0:01` until
        // somebody pressed play. Not reachable from this app today, where the effect
        // that calls `replace` calls `play` on the next line, which is exactly why it
        // would have sat here unnoticed.
        this.startTicking();
        return;
      }
      // THE PIPELINE IS PUSHED RATHER THAN ASKED, and this is the whole reason the
      // first attempt showed a black picture with the strip claiming to play.
      // `useVideoPlayer(url, setup)` calls `play()` in its setup callback, which runs
      // BEFORE the url is known — the app's own `/video` route fetches it — so the
      // stream is already marked playing when a url arrives, and `play()` is then a
      // no-op that never reaches `vfunc_play`: measured, `0:00 / -0:01` and no frame
      // after seven seconds.
      this.pipeline.set_state(Gst.State.PLAYING);
      this.startTicking();
      // And the flag is put back where the unprepare above cleared it, or the strip
      // would offer a play button over a running video.
      if (!this.playing) this.play();
    }

    /**
     * Run `bind` with seeks refused, for code that hands this stream to a
     * `Gtk.MediaControls`.
     *
     * MEASURED against a fake `GtkMediaStream`, with no GStreamer in the picture:
     * binding a strip to a stream that stands past ten seconds asks it to seek to
     * exactly `10.00` s — the seek adjustment's own initial upper bound, clamped and
     * written back through its value before the real duration replaces it. At 0 s,
     * 3 s and 9.5 s it asks for nothing; from 10.4 s to 500 s it asks for 10.00 s,
     * whether the piece is 60 s or 850 s long; and it does so at construction and
     * again on a later `set_media_stream`.
     *
     * The page's own strip is built while the stream still stands at 0, so it never
     * showed this. The full-screen window's second strip moved the playhead every
     * time it opened, and with the old `KEY_UNIT` flag that restarted the video.
     */
    bindControls<T>(bind: () => T): T {
      this.binding = true;
      try {
        return bind();
      } finally {
        this.binding = false;
      }
    }

    release(): void {
      if (this.done) return;
      this.done = true;
      this.stopTicking();
      // DISCONNECTED BY HAND. A handler on an object the pipeline owns holds this
      // stream, and this stream holds the pipeline, so anything left connected here is
      // a ring nothing collects — see the header for the leak that taught it.
      const bus = this.bus;
      if (bus !== null) {
        for (const id of this.busHandlers) bus.disconnect(id);
        this.busHandlers = [];
        bus.remove_signal_watch();
        this.bus = null;
      }
      this.pipeline.set_state(Gst.State.NULL);
    }

    private onEndOfStream(): void {
      if (this.done) return;
      this.stopTicking();
      // GTK's own answer: measured, it puts `playing` to false and `ended` to true, so
      // the strip offers a play button and the piece can be watched again.
      this.stream_ended();
    }

    /**
     * WHAT THE PIPELINE ACTUALLY CARRIES, so `stream_prepared` can be told it rather
     * than asserted at.
     *
     * `playbin3` has no `n-audio`/`n-video` — measured, GStreamer answers "no property
     * n-audio in object" and GJS then criticals on the empty GValue — and publishes a
     * `GstStreamCollection` on its bus instead. MEASURED on the real feed: three
     * streams, types TEXT(16), AUDIO(2) and VIDEO(4), posted twice at t=0.75 s, which
     * is BEFORE the duration becomes queryable at t=1.0 s. So the flags are known by
     * the time the tick can prepare the stream — and the two hard `true`s that stood
     * in that call were right by luck on this feed and wrong on the `Audio only`
     * rendition beside it.
     */
    private onStreamCollection(message: Gst.Message): void {
      const collection = message.parse_stream_collection();
      if (collection === null) return;
      const total = collection.get_size();
      for (let index = 0; index < total; index += 1) {
        const type = collection.get_stream(index)?.get_stream_type();
        if (type === undefined) continue;
        if ((type & Gst.StreamType.AUDIO) !== 0) this.tracks.audio = true;
        if ((type & Gst.StreamType.VIDEO) !== 0) this.tracks.video = true;
      }
    }

    /**
     * Whether the seek bar should do anything, asked of the pipeline.
     *
     * `parse_seeking` answers `[format, seekable, start, end]`, and reading the THIRD
     * element for `seekable` is how the first measurement of this reported `false` on a
     * stream that seeks perfectly well. Read correctly, the real feed answers
     * `seekable=true range=0..850s` from the same turn the duration arrives.
     */
    private isSeekable(): boolean {
      const query = Gst.Query.new_seeking(Gst.Format.TIME);
      if (!this.pipeline.query(query)) return false;
      const [, seekable] = query.parse_seeking();
      return seekable;
    }

    private onError(message: Gst.Message): void {
      const [error] = message.parse_error();
      // Every message is logged and only the first reaches the stream: measured, a
      // second `gerror` is dropped silently, and the ones after the first are the
      // misleading ones — `Internal data stream error.` is also what a missing TLS
      // backend says, which `debug/gst-probe.ts` exists to tell apart.
      console.error(
        '[desktop] video pipeline:',
        error?.message ?? 'GStreamer reported an error with no message.',
      );
      // A `message::error` carrying no error would be a GStreamer bug rather than a
      // state to handle, and `gerror` wants one it can own — which this is, because
      // `gst_message_parse_error` gives the caller a copy to keep.
      if (this.done || error === null || this.get_error() !== null) return;
      this.stopTicking();
      this.gerror(error);
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
          const length = Number(duration) / NS_PER_US;
          // A DURATION HAS TO BE POSITIVE AND FINITE before it is a seek bar.
          // `query_duration` is allowed to answer true carrying `GST_CLOCK_TIME_NONE`,
          // which arrives here as 2^64-1 nanoseconds. Not reproduced on this feed —
          // measured over 24 samples the answer went straight from `none` to 850 s and
          // never moved again — so this is a guard against the contract rather than
          // against an observation, and it costs one comparison against a strip
          // offering to seek through 584 942 years.
          if (Number.isFinite(length) && length > 0) {
            this.stream_prepared(this.tracks.audio, this.tracks.video, this.isSeekable(), length);
          }
        }
        const [hasPosition, position] = this.pipeline.query_position(Gst.Format.TIME);
        if (this.prepared && hasPosition) this.update(Number(position) / NS_PER_US);
        return GLib.SOURCE_CONTINUE;
      });
    }

    // --- Gtk.MediaStream ---

    vfunc_play(): boolean {
      if (this.done) return false;
      // A pipeline that has seen EOS ignores `set_state(PLAYING)`: measured, it stays
      // in PLAYING with the position frozen on the last frame, and only a flushing
      // seek back to 0 restarts it — measured, 1.25 s a second and a half later.
      // `ended` is still true in here; GTK clears it after this returns.
      if (this.ended) this.pipeline.seek_simple(Gst.Format.TIME, SEEK_FLAGS, 0);
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
      if (this.done || this.binding) {
        this.seek_failed();
        return;
      }
      const ok = this.pipeline.seek_simple(Gst.Format.TIME, SEEK_FLAGS, timestamp * NS_PER_US);
      if (ok) this.seek_success();
      else this.seek_failed();
    }

    vfunc_update_audio(muted: boolean, volume: number): void {
      if (this.done) return;
      this.pipeline.set_property('mute', muted);
      this.pipeline.set_property('volume', volume);
    }
  },
);

export type VideoStream = InstanceType<typeof PipelineStream>;

/**
 * A `Gtk.MediaStream` over one `playbin3`.
 *
 * The pipeline is handed in rather than made here, so the backend keeps owning the
 * element it has to tear down. A function rather than a constructor argument because
 * `GObject.registerClass` owns the construction — and going through it is what makes a
 * stream with no pipeline unreachable rather than merely undocumented.
 */
export function createVideoStream(pipeline: Gst.Element): VideoStream {
  const stream = new PipelineStream();
  stream.attach(pipeline);
  return stream;
}
