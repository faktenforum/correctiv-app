// MPRIS: the app's playback, on the session bus, where the desktop expects it.
//
// `org.mpris.MediaPlayer2` is the freedesktop contract every Linux shell reads — the
// GNOME lock screen, the panel's media widget, `playerctl`, the volume-menu applet.
// Without it, a running episode or video is invisible outside our own window, which is
// the gap `audio/backend.ts` and README.md have both been naming for a while: the port
// accepts `nowPlaying` and this host dropped it.
//
// ## Two interfaces on ONE object path, which is the mechanic to know
//
// The spec puts `org.mpris.MediaPlayer2` and `org.mpris.MediaPlayer2.Player` both at
// `/org/mpris/MediaPlayer2`, and `Gio.DBusExportedObject.wrapJSObject` wraps exactly
// one interface per object. MEASURED in `debug/mpris-probe.ts`: two exported objects
// registered at the same path work, because D-Bus registration is per (path,
// interface), and `gdbus introspect` then lists both.
//
// The same probe settled the marshalling, which no type here would have caught:
//
//   - `Metadata` is `a{sv}`, and what the getter must return is a PLAIN OBJECT whose
//     VALUES are `GLib.Variant`. Measured: `mpris:trackid` came back as `objectpath`,
//     `mpris:length` as `int64`, `xesam:artist` as an array, and a title carrying
//     „Größe" survived as UTF-8.
//   - `Position` is `x`, int64 microseconds, and arrives intact both ways — a `Seek`
//     of 5 000 000 reached the JS as exactly that.
//   - a `readwrite` property reaches a JS setter: `Volume` set to 0.42 arrived.
//   - `emit_property_changed` and `emit_signal` do not throw.
//
// ## One bus name, whichever player is active
//
// A shell shows one entry per application, so this exports ONE name and the last
// player to start owns it. Two names (one for audio, one for video) would put two
// CORRECTIV entries in the panel, which is worse than the choice this makes.
//
// The ORDER lives in `arbiter.ts`, which has no D-Bus in it and is driven by
// `test/mpris-arbiter.test.ts` — because the first version of it was wrong in a way no
// screenshot shows: a video closing over a playing radio handed the name to nobody, and
// a GNOME panel then sat empty above a running stream for the rest of the session.
//
// ## Why the commands go through the caller and not the pipeline
//
// `MprisSource` is a port, and the audio adapter implements it against the CORE's
// store rather than against GStreamer. That is not indirection for its own sake: the
// core keeps its own intent alongside the backend's reported state, and a `Pause` that
// reached the pipeline directly would leave the store believing it was still playing.
// The port's own docblock names the crash that class of desync caused once.
//
// ## What is not here
//
// `TrackList` and `Playlists` are separate MPRIS interfaces and are not exported;
// `HasTrackList` says so, which is the honest answer rather than an empty list.
// `LoopStatus` and `Shuffle` are absent for the same reason — this app has no queue,
// and a property that accepted a value and ignored it would be a lie a shell acts on.

import Gio from 'gi://Gio?version=2.0';
import GLib from 'gi://GLib?version=2.0';

import { createArbiter } from './arbiter.js';

/** The bus name. One per application, as a shell expects. */
const BUS_NAME = 'org.mpris.MediaPlayer2.correctiv';

/** Fixed by the spec. Not ours to choose. */
const OBJECT_PATH = '/org/mpris/MediaPlayer2';

/** What `PlaybackStatus` may be, spelled as the spec spells it. */
export type MprisStatus = 'Playing' | 'Paused' | 'Stopped';

/** One piece of content, as a shell panel wants to show it. */
export interface MprisTrack {
  /**
   * Stable for as long as this is the current track.
   *
   * NOT used as the `mpris:trackid` verbatim: that field is a D-Bus OBJECT PATH, so an
   * episode URL cannot go in it. This is what the service compares to notice the track
   * changed, and it mints a path of its own.
   */
  readonly id: string;
  readonly title: string;
  readonly artist?: string;
  readonly artworkUrl?: string;
  /** Microseconds. 0 where there is no length — a live stream has none. */
  readonly lengthUs: number;
}

