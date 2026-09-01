import { describe, expect, it } from 'vitest';

import { INITIAL, parseHash, writeHash, type PreviewState } from '../src/state';

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
      seed: 'member',
      tools: true,
      check: true,
      overrides: { 'grey-100': { dark: '#102a54' }, emphasis: { light: '#00b0ff' } },
    };
    expect(parseHash(writeHash(state))).toEqual(state);
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
