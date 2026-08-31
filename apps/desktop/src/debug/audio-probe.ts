// A standalone probe for the fourth port: does GStreamer actually produce the ticks
// the core's audio state machine consumes?
//
// WHY THIS EXISTS SEPARATELY FROM THE APP. The player screen can be looked at, and a
// screenshot of it proves that a screen rendered — not that audio decoded, not that
// the position advances, and not that the backend honours the port's re-entrancy
// contract. Those are claims about a state machine over time, and a picture cannot
// carry them. This drives `gstAudio` directly and prints what arrived.
//
// It is a PROBE, not a test: it needs a GStreamer stack and (for the second half) a
// network, so it belongs in a developer's hands rather than in `npm run check`. What
// `npm run check` does own is `test/audio-ticks.test.ts`, which pins the shape of the
// translation without a media framework.
//
// Run:
//   CORRECTIV_DESKTOP_ASSETS=../mobile gjs -m dist/audio-probe.gjs.mjs

import GLib from 'gi://GLib?version=2.0';

import type { PlaybackStatus } from '@correctiv/app-core';

import { gstAudio } from '../audio/backend.js';

const RADIO = 'https://icecast.correctiv.net/salon5low';
const BUNDLED = 'assets/audio/sample-episode.mp3';

const ticks: PlaybackStatus[] = [];
gstAudio.onStatus((status) => ticks.push(status));

/** Run the main loop for `ms`, so GStreamer's bus and the tick timer can work. */
function pump(ms: number): void {
  const context = GLib.MainContext.default();
  const deadline = GLib.get_monotonic_time() + ms * 1000;
  while (GLib.get_monotonic_time() < deadline) context.iteration(false);
}

function report(label: string): void {
  const playing = ticks.filter((tick) => tick.playing);
  const positions = playing.map((tick) => tick.positionSec);
  const advanced = positions.length > 1 && positions[positions.length - 1]! > positions[0]!;
  const errors = ticks.filter((tick) => tick.error != null).map((tick) => tick.error);

  console.log(`\n--- ${label} ---`);
  console.log(`ticks:        ${ticks.length}`);
  console.log(`loaded:       ${ticks.some((tick) => tick.loaded)}`);
  console.log(`playing:      ${playing.length} of them`);
  console.log(
    `position:     ${positions.length > 0 ? `${positions[0]!.toFixed(2)}s -> ${positions[positions.length - 1]!.toFixed(2)}s` : 'never reported'}`,
  );
  console.log(`advanced:     ${advanced}`);
  console.log(`durationSec:  ${ticks.at(-1)?.durationSec.toFixed(2) ?? 'n/a'}`);
  console.log(`live:         ${ticks.at(-1)?.live ?? 'n/a'}`);
  console.log(`errors:       ${errors.length === 0 ? 'none' : errors.join(' | ')}`);
  ticks.length = 0;
}

/**
 * The re-entrancy check, and it is the one the port cares about most.
 *
 * `AudioBackend` states that a command must never call the status listener
 * synchronously, because a backend that emitted from inside `pause()` once killed an
 * app with `RangeError: Maximum call stack size exceeded` a minute into an episode
 * (ADR 0006). This asserts the property directly: count the ticks that arrive DURING
 * a command rather than after it.
 */
function reentrancyCheck(): void {
  let duringCommand = 0;
  let inCommand = false;
  gstAudio.onStatus(() => {
    if (inCommand) duringCommand++;
  });

  for (const run of [
    () => gstAudio.play(),
    () => gstAudio.pause(),
    () => gstAudio.setRate(1.5),
    () => gstAudio.release(),
  ]) {
    inCommand = true;
    run();
    inCommand = false;
  }

  console.log(`\n--- the port's re-entrancy contract ---`);
  console.log(`ticks emitted from inside a command: ${duringCommand} (must be 0)`);
  if (duringCommand !== 0) {
    console.error('FAIL: a command called the status listener synchronously.');
  }
  gstAudio.onStatus((status) => ticks.push(status));
}

// 1. The bundled file. No network, so this is the half that must always work.
console.log(`loading ${BUNDLED} …`);
await gstAudio.load(BUNDLED, { title: 'Sample episode', artist: 'Salon5' });
gstAudio.play();
pump(3000);
report('bundled mp3');

reentrancyCheck();

// 2. The live radio stream, if the network is there. `durationSec` 0 and `live` true
// are the interesting fields: Icecast has no length, and the port documents that.
console.log(`\nloading ${RADIO} …`);
await gstAudio.load(RADIO, { title: 'Salon5 Radio', artist: '24/7 aus Bottrop' });
gstAudio.play();
pump(6000);
report('live radio');

gstAudio.release();