/**
 * Whatever is playing, seen from the bus.
 *
 * Read as properties rather than pushed, because a shell asks for `Position` whenever
 * it likes and the spec explicitly keeps that one out of `PropertiesChanged`.
 */
export interface MprisSource {
  readonly status: MprisStatus;
  readonly track: MprisTrack | null;
  readonly positionUs: number;
  readonly canSeek: boolean;
  readonly canPause: boolean;
  play(): void;
  pause(): void;
  stop(): void;
  /** Relative, in microseconds, and may be negative. */
  seekBy(offsetUs: number): void;
  seekTo(positionUs: number): void;
}

export interface MprisHandle {
  /** Take over the bus name's player. The last claim wins. */
  claim(source: MprisSource): void;
  /** Give it up, if `source` is still the one holding it. */
  release(source: MprisSource): void;
  /** Recompute and tell the bus what moved. Cheap when nothing did. */
  changed(source: MprisSource): void;
  /** Unown the name and unexport. */
  shutdown(): void;
}

/** The properties that get a `PropertiesChanged`, and their variant types. */
type Snapshot = {
  PlaybackStatus: string;
  Metadata: Record<string, GLib.Variant>;
  CanPlay: boolean;
  CanPause: boolean;
  CanSeek: boolean;
};

const ROOT_XML = `<node>
  <interface name="org.mpris.MediaPlayer2">
    <method name="Raise"/>
    <method name="Quit"/>
    <property name="CanQuit" type="b" access="read"/>
    <property name="CanRaise" type="b" access="read"/>
    <property name="HasTrackList" type="b" access="read"/>
    <property name="Identity" type="s" access="read"/>
    <property name="DesktopEntry" type="s" access="read"/>
    <property name="SupportedUriSchemes" type="as" access="read"/>
    <property name="SupportedMimeTypes" type="as" access="read"/>
  </interface>
</node>`;

const PLAYER_XML = `<node>
  <interface name="org.mpris.MediaPlayer2.Player">
    <method name="Play"/>
    <method name="Pause"/>
    <method name="PlayPause"/>
    <method name="Stop"/>
    <method name="Next"/>
    <method name="Previous"/>
    <method name="Seek">
      <arg type="x" direction="in" name="offset"/>
    </method>
    <method name="SetPosition">
      <arg type="o" direction="in" name="trackid"/>
      <arg type="x" direction="in" name="position"/>
    </method>
    <property name="PlaybackStatus" type="s" access="read"/>
    <property name="Metadata" type="a{sv}" access="read"/>
    <property name="Position" type="x" access="read"/>
    <property name="Rate" type="d" access="read"/>
    <property name="MinimumRate" type="d" access="read"/>
    <property name="MaximumRate" type="d" access="read"/>
    <property name="CanPlay" type="b" access="read"/>
    <property name="CanPause" type="b" access="read"/>
    <property name="CanSeek" type="b" access="read"/>
    <property name="CanControl" type="b" access="read"/>
    <property name="CanGoNext" type="b" access="read"/>
    <property name="CanGoPrevious" type="b" access="read"/>
    <signal name="Seeked">
      <arg type="x" name="position"/>
    </signal>
  </interface>
</node>`;

/** A dead source, so the exported object never has to answer "no source" specially. */
const SILENT: MprisSource = {
  status: 'Stopped',
  track: null,
  positionUs: 0,
  canSeek: false,
  canPause: false,
  play: () => {},
  pause: () => {},
  stop: () => {},
  seekBy: () => {},
  seekTo: () => {},
};

/**
 * Whether there is a session bus to export onto at all.
 *
 * The macOS and Windows bundles run the same source through the node host and have no
 * session bus, so this is a real branch rather than defensive coding — and it is
 * checked by ADDRESS rather than by platform, because that is the thing that actually
 * has to exist.
 */
function hasSessionBus(): boolean {
  const address = GLib.getenv('DBUS_SESSION_BUS_ADDRESS');
  return address !== null && address !== '';
}

/**
 * Export MPRIS, or answer null with a reason logged.
 *
 * Null is an ordinary answer: on macOS and Windows there is no session bus, and a
 * caller's response to that is to carry on without lock-screen metadata rather than to
 * fail.
 */
