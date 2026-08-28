import {
  DIRECTION_THRESHOLD,
  HERO_BAND,
  type HeaderState,
  nextHeaderState,
} from '../src/lib/articles/readerChrome';

/**
 * The reader's overlay header used to sit on the article text at every scroll
 * position past the hero image, in both colour schemes. A headline read "zeniert"
 * because the back chevron covered "insz".
 *
 * These assertions are the rule that replaced it. They exist because the failure
 * they guard against is invisible to a typecheck and to any screenshot of the first
 * viewport, which is where the controls sit over the hero and look correct.
 */
describe('nextHeaderState', () => {
  const past = HERO_BAND + 100;
  const states: HeaderState[] = ['floating', 'onSurface', 'hidden'];

  it('floats over the hero, from whatever state and however it got there', () => {
    for (const from of states) {
      expect(nextHeaderState(from, 0, 40)).toBe('floating');
      expect(nextHeaderState(from, 4000, 40)).toBe('floating');
      expect(nextHeaderState(from, 0, HERO_BAND)).toBe('floating');
    }
  });

  it('hides on the way down and comes back on a surface, past the hero', () => {
    expect(nextHeaderState('floating', past, past + 200)).toBe('hidden');
    expect(nextHeaderState('hidden', past + 200, past)).toBe('onSurface');
  });

  it('never floats past the hero, which is where floating put controls on text', () => {
    // The one combination the old pair of booleans could represent and this cannot.
    for (const from of states) {
      for (const [a, b] of [
        [past, past + 200],
        [past + 200, past],
        [past, past + 1],
        [past, past - 1],
      ]) {
        expect(nextHeaderState(from, a, b)).not.toBe('floating');
      }
    }
  });

  it('ignores movement too small to be a direction, so the header cannot flicker', () => {
    const nudge = DIRECTION_THRESHOLD - 1;
    expect(nextHeaderState('hidden', past, past + nudge)).toBe('hidden');
    expect(nextHeaderState('onSurface', past, past + nudge)).toBe('onSurface');
    expect(nextHeaderState('hidden', past, past - nudge)).toBe('hidden');
    expect(nextHeaderState('onSurface', past, past - nudge)).toBe('onSurface');
  });

  it('leaves the hero band on a nudge rather than floating on until a real scroll', () => {
    // Crossing the boundary slowly is the case a pure "keep current" would miss.
    expect(nextHeaderState('floating', HERO_BAND, HERO_BAND + 1)).toBe('onSurface');
  });

  it('reacts once the movement reaches the threshold exactly', () => {
    expect(nextHeaderState('onSurface', past, past + DIRECTION_THRESHOLD)).toBe('hidden');
    expect(nextHeaderState('hidden', past + DIRECTION_THRESHOLD, past)).toBe('onSurface');
  });
});
