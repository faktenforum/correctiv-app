// What a video pipeline can be ASKED, so `video/stream.ts` stops asserting it.
//
// `Gtk.MediaStream.stream_prepared(has_audio, has_video, seekable, duration)` takes
// four facts and the first three used to be a literal `true` each. This probe is where
// they came from. Beside `audio-probe.ts`, which drives the audio port, and
// `gst-probe.ts`, which asks the registry what it can decode at all.
//
// Run:  npm run video-probe -w @correctiv/desktop
//
// MEASURED 2026-09-09, GStreamer 1.28.6 / GTK 4.22.4 / GJS 1.88.1, on a real FunFacts
// master playlist:
//
//   1. `playbin3` HAS NO `n-audio` / `n-video`. GStreamer answers "no property n-audio
//      in object" and GJS then criticals on the empty GValue. The streams arrive as a
//      `GstStreamCollection` on the bus instead: three of them, types TEXT(16),
//      AUDIO(2), VIDEO(4), posted twice at t=0.75 s.
//   2. `seekable` is true, range 0..850 s. `parse_seeking()` answers
//      `[format, seekable, start, end]`, and reading index 2 for `seekable` is how the
//      first run of this probe reported `false` on a stream that seeks fine.
//   3. The duration goes from `none` to 850 s in one step and never moves again across
//      24 samples. `query_duration` was never observed answering true with a bogus
//      value.
//   4. `duration-changed` IS POSTED, three times, and all three are useless: each one
//      arrives before the pipeline reaches PAUSED, and a `query_duration` from inside
//      the handler answers `none`. The tick is not a poll standing in for a signal.
//
// And one about the probe rather than the app: WITHOUT `Gtk.init()` the
// `gtk4paintablesink` refuses to start and playsink posts "Das konfigurierte Videoziel
// »sink« funktioniert nicht", followed by hlsdemux's "Internal data stream error." —
// which reads like a broken stream and is a missing toolkit.

import GLib from 'gi://GLib?version=2.0';
import Gst from 'gi://Gst?version=1.0';
import Gtk from 'gi://Gtk?version=4.0';

const URI =
  'https://tube.funfacts.de/media/streaming-playlists/hls/c8aadc61-9366-4576-a418-5e68922d59b1/9da23861-f433-4ffe-8a6c-d303dec7c831-master.m3u8';

// GTK FIRST: without it `gtk4paintablesink` refuses to start and playsink posts
// "Das konfigurierte Videoziel »sink« funktioniert nicht", which reads like a broken
// stream and is a missing toolkit.
Gtk.init();
if (!Gst.is_initialized()) Gst.init([]);

const pipeline = Gst.ElementFactory.make('playbin3', 'probe');
if (pipeline === null) throw new Error('no playbin3');
const sink = Gst.ElementFactory.make('gtk4paintablesink', 'sink');
print(`gtk4paintablesink: ${sink === null ? 'MISSING' : 'present'}`);
if (sink !== null) {
  pipeline.set_property('video-sink', sink);
  // Pulled the way the app pulls it, so the sink has a paintable to draw into.
  // `get_property` here wants the GValue out-argument the other bindings hide, so
  // the paintable is read the way `video/backend.ts` reads it.
  const paintable = (sink as unknown as { get_property: (name: string) => unknown }).get_property(
    'paintable',
  );
  print(`paintable: ${paintable === null ? 'MISSING' : 'present'}`);
}
pipeline.set_property('uri', URI);

const bus = pipeline.get_bus();
if (bus === null) throw new Error('no bus');
bus.add_signal_watch();
bus.connect('message::error', (_b: Gst.Bus, m: Gst.Message) => {
  const [error, debug] = m.parse_error();
  print(`ERROR from ${m.src?.name ?? '?'}: ${error?.message ?? '?'} | ${debug ?? ''}`);
});
bus.connect('message::warning', (_b: Gst.Bus, m: Gst.Message) => {
  const [error] = m.parse_warning();
  print(`WARNING from ${m.src?.name ?? '?'}: ${error?.message ?? '?'}`);
});
bus.connect('message::eos', () => print('EOS'));
bus.connect('message::state-changed', (_b: Gst.Bus, m: Gst.Message) => {
  if (m.src !== pipeline) return;
  const [, next] = m.parse_state_changed();
  print(`pipeline state -> ${next === null ? '?' : Gst.Element.state_get_name(next)}`);
});
bus.connect('message::stream-collection', (_b: Gst.Bus, m: Gst.Message) => {
  const collection = m.parse_stream_collection();
  if (collection === null) {
    print('stream-collection: none');
    return;
  }
  const total = collection.get_size();
  const kinds: string[] = [];
  for (let i = 0; i < total; i += 1) {
    const stream = collection.get_stream(i);
    kinds.push(stream === null ? '?' : String(stream.get_stream_type()));
  }
  print(`stream-collection: ${total} streams, types [${kinds.join(', ')}]`);
});
bus.connect('message::duration-changed', () => {
  const [has, value] = pipeline.query_duration(Gst.Format.TIME);
  print(`duration-changed posted; query now ${has ? String(value) : 'none'}`);
});

const ret = pipeline.set_state(Gst.State.PLAYING);
print(`set_state(PLAYING) -> ${ret}`);

const loop = new GLib.MainLoop(null, false);
let turn = 0;
const durations = new Set<string>();

GLib.timeout_add(GLib.PRIORITY_DEFAULT, 500, () => {
  turn += 1;
  const [hasDuration, duration] = pipeline.query_duration(Gst.Format.TIME);
  const [hasPosition, position] = pipeline.query_position(Gst.Format.TIME);

  const query = Gst.Query.new_seeking(Gst.Format.TIME);
  const asked = pipeline.query(query);
  // `[format, seekable, start, end]` -- reading index 2 for `seekable` is how the
  // first run of this probe reported `seekable=0` on a stream that seeks fine.
  const [, seekable, segStart, segEnd] = query.parse_seeking();

  durations.add(hasDuration ? String(duration) : 'none');
  print(
    [
      `t=${(turn * 0.5).toFixed(1)}s`,
      `dur=${hasDuration ? String(duration) : 'none'}`,
      `durSec=${hasDuration ? (Number(duration) / 1e9).toFixed(3) : '-'}`,
      `pos=${hasPosition ? (Number(position) / 1e9).toFixed(2) : '-'}`,
      `seekQuery=${asked}`,
      `seekable=${seekable}`,
      `range=${Number(segStart) / 1e9}..${Number(segEnd) / 1e9}`,
    ].join('  '),
  );

  if (turn >= 24) {
    print('--- summary ---');
    print(`distinct duration answers: ${[...durations].join(' | ')}`);
    pipeline.set_state(Gst.State.NULL);
    loop.quit();
    return GLib.SOURCE_REMOVE;
  }
  return GLib.SOURCE_CONTINUE;
});

loop.run();
