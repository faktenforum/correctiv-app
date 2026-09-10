import { describe, expect, it } from 'vitest';

import {
  frameSize,
  INITIAL,
  parseHash,
  writeHash,
  type PreviewState,
} from '../../src/workbench/state';

describe('the hash contract', () => {
  it('round-trips a full state, because a link is the shell only persistence', () => {
    // `w`/`h` are only carried for `custom`; for a named device they are derived
    // from the preset, so a round-trip normalises them to it. iPad mini is
    // 744x1133, and a state claiming otherwise is not a state this shell can be in.
    const state: PreviewState = {
      ...INITIAL,
      route: '/artikel',
      device: 'ipad-mini',
      w: 744,
      h: 1133,
      landscape: true,
      zoom: 0.5,
      theme: 'dark',
      seed: 'signed-in',
      tools: true,
      full: true,
      check: true,
      overrides: { 'grey-100': { dark: '#102a54' }, emphasis: { light: '#00b0ff' } },
    };
    expect(parseHash(writeHash(state))).toEqual(state);
  });

  /**
   * The two the host's own size would otherwise decide.
   *
   * `store.start()` reads the address before it looks at the window: a link is
   * somebody saying "this device, this way round", and answering a phone-sized
   * window by overriding it would make every link written on a desktop resolve
   * differently on a phone. The absence of both is what hands the decision over.
   */
  it('carries the frame the address asked for, and says when it asked for none', () => {
    expect(parseHash('#/?d=host&full=1').device).toBe('host');
    expect(parseHash('#/?d=host&full=1').full).toBe(true);
    expect(writeHash({ ...INITIAL, device: 'host', full: true })).toContain('full=1');
    expect(writeHash({ ...INITIAL, full: false })).not.toContain('full');
  });

  it('still reads a link written before this package existed', () => {
    const state = parseHash('#/artikel?d=ipad-pro-11&o=l&z=fit');
    expect(state.route).toBe('/artikel');
    expect(state.device).toBe('ipad-pro-11');
    expect(state.landscape).toBe(true);
    expect(state.zoom).toBe('fit');
  });

  it('keeps a custom size, and only then', () => {
    const custom = parseHash('#/?d=custom&w=500&h=900');
    expect([custom.w, custom.h]).toEqual([500, 900]);
    expect(writeHash(custom)).toContain('w=500');
    expect(writeHash({ ...custom, device: 'iphone-se' })).not.toContain('w=500');
  });

  it('drops an override it cannot trust rather than refusing the link', () => {
    const state = parseHash('#/?kd=grey-100:102a54,not-a-token:ffffff,emphasis:xyz');
    expect(state.overrides).toEqual({ 'grey-100': { dark: '#102a54' } });
  });

  it('treats an empty hash as the default view', () => {
    expect(parseHash('')).toEqual(INITIAL);
  });
});

/**
 * `landscape` swaps the two numbers. It does not mean landscape.
 *
 * Those were the same sentence while every preset was written portrait-first,
 * and they stopped being one when the presets above tablet size arrived written
 * the way a laptop is used. The toolbar therefore names the orientation from what
 * comes out of here, and this pins the half it reads: rewrite `desktop` as
 * 900 × 1440 and the control it drives starts disagreeing with the frame again.
 */
describe('the frame that comes out of a preset', () => {
  const at = (device: string, landscape = false) => frameSize({ ...INITIAL, device, landscape });

  it('keeps the pair as written, and turns it when asked', () => {
    expect(at('iphone-se')).toEqual({ w: 375, h: 667 });
    expect(at('iphone-se', true)).toEqual({ w: 667, h: 375 });
    expect(at('desktop')).toEqual({ w: 1440, h: 900 });
    expect(at('desktop', true)).toEqual({ w: 900, h: 1440 });
  });

  /** Its size is the box the stage measures, which this function cannot see. */
  it('answers zero for the host', () => {
    expect(at('host')).toEqual({ w: 0, h: 0 });
  });
});
