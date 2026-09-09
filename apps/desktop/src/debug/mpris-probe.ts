// Can this runtime export MPRIS at all, and in what shape?
//
// Four mechanics had to hold before `media/mpris.ts` was worth writing, and each one
// has a plausible failure that no type would have caught. This is where the answers in
// README.md's *The shell can see what is playing* came from, and it stays runnable so
// they can be re-measured rather than trusted.
//
// Run:  npm run mpris-probe -w @correctiv/desktop
//
// Then, while it holds the name for 40 seconds:
//
//   gdbus introspect --session --dest org.mpris.MediaPlayer2.correctivprobe \
//     --object-path /org/mpris/MediaPlayer2
//
// MEASURED 2026-09-09 on GJS 1.88.1 / GLib 2.86:
//
//   1. TWO interfaces on ONE object path WORK. MPRIS puts `org.mpris.MediaPlayer2` and
//      `org.mpris.MediaPlayer2.Player` both on `/org/mpris/MediaPlayer2`, and
//      `Gio.DBusExportedObject` wraps one interface per object — so this exports two
//      objects at the same path, and `gdbus introspect` lists both. D-Bus registration
//      is per (path, interface), which is why.
//   2. An `a{sv}` property getter must return a PLAIN OBJECT whose VALUES are
//      `GLib.Variant`. Measured back over the bus: `mpris:trackid` as `objectpath`,
//      `mpris:length` as `int64`, `xesam:artist` as an array, and „Größe" intact as
//      UTF-8.
//   3. `x` (int64) survives both directions — `Seek` called with 5 000 000 reached the
//      JS as exactly that, and `Position` read back as `int64 12340000`.
//   4. A `readwrite` property reaches a JS setter: `Volume` set to 0.42 arrived. And
//      `emit_property_changed` and `emit_signal` both return without throwing.
//
// It uses a bus name of its OWN — `…correctivprobe` — so running it never fights the
// app for `org.mpris.MediaPlayer2.correctiv`.

import Gio from 'gi://Gio?version=2.0';
import GLib from 'gi://GLib?version=2.0';

const NAME = 'org.mpris.MediaPlayer2.correctivprobe';
const PATH = '/org/mpris/MediaPlayer2';

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
    <method name="Seek"><arg type="x" direction="in" name="offset"/></method>
    <method name="SetPosition">
      <arg type="o" direction="in" name="trackid"/>
      <arg type="x" direction="in" name="position"/>
    </method>
    <property name="PlaybackStatus" type="s" access="read"/>
    <property name="Metadata" type="a{sv}" access="read"/>
    <property name="Position" type="x" access="read"/>
    <property name="Volume" type="d" access="readwrite"/>
    <property name="CanPlay" type="b" access="read"/>
    <property name="CanSeek" type="b" access="read"/>
    <signal name="Seeked"><arg type="x" name="position"/></signal>
  </interface>
</node>`;

class Root {
  Raise(): void {
    print('Raise called');
  }
  Quit(): void {
    print('Quit called');
  }
  get CanQuit(): boolean {
    return false;
  }
  get CanRaise(): boolean {
    return true;
  }
  get HasTrackList(): boolean {
    return false;
  }
  get Identity(): string {
    return 'CORRECTIV probe';
  }
  get DesktopEntry(): string {
    return 'org.correctiv.AppDesktopExperimental';
  }
  get SupportedUriSchemes(): string[] {
    return ['http', 'https'];
  }
  get SupportedMimeTypes(): string[] {
    return ['audio/mpeg'];
  }
}

class Player {
  private volume = 1;

  Play(): void {
    print('Play called');
  }
  Pause(): void {
    print('Pause called');
  }
  PlayPause(): void {
    print('PlayPause called');
  }
  Stop(): void {
    print('Stop called');
  }
  Seek(offset: number): void {
    print(`Seek called with ${offset}`);
  }
  SetPosition(trackid: string, position: number): void {
    print(`SetPosition called with ${trackid} ${position}`);
  }

  get PlaybackStatus(): string {
    return 'Playing';
  }
  /** VARIANT #1: a plain object whose VALUES are variants. */
  get Metadata(): unknown {
    return {
      'mpris:trackid': GLib.Variant.new_object_path('/org/correctiv/track/1'),
      'mpris:length': GLib.Variant.new_int64(850_000_000),
      'xesam:title': GLib.Variant.new_string('Ein Titel mit Umlauten: Größe'),
      'xesam:artist': GLib.Variant.new_strv(['CORRECTIV']),
      'mpris:artUrl': GLib.Variant.new_string('https://example.org/art.jpg'),
    };
  }
  get Position(): number {
    return 12_340_000;
  }
  get Volume(): number {
    return this.volume;
  }
  set Volume(value: number) {
    print(`Volume set to ${value}`);
    this.volume = value;
  }
  get CanPlay(): boolean {
    return true;
  }
  get CanSeek(): boolean {
    return true;
  }
}

const root = new Root();
const player = new Player();
let rootExport: Gio.DBusExportedObject | null = null;
let playerExport: Gio.DBusExportedObject | null = null;

const loop = new GLib.MainLoop(null, false);

Gio.bus_own_name(
  Gio.BusType.SESSION,
  NAME,
  Gio.BusNameOwnerFlags.NONE,
  (connection: Gio.DBusConnection) => {
    print('bus acquired');
    try {
      rootExport = Gio.DBusExportedObject.wrapJSObject(ROOT_XML, root);
      rootExport.export(connection, PATH);
      print('root interface exported');
    } catch (error) {
      print(`ROOT EXPORT FAILED: ${String(error)}`);
    }
    try {
      playerExport = Gio.DBusExportedObject.wrapJSObject(PLAYER_XML, player);
      playerExport.export(connection, PATH);
      print('player interface exported at the SAME path');
    } catch (error) {
      print(`PLAYER EXPORT FAILED: ${String(error)}`);
    }
  },
  () => print(`name acquired: ${NAME}`),
  () => print(`NAME LOST: ${NAME}`),
);

// Emit a change a few seconds in, so a watcher can see whether it arrives.
GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 3, () => {
  try {
    playerExport?.emit_property_changed('PlaybackStatus', GLib.Variant.new_string('Paused'));
    print('emit_property_changed(PlaybackStatus) did not throw');
  } catch (error) {
    print(`emit_property_changed FAILED: ${String(error)}`);
  }
  try {
    playerExport?.emit_signal(
      'Seeked',
      GLib.Variant.new_tuple([GLib.Variant.new_int64(5_000_000)]),
    );
    print('emit_signal(Seeked) did not throw');
  } catch (error) {
    print(`emit_signal FAILED: ${String(error)}`);
  }
  return GLib.SOURCE_REMOVE;
});

GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 40, () => {
  loop.quit();
  return GLib.SOURCE_REMOVE;
});

loop.run();