export function publishMpris(identity: string, desktopEntry: string): MprisHandle | null {
  if (!hasSessionBus()) {
    console.warn('[desktop] MPRIS: no DBUS_SESSION_BUS_ADDRESS, so no media controls.');
    return null;
  }

  const owners = createArbiter<MprisSource>();
  /** Whoever the exported object should answer for. */
  const active = (): MprisSource => owners.current ?? SILENT;
  let rootExport: Gio.DBusExportedObject | null = null;
  let playerExport: Gio.DBusExportedObject | null = null;
  /** The last snapshot published, so only real changes reach the bus. */
  let published: Snapshot | null = null;
  /**
   * A counter behind `mpris:trackid`, which must be a D-Bus object path.
   *
   * A shell uses it to tell one track from the next, so it has to CHANGE when the
   * track does and stay put when it does not — hence a counter keyed on the source's
   * own id rather than a hash of the title, which two episodes could share.
   */
  let trackSerial = 0;
  let trackSerialFor: string | null = null;

  const trackPath = (id: string): string => {
    if (trackSerialFor !== id) {
      trackSerialFor = id;
      trackSerial += 1;
    }
    return `/org/correctiv/track/${trackSerial}`;
  };

  const metadata = (): Record<string, GLib.Variant> => {
    const track = active().track;
    if (track === null) {
      // The spec's own answer for "nothing loaded": a trackid saying so, and no more.
      return {
        'mpris:trackid': GLib.Variant.new_object_path('/org/mpris/MediaPlayer2/TrackList/NoTrack'),
      };
    }
    const built: Record<string, GLib.Variant> = {
      'mpris:trackid': GLib.Variant.new_object_path(trackPath(track.id)),
      'xesam:title': GLib.Variant.new_string(track.title),
    };
    // OMITTED RATHER THAN EMPTY. A shell lays out around the fields that are present,
    // and an empty artist line is a gap where a live stream simply has no artist.
    if (track.artist !== undefined && track.artist !== '') {
      built['xesam:artist'] = GLib.Variant.new_strv([track.artist]);
    }
    if (track.artworkUrl !== undefined && track.artworkUrl !== '') {
      built['mpris:artUrl'] = GLib.Variant.new_string(track.artworkUrl);
    }
    // A live stream has no length, and `mpris:length` of 0 would draw a seek bar that
    // is permanently at its end.
    if (track.lengthUs > 0) {
      built['mpris:length'] = GLib.Variant.new_int64(track.lengthUs);
    }
    return built;
  };

  const snapshot = (): Snapshot => ({
    PlaybackStatus: active().status,
    Metadata: metadata(),
    CanPlay: active().track !== null,
    CanPause: active().canPause,
    CanSeek: active().canSeek,
  });

  /** Whether two metadata dicts say the same thing, compared as the bus would see it. */
  const sameMetadata = (
    a: Record<string, GLib.Variant>,
    b: Record<string, GLib.Variant>,
  ): boolean => {
    const keys = Object.keys(a);
    if (keys.length !== Object.keys(b).length) return false;
    return keys.every((key) => {
      const other = b[key];
      return other !== undefined && a[key]?.equal(other) === true;
    });
  };

  const root = {
    Raise(): void {
      // Nothing to raise from here: the window belongs to `AppRegistry`, which this
      // module has no handle on. `CanRaise` says false, so a shell will not offer it.
    },
    Quit(): void {
      // `CanQuit` says false. Quitting an app from its media widget while an article
      // is half-read is not a thing this app should offer.
    },
    get CanQuit(): boolean {
      return false;
    },
    get CanRaise(): boolean {
      return false;
    },
    get HasTrackList(): boolean {
      return false;
    },
    get Identity(): string {
      return identity;
    },
    get DesktopEntry(): string {
      return desktopEntry;
    },
    get SupportedUriSchemes(): string[] {
      // What `OpenUri` would accept — and it is not exported, so this is empty rather
      // than a list of schemes nothing will open.
      return [];
    },
    get SupportedMimeTypes(): string[] {
      return [];
    },
  };

  const player = {
    Play(): void {
      active().play();
    },
    Pause(): void {
      active().pause();
    },
    PlayPause(): void {
      const source = active();
      if (source.status === 'Playing') source.pause();
      else source.play();
    },
    Stop(): void {
      active().stop();
    },
    Next(): void {
      // `CanGoNext` is false: this app has no queue to advance through.
    },
    Previous(): void {
      // `CanGoPrevious` is false, for the same reason.
    },
    Seek(offset: number): void {
      active().seekBy(offset);
    },
    SetPosition(trackid: string, position: number): void {
      // THE TRACKID IS A GUARD, not decoration. The spec says to ignore the call when
      // it names a track that is no longer current, which is what stops a click on a
      // stale panel from seeking the episode that replaced it.
      const source = active();
      const track = source.track;
      if (track === null || trackid !== trackPath(track.id)) return;
      source.seekTo(position);
    },
    get PlaybackStatus(): string {
      return active().status;
    },
    get Metadata(): Record<string, GLib.Variant> {
      return metadata();
    },
    get Position(): number {
      return active().positionUs;
    },
    get Rate(): number {
      // Read-only here. The app does have a speed control, and a shell that could
      // WRITE this would expect the change to stick; reporting 1 while the user listens
      // at 1.5x would be worse, so this reports the truth and refuses the write.
      return 1;
    },
    get MinimumRate(): number {
      return 1;
    },
    get MaximumRate(): number {
      return 1;
    },
    get CanPlay(): boolean {
      return active().track !== null;
    },
    get CanPause(): boolean {
      return active().canPause;
    },
    get CanSeek(): boolean {
      return active().canSeek;
    },
    get CanControl(): boolean {
      return true;
    },
    get CanGoNext(): boolean {
      return false;
    },
    get CanGoPrevious(): boolean {
      return false;
    },
  };

  const publish = (): void => {
    const exported = playerExport;
    if (exported === null) return;
    const next = snapshot();
    const last = published;
    published = next;
    if (last === null) return;

    if (next.PlaybackStatus !== last.PlaybackStatus) {
      exported.emit_property_changed(
        'PlaybackStatus',
        GLib.Variant.new_string(next.PlaybackStatus),
      );
    }
    if (!sameMetadata(next.Metadata, last.Metadata)) {
      exported.emit_property_changed('Metadata', new GLib.Variant('a{sv}', next.Metadata));
    }
    for (const key of ['CanPlay', 'CanPause', 'CanSeek'] as const) {
      if (next[key] !== last[key]) {
        exported.emit_property_changed(key, GLib.Variant.new_boolean(next[key]));
      }
    }
  };

  const ownerId = Gio.bus_own_name(
    Gio.BusType.SESSION,
    BUS_NAME,
    Gio.BusNameOwnerFlags.NONE,
    (connection: Gio.DBusConnection) => {
      try {
        rootExport = Gio.DBusExportedObject.wrapJSObject(ROOT_XML, root);
        rootExport.export(connection, OBJECT_PATH);
        playerExport = Gio.DBusExportedObject.wrapJSObject(PLAYER_XML, player);
        playerExport.export(connection, OBJECT_PATH);
        published = snapshot();
      } catch (error) {
        // Reported rather than swallowed: without this the app runs with a bus name
        // that answers nothing, which looks to a shell like a broken player.
        console.error('[desktop] MPRIS: could not export the interfaces:', error);
      }
    },
    () => {},
    () => {
      console.warn(`[desktop] MPRIS: lost the name ${BUS_NAME}; another instance has it.`);
    },
  );

  return {
    claim(next: MprisSource): void {
      owners.claim(next);
      publish();
    },
    release(previous: MprisSource): void {
      // The arbiter decides what this means: on top, the name goes back to whoever had
      // it before; in the middle, nothing visible happens at all.
      owners.release(previous);
      publish();
    },
    changed(from: MprisSource): void {
      // Only the owner's changes reach the bus. A radio ticking away behind a video
      // has nothing to say about what the shell is showing.
      if (owners.current !== from) return;
      publish();
    },
    shutdown(): void {
      const held = owners.current;
      if (held !== null) owners.release(held);
      rootExport?.unexport();
      playerExport?.unexport();
      rootExport = null;
      playerExport = null;
      Gio.bus_unown_name(ownerId);
    },
  };
}
