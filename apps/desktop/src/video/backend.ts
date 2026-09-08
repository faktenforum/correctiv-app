// The GTK host's video backend: one GStreamer pipeline per player, rendering into a
// `GdkPaintable` a `Gtk.Picture` can show.
//
// ## Why this exists at all, against a README that said it could not
//
// This host shipped a placeholder for video, and the reason given was that
// `@gjsify/video` is GJS-only while the ship path puts macOS and Windows on Node.
// That reason was about ONE library. It is not the only way to a moving picture on
// GTK4, and the app already proves the other way works: `src/audio/backend.ts` plays
// over GStreamer through the same `gi://Gst` this file imports.
//
// MEASURED here on GStreamer 1.28.6, on the real feed rather than a sample —
// `playbin3` + `gtk4paintablesink` on a FunFacts PeerTube master playlist:
//
//     Paintable: GstGtk4Paintable
//     Zustand: PLAYING
//       t=1s  Position 0.18s / 1146s  Bild 640x360
//       t=5s  Position 4.20s / 1146s  Bild 2560x1440
//
// The position advances with the wall clock and the intrinsic size climbs from 640x360
// to 2560x1440 four seconds in, which is HLS choosing a rendition — so adaptive
// streaming is not merely "not refused", it is happening.
//
// `Gtk.MediaFile` was tried first and is the shorter road that does not go anywhere:
// it has no `new_for_uri`, and handed a `Gio.File` for an `https://` master playlist
// it blocks rather than failing, because the demuxer resolves its segments against a
// URI the file abstraction has taken away.
//
// ## What does NOT work, and where that is decided
//
// macOS and Windows, and not for a toolkit reason: their runtime bundles ship no video
// plugins at all. MEASURED against the published `@gjsify/gtk-runtime-win32-x64@0.48.0`
// (42 GStreamer files) and `-darwin-arm64` (33), both carry `gstvideo`, which is the
// LIBRARY, and not one plugin that decodes or displays: no `videoconvert`, no `libav`,
// no `hls`/`adaptivedemux`, no `gtk4paintablesink`. The seed list they are built from
// is called `GST_AUDIO_PLUGINS` and is honest about it.
//
// So this backend is Linux-only TODAY, and that is a packaging fact rather than a
// design one: the same code would run on the other two the day their bundle carries
// the plugins.
//
// ## The shape, and why it is not the audio backend's
//
// No port, no listener, no polling timer. The audio backend implements the core's
// `AudioBackend` because a store on the other side owns playback state across screens;
// a video player is one screen's, created and released with the component that shows
// it. What it exposes is what `expo-video`'s `useVideoPlayer` promises, so the shim
// above it translates nothing.

import Gst from 'gi://Gst?version=1.0';

import { PipelineStream } from './stream.js';

/** What one player answers. The subset of `expo-video`'s player this app calls. */
export interface VideoBackend {
  /** The `GdkPaintable` a `Gtk.Picture` renders. Null when the sink is missing. */
  readonly paintable: unknown;
  /**
   * The same object as a `Gtk.MediaStream`, for `Gtk.MediaControls` to drive.
   *
   * One object rather than two, so the strip's play button and the screen's own
   * `player.play()` cannot disagree about what is playing.
   */
  readonly stream: unknown;
  play: () => void;
  pause: () => void;
  /** Point the pipeline at another URI, or at nothing. */
  replace: (uri: string | null) => void;
  release: () => void;
  readonly playing: boolean;
  /** Seconds, or 0 before the pipeline knows. */
  readonly currentTime: number;
  muted: boolean;
}

/** Named, so a caller can tell "no video plugins" from "this stream failed". */
export class VideoUnavailable extends Error {}

/**
 * A pipeline, or a throw that says which piece is absent.
 *
 * `gtk4paintablesink` is the piece worth naming: it is gst-plugins-rs rather than
 * base, so its absence is the ordinary case on a machine that has GStreamer but not
 * the Rust plugins — and the failure without this check is a null element and a
 * `TypeError` three lines later.
 */
export function createVideoPlayer(): VideoBackend {
  if (!Gst.is_initialized()) Gst.init([]);

  const sink = Gst.ElementFactory.make('gtk4paintablesink', null);
  if (sink === null) {
    throw new VideoUnavailable(
      'gtk4paintablesink is not in this GStreamer registry. It ships in gst-plugins-rs; ' +
        'without it there is no GdkPaintable to render into.',
    );
  }
  const pipeline = Gst.ElementFactory.make('playbin3', null);
  if (pipeline === null) {
    throw new VideoUnavailable('playbin3 is not in this GStreamer registry.');
  }
  pipeline.set_property('video-sink', sink);

  const inner = (sink as unknown as { get_property(name: string): unknown }).get_property(
    'paintable',
  );

  // THE STREAM DRIVES, THE SINK PAINTS, and the split is measured rather than
  // chosen. `GtkMediaStream` implements `GdkPaintable`, so the stream could have been
  // the picture's paintable too — and it cannot be: a `double` returned from
  // `vfunc_get_intrinsic_aspect_ratio` never reaches the caller, so `Gtk.Picture`
  // reads an aspect of 0 and draws the video one pixel wide. `stream.ts` carries the
  // instrumented measurement.
  //
  // What is NOT split is the playing state: the stream owns it, `play`/`pause` below
  // go through it, and the strip drives the same object.
  const stream = new PipelineStream();
  stream.attach(pipeline, inner as never);

  let released = false;

  return {
    paintable: inner,
    stream,
    // NO `wanted` FLAG HERE. The stream's own `playing` is the one record of what the
    // user asked for, and `open` puts the pipeline where that record already stands —
    // so a `replace` after a `play` needs no second `play` to follow it.
    play(): void {
      if (released) return;
      stream.play();
    },
    pause(): void {
      if (released) return;
      stream.pause();
    },
    replace(uri: string | null): void {
      if (released) return;
      stream.open(uri);
    },
    release(): void {
      if (released) return;
      released = true;
      stream.release();
    },
    get playing(): boolean {
      return released ? false : stream.playing;
    },
    get currentTime(): number {
      if (released) return 0;
      const [ok, position] = pipeline.query_position(Gst.Format.TIME);
      return ok ? Number(position) / Number(Gst.SECOND) : 0;
    },
    get muted(): boolean {
      return released ? false : stream.muted;
    },
    set muted(value: boolean) {
      if (!released) stream.muted = value;
    },
  };
}
