// One MPRIS service for the whole process, and the two things that feed it.
//
// A shell shows one entry per application, so there is one bus name and the last
// player to start owns it — see `mpris.ts`. That makes the handle a process-level
// object rather than a per-screen one, and this file is where it lives so that neither
// player has to know about the other.
//
// The audio binding is installed once at startup because audio OUTLIVES the screen
// that started it: an episode keeps playing while the user reads something else, and a
// binding tied to a component would drop the metadata on navigation. The video binding
// is installed per pipeline, from `video/backend.ts`, because a video does not.

import { publishMpris, type MprisHandle } from './mpris.js';
import { installAudioMpris } from './mpris-audio.js';

/** What a shell shows as the player's name. */
const IDENTITY = 'CORRECTIV (Desktop, experimentell)';

/**
 * The `.desktop` file a shell looks for the icon in.
 *
 * The same id `registerRootComponent` is given in `entry.tsx`, and deliberately the
 * experimental one: a shell that resolved this to a real CORRECTIV desktop entry would
 * put the official icon on a feasibility demonstration.
 */
const DESKTOP_ENTRY = 'org.correctiv.AppDesktopExperimental';

/** `undefined` until the first attempt; `null` once it has failed for good. */
let handle: MprisHandle | null | undefined;
let audioBound = false;

/**
 * The process's MPRIS handle, or null where there is no session bus.
 *
 * Created on first use rather than at import, because `publishMpris` reads the
 * environment and logs — and a module that did that at import would do it in the route
 * sweep and in every test that touches the video backend.
 */
export function mediaControls(): MprisHandle | null {
  if (handle === undefined) handle = publishMpris(IDENTITY, DESKTOP_ENTRY);
  return handle;
}

/**
 * Wire the core's audio store to the shell's media controls. Idempotent.
 *
 * Called from the root component's first render, beside the style and the fonts, for
 * the same reason they are there: it needs to happen once, after `Gtk.init`, before the
 * user can press play. The unsubscribe is deliberately dropped — this lives as long as
 * the process, and holding it would suggest something ever tears it down.
 */
export function installMediaControlsOnce(): void {
  if (audioBound) return;
  audioBound = true;
  const controls = mediaControls();
  if (controls === null) return;
  installAudioMpris(controls);
}
