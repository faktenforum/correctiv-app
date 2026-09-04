// What the shipped GStreamer payload can actually decode, asked of the registry.
//
// WHY THIS EXISTS BESIDE `audio-probe.ts`. That probe drives the port and reports what
// arrived, which is the right question when the pipeline runs. When it does NOT run,
// its answer is a GStreamer error string, and those are actively misleading about their
// own cause. Measured on Windows, from ONE missing decoder:
//
//   the bundled mp3   ->  "Your GStreamer installation is missing a plug-in."
//   the mp3 stream    ->  "Internal data stream error."
//
// The second is the exact string gjsify's own build notes document for a MISSING TLS
// BACKEND, which is a completely different fault. So "live radio is broken" read as a
// networking problem for a while, and it was decodebin having nothing to autoplug.
// This probe separates them by asking three questions no error message answers: which
// plugins are in the payload, which element factories resolve, and whether there is a
// real TLS backend behind libsoup.
//
// It is a PROBE, not a test: it describes the runtime bundle on the machine it runs on,
// which is exactly what differs between platforms and what the app cannot control.
//
// Run:  npm run gst-probe -w @correctiv/desktop
//
// Measured 2026-09-04 against `@gjsify/gtk-runtime-win32-x64@0.47.0`: mpg123, vorbis
// and flac all MISSING from the payload while the builder's own seed list names them,
// so `mpg123audiodec` is NULL and no mp3 plays at all. Filed as gjsify#1544. The same
// bundle's `soup` plugin and TLS backend are both present and fine, which is the half
// that made the error string a red herring.

import Gio from 'gi://Gio?version=2.0';
import Gst from 'gi://Gst?version=1.0';

if (!Gst.is_initialized()) Gst.init([]);

/** Everything `GST_AUDIO_PLUGINS` in gjsify's runtime builder declares. */
const DECLARED_PLUGINS = [
  'coreelements',
  'app',
  'typefindfunctions',
  'playback',
  'audioparsers',
  'wavparse',
  'isomp4',
  'ogg',
  'vorbis',
  'opus',
  'flac',
  'mpg123',
  'alaw',
  'mulaw',
  'auparse',
  'audioconvert',
  'audioresample',
  'audiorate',
  'audiomixer',
  'volume',
  'audiotestsrc',
  'soup',
  'autodetect',
  'osxaudio',
  'wasapi2',
  'directsound',
];

/**
 * The sink plugins, which are per platform and must not be counted as missing.
 *
 * `osxaudio` is darwin's, `wasapi2` and `directsound` are win32's, and only one of the
 * two Windows sinks has to exist because `autoaudiosink` picks whichever is there.
 * Requiring all of them would report a failure on every platform, which says as much
 * as reporting none.
 */
const PLATFORM_ONLY = new Set(['osxaudio', 'wasapi2', 'directsound']);

const registry = Gst.Registry.get();
const missing: string[] = [];

console.log('--- plugins the builder declares ---');
for (const name of DECLARED_PLUGINS) {
  const present = registry.find_plugin(name) !== null;
  const platformOnly = PLATFORM_ONLY.has(name);
  if (!present && !platformOnly) missing.push(name);
  const verdict = present ? 'ok' : platformOnly ? 'absent (other platform)' : 'MISSING';
  console.log(`  ${name.padEnd(20)} ${verdict}`);
}

// A present plugin and a resolvable factory are two different claims: a plugin can load
// and still register no element, when the external library behind it is absent.
console.log('\n--- element factories the app reaches for ---');
const ELEMENTS = [
  'filesrc',
  'souphttpsrc',
  'playbin3',
  'decodebin3',
  'mpg123audiodec',
  'audioconvert',
  'audioresample',
  'autoaudiosink',
];
const nullFactories: string[] = [];
for (const name of ELEMENTS) {
  const made = Gst.ElementFactory.make(name, null);
  if (made === null) nullFactories.push(name);
  console.log(`  ${name.padEnd(20)} ${made === null ? 'NULL' : 'ok'}`);
}

// libsoup does https through `GTlsConnection`, whose implementation is a glib-networking
// MODULE that GIO opens out of its module directory. A bundle shipping its own libgio
// and no module gets the DUMMY backend, and then every request fails as a stream error
// — the fault this section exists to tell apart from a missing decoder.
console.log('\n--- the TLS backend behind libsoup ---');
const backend = Gio.TlsBackend.get_default();
console.log(`  backend            ${backend === null ? 'NULL' : 'present'}`);
console.log(`  supports_tls       ${backend === null ? 'n/a' : backend.supports_tls()}`);
console.log(`  GIO_MODULE_DIR     ${process.env.GIO_MODULE_DIR ?? '(unset)'}`);

console.log(`\nmissing declared plugins: ${missing.length === 0 ? 'none' : missing.join(', ')}`);
const nulls = nullFactories.length === 0 ? 'none' : nullFactories.join(', ');
console.log(`null element factories:   ${nulls}`);
if (missing.length > 0 || nullFactories.length > 0) {
  console.error('FAIL: the shipped payload does not satisfy the audio contract it declares.');
}
