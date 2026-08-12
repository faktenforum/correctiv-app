/**
 * Exclusive playback coordination — "only one medium plays at a time".
 *
 * The audio and video stores used to enforce this by importing each other
 * dynamically (`await import('./audio')`), which is a module cycle broken at
 * runtime. That worked while both lived in one bundle, but it couples the two
 * stores permanently and prevents either from moving across a package boundary.
 *
 * Instead each medium registers a stop callback once, and a starting medium
 * asks every *other* registered medium to stop. No store imports another, the
 * cycle is gone, and a host can add a third medium (a game, a live stream)
 * without touching the existing ones.
 *
 * Registration happens in the host entry point — see
 * apps/mobile-rn/src/app/_layout.tsx.
 */

type Stopper = () => void;

const media = new Map<string, Stopper>();

export function registerExclusiveMedium(id: string, stop: Stopper): void {
  media.set(id, stop);
}

/** Stops every registered medium except `except`. Unregistered ids are a no-op. */
export function stopOtherMedia(except: string): void {
  for (const [id, stop] of media) {
    if (id === except) continue;
    try {
      stop();
    } catch {
      // stopping one medium must never prevent another from starting
    }
  }
}

/** Test helper. */
export function resetExclusiveMedia(): void {
  media.clear();
}
