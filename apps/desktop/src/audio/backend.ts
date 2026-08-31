// The GTK host's audio backend: GStreamer translated into the core's `AudioBackend`
// port. The state machine on the other side of that port lives in
// `@correctiv/app-core/stores/audio`, where every host shares it.
//
// ## The port's contract, and the crash it is named after
//
// `AudioBackend` states that a COMMAND must never call the status listener
// synchronously, and it says why: a backend once emitted from inside `pause()`, which
// re-entered the store's handler mid-decision, reached the same conclusion again and
// called `pause()` again — `RangeError: Maximum call stack size exceeded`, a minute
// into an episode, past a green test suite (ADR 0006). That is not a hazard this
// backend happens to avoid; it is the one it is most exposed to, because GStreamer's
// `set_state` is asynchronous and the temptation is to report the new state right
// after asking for it.
//
// So the rule here is mechanical: `emit()` is called from exactly two places, the
// 500 ms timer and the bus watch. `play`, `pause`, `setRate` and `release` change
// GStreamer state and return. Nothing else may call `emit`.
//
// ## Why a polling timer is the right shape rather than a shortfall
//
// The port documents `PlaybackStatus` as modelled on what expo-audio reports, and
// says outright that "a poorer backend synthesises the same fields from a polling
// timer, and that translation is its own job". GStreamer is that backend: position is
// a QUERY (`query_position`), not an event. 500 ms is expo-audio's own
// `updateInterval` on the phone, so the store sees ticks at the same rate it was
// tuned against.
//
// ## What is genuinely missing, named rather than faked
//
// LOCK-SCREEN / MPRIS METADATA. `nowPlaying` is accepted and dropped. The desktop
// counterpart is MPRIS over D-Bus (`org.mpris.MediaPlayer2`), which would put the
// track in GNOME's own media controls and is a real, reachable piece of work — it is
// simply not done here. This is the same shape as the NativeScript host's
// lock-screen gap that ADR 0006 recorded rather than hid: named in the file that
// would implement it.

import GLib from 'gi://GLib?version=2.0';
import Gst from 'gi://Gst?version=1.0';

import type { AudioBackend, NowPlaying, PlaybackStatus } from '@correctiv/app-core';

/** expo-audio's own interval on the phone, so the store's timing is unchanged. */
const TICK_MS = 500;

const NANOS_PER_SEC = 1_000_000_000;

let pipeline: Gst.Element | null = null;
let listener: ((status: PlaybackStatus) => void) | null = null;
let tickSource = 0;
/** Sticky until the next `load`, matching the core's sticky-error state. */
let lastError: string | null = null;
let finishedPending = false;
let buffering = false;
let rate = 1;

function seconds(query: (format: Gst.Format) => [boolean, number]): number {
  try {
    const [ok, nanos] = query(Gst.Format.TIME);
    if (!ok || nanos < 0) return 0;
    return nanos / NANOS_PER_SEC;
  } catch {
    return 0;
  }
}

/**
 * One tick, read off the pipeline.
 *
 * A live stream is identified by having no duration: Icecast reports none, which is
 * also what `PlaybackStatus.durationSec` documents as `0` for live. That makes `live`
 * derived rather than declared, which is right — the same URL is a live stream
 * because of what it is, not because a caller said so.
 */
function snapshot(): PlaybackStatus {
  const active = pipeline;
  if (active === null) {
    return {
      playing: false,
      loaded: false,
      buffering: false,
      positionSec: 0,
      durationSec: 0,
      finished: false,
      live: false,
      error: lastError,
    };
  }

  const [, state] = active.get_state(0);
  const durationSec = seconds((format) => active.query_duration(format));
  const finished = finishedPending;
  finishedPending = false;

  return {
    playing: state === Gst.State.PLAYING,
    loaded: state === Gst.State.PLAYING || state === Gst.State.PAUSED,
    buffering,
    positionSec: seconds((format) => active.query_position(format)),
    durationSec,
    finished,
    live: durationSec === 0 && state !== Gst.State.NULL,
    error: lastError,
  };
}

/** The ONLY function that calls the listener. See the header. */
function emit(): void {
  listener?.(snapshot());
}

function startTicking(): void {
  if (tickSource !== 0) return;
  tickSource = GLib.timeout_add(GLib.PRIORITY_DEFAULT, TICK_MS, () => {
    emit();
    return GLib.SOURCE_CONTINUE;
  });
}

function stopTicking(): void {
  if (tickSource === 0) return;
  GLib.Source.remove(tickSource);
  tickSource = 0;
}

/**
 * Build the pipeline once and keep it for the process.
 *
 * `playbin3` rather than a hand-built pipeline: it negotiates the demuxer, decoder
 * and sink for whatever the URL turns out to be, which for this app is an Icecast MP3
 * stream and a set of podcast enclosures. A hand-built pipeline would have to guess.
 *
 * The instance is module-level and NOT tied to a component, for the same reason the
 * Expo host uses `createAudioPlayer` rather than the `useAudioPlayer` hook: playback
 * has to survive navigation and tab changes, and a hook would release it on unmount.
 */
