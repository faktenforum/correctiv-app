/**
 * Who owns the one MPRIS bus name, in the order two players actually arrive.
 *
 * A shell shows one entry per application, so `media/mpris.ts` exports one bus name and
 * whichever player started last owns it. That arbitration is the part of MPRIS with no
 * D-Bus in it and the part that was WRONG: `release` used to put the service back to
 * silence unconditionally, so a video closing over a playing radio left a GNOME panel
 * showing nothing at all, permanently — the audio binding claims once and then only
 * reports changes, so its own record said it still held the name.
 *
 * That is two players deep, invisible in a screenshot, and needs a session bus to
 * reproduce by hand. Which is why the stack lives in `media/arbiter.ts` with no `gi://`
 * import and is driven from here instead.
 *
 * WHAT THIS DOES NOT COVER: the marshalling, the property diff and the bus name itself.
 * Those need a real connection and are measured in `debug/mpris-probe.ts` and by
 * driving the running app — the README carries those numbers. This file answers only
 * the ordering question, which is the one that had a bug in it.
 */

import { describe, expect, it } from 'vitest';

import { createArbiter } from '../src/media/arbiter.js';

/** Two distinguishable sources; identity is all the arbiter compares. */
const RADIO = { name: 'radio' };
const VIDEO = { name: 'video' };
const OTHER = { name: 'other' };

describe('the MPRIS arbiter', () => {
  it('starts with nobody holding the name', () => {
    expect(createArbiter<object>().current).toBe(null);
  });

  it('hands the name back to the radio when a video closes over it', () => {
    // THE DEFECT THIS FILE EXISTS FOR. Before the stack, the last line was `null` and
    // a shell showed an empty entry over a radio that was still playing.
    const arbiter = createArbiter<object>();
    expect(arbiter.claim(RADIO)).toBe(true);
    expect(arbiter.claim(VIDEO)).toBe(true);
    expect(arbiter.current).toBe(VIDEO);
    expect(arbiter.release(VIDEO)).toBe(true);
    expect(arbiter.current).toBe(RADIO);
  });

  it('says whether the owner changed, so nothing publishes for nothing', () => {
    // The service only touches the bus when this answers true. A claim by the holder
    // and a release by a non-holder both have to answer false, or a 2 Hz store tick
    // becomes 2 Hz of `PropertiesChanged`.
    const arbiter = createArbiter<object>();
    expect(arbiter.claim(RADIO)).toBe(true);
    expect(arbiter.claim(RADIO)).toBe(false);
    expect(arbiter.release(VIDEO)).toBe(false);
    expect(arbiter.current).toBe(RADIO);
  });

  it('lets a source in the middle leave without disturbing the owner', () => {
    // A video screen torn down while the radio is in front: it is on the stack but not
    // on top, so its release changes nothing visible.
    const arbiter = createArbiter<object>();
    arbiter.claim(RADIO);
    arbiter.claim(VIDEO);
    arbiter.claim(OTHER);
    expect(arbiter.release(VIDEO)).toBe(false);
    expect(arbiter.current).toBe(OTHER);
    expect(arbiter.release(OTHER)).toBe(true);
    expect(arbiter.current).toBe(RADIO);
  });

  it('does not need two releases for a source that claimed twice', () => {
    // A re-claim moves an existing entry rather than adding one. Without that, the
    // audio binding — which re-claims whenever it notices it is not the owner — would
    // leave a copy of itself behind on every hand-over.
    const arbiter = createArbiter<object>();
    arbiter.claim(RADIO);
    arbiter.claim(VIDEO);
    arbiter.claim(RADIO);
    expect(arbiter.current).toBe(RADIO);
    expect(arbiter.release(RADIO)).toBe(true);
    expect(arbiter.current).toBe(VIDEO);
  });

  it('empties out when everyone has gone', () => {
    const arbiter = createArbiter<object>();
    arbiter.claim(RADIO);
    arbiter.claim(VIDEO);
    expect(arbiter.release(RADIO)).toBe(false);
    expect(arbiter.release(VIDEO)).toBe(true);
    expect(arbiter.current).toBe(null);
  });
});