function instance(): Gst.Element {
  if (pipeline !== null) return pipeline;

  // `[]` rather than `null`: the introspected signature is `string[] | undefined`,
  // and GStreamer takes no arguments from this process.
  if (!Gst.is_initialized()) Gst.init([]);

  const created = Gst.ElementFactory.make('playbin3', 'correctiv-player');
  if (created === null) {
    throw new Error(
      '[audio] GStreamer has no `playbin3` element. That means gstreamer1-plugins-base ' +
        'is not installed, and no audio can play. Install the GStreamer base and good ' +
        'plugin sets.',
    );
  }
  pipeline = created;

  const bus = created.get_bus();
  if (bus !== null) {
    bus.add_signal_watch();
    // Every one of these emits, and that is allowed: a bus message is GStreamer
    // reporting what it DID, which is exactly what `onStatus` is for. None of them
    // is reachable from inside a command.
    bus.connect('message::error', (_bus: Gst.Bus, message: Gst.Message) => {
      const [error] = message.parse_error();
      // `parse_error` is typed as possibly null. A `message::error` with no error
      // attached would be a GStreamer bug rather than a state to handle, but the
      // sticky-error field is a string and silently storing `undefined` there would
      // put the player into an error state with nothing to show for it.
      lastError = error?.message ?? 'GStreamer reported an error with no message.';
      console.error('[audio] GStreamer error:', lastError);
      emit();
    });
    bus.connect('message::eos', () => {
      finishedPending = true;
      emit();
    });
    bus.connect('message::buffering', (_bus: Gst.Bus, message: Gst.Message) => {
      const percent = message.parse_buffering();
      buffering = percent < 100;
      emit();
    });
    bus.connect('message::state-changed', (_bus: Gst.Bus, message: Gst.Message) => {
      // Only the pipeline's own transitions; every element on the bus reports its own.
      if (message.src === created) emit();
    });
  }

  return created;
}

export const gstAudio: AudioBackend = {
  load(url, nowPlaying: NowPlaying) {
    const active = instance();
    lastError = null;
    finishedPending = false;
    buffering = false;
    // A new source needs the pipeline back to NULL, or `uri` is ignored: it is only
    // read while going from READY upwards. Measured symptom of getting this wrong is
    // the previous track continuing to play with the new title on screen.
    active.set_state(Gst.State.NULL);
    active.set_property('uri', resolveUri(url));
    active.set_state(Gst.State.PAUSED);
    startTicking();
    // `nowPlaying` is dropped. See the header: MPRIS is the desktop counterpart and
    // is not implemented.
    void nowPlaying;
    return Promise.resolve();
  },

  play() {
    instance().set_state(Gst.State.PLAYING);
    startTicking();
  },

  pause() {
    pipeline?.set_state(Gst.State.PAUSED);
  },

  seekTo(sec) {
    const active = pipeline;
    if (active === null) return Promise.resolve();
    active.seek(
      rate,
      Gst.Format.TIME,
      Gst.SeekFlags.FLUSH | Gst.SeekFlags.KEY_UNIT,
      Gst.SeekType.SET,
      Math.max(0, sec) * NANOS_PER_SEC,
      Gst.SeekType.NONE,
      -1,
    );
    return Promise.resolve();
  },

  setRate(next) {
    const active = pipeline;
    rate = next;
    if (active === null) return;
    // GStreamer changes rate through a seek at the current position; there is no
    // rate property on playbin.
    const [ok, position] = active.query_position(Gst.Format.TIME);
    active.seek(
      next,
      Gst.Format.TIME,
      Gst.SeekFlags.FLUSH,
      Gst.SeekType.SET,
      ok && position >= 0 ? position : 0,
      Gst.SeekType.NONE,
      -1,
    );
  },

  release() {
    // The port's own reason: a paused live stream keeps buffering otherwise, and an
    // Icecast connection held open is a real cost on the other end.
    pipeline?.set_state(Gst.State.NULL);
    stopTicking();
    buffering = false;
  },

  onStatus(next) {
    listener = next;
  },
};

/**
 * A core track url -> something `playbin3` can open.
 *
 * The core hands the url verbatim, and it is one of two shapes: an https stream, or a
 * bundled path like `assets/audio/sample-episode.mp3` that only the host can resolve.
 * The Expo host resolves the second through Metro's asset registry; here it is a file
 * on disk, and a `file:` URI is what GStreamer wants.
 *
 * Unresolvable is a THROW naming the path, matching what the Expo host's `sources.ts`
 * does. A silent failure here is a play button that does nothing.
 */
function resolveUri(url: string): string {
  if (/^https?:\/\//.test(url)) return url;

  const assets = GLib.getenv('CORRECTIV_DESKTOP_ASSETS');
  if (assets === null) {
    throw new Error(
      `[audio] "${url}" is a bundled asset path, and CORRECTIV_DESKTOP_ASSETS is not set, ` +
        'so there is nowhere to resolve it from. `npm start -w @correctiv/desktop` sets it; ' +
        'see apps/desktop/README.md.',
    );
  }
  // Absolutised against the working directory, because `filename_to_uri` refuses a
  // relative path outright (`GLib.ConvertError: … is not an absolute path`) and the
  // natural thing to put in the env var is `../mobile`. Resolving it here means the
  // convenient spelling works instead of producing a message about URI conversion,
  // which points at the wrong thing entirely.
  const root = GLib.path_is_absolute(assets)
    ? assets
    : GLib.build_filenamev([GLib.get_current_dir(), assets]);
  const path = GLib.build_filenamev([root, url]);
  if (!GLib.file_test(path, GLib.FileTest.EXISTS)) {
    throw new Error(`[audio] bundled asset "${url}" is not at "${path}".`);
  }
  return GLib.filename_to_uri(path, null);
}

/** Tests only: drop the pipeline so the next load builds a fresh one. */
export function resetGstAudio(): void {
  pipeline?.set_state(Gst.State.NULL);
  stopTicking();
  pipeline = null;
  listener = null;
  lastError = null;
}
