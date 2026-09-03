import { act } from 'react-test-renderer';

/**
 * The one block on Home that moves with the clock.
 *
 * The requirements ask for modules "pushed to the top of the home screen between
 * certain hours, after they drop into the chronological feed". The hours themselves
 * are covered in `packages/app-core/test/daypart.test.ts`; what is worth pinning here
 * is that the callout is rendered ONCE either way. Two mutually exclusive conditions
 * over the same block is exactly the shape that produces a duplicate when one of them
 * is later edited, and a duplicated teaser on Home is not something a type checks.
 */

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
  useLocalSearchParams: jest.fn(() => ({})),
}));
jest.mock('@/lib/openExternal', () => ({ openExternal: jest.fn() }));

jest.mock('@expo/vector-icons', () => {
  const react = jest.requireActual<typeof import('react')>('react');
  const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
  const Ionicons = ({ name }: { name: string }) => react.createElement(Text, null, `icon:${name}`);
  Ionicons.displayName = 'Ionicons';
  return { Ionicons };
});

/** No network on Home: the feeds are not what this file is about. */
jest.mock('@/lib/feeds/useFeed', () => ({
  useFeed: () => ({ data: undefined, loading: false, offline: false, reload: jest.fn() }),
}));

import { callouts } from '@correctiv/app-core/data/callouts';
import { resetStore } from '@correctiv/app-core/stores/store';

import { findAllPressable, render } from './support/rendering';

import HomeScreen from '@/app/(tabs)/index';
import { coreStore } from '@/lib/store/core';

const OPEN = callouts.find((entry) => entry.status === 'open')!;

/** Local time, as `daypartAt` reads it. */
const at = (hour: number) => new Date(2026, 8, 3, hour, 0, 0, 0);

beforeEach(() => {
  jest.clearAllMocks();
  act(() => {
    coreStore.dispatch(resetStore());
  });
});

afterEach(() => {
  jest.useRealTimers();
});

function renderAt(hour: number) {
  jest.useFakeTimers().setSystemTime(at(hour));
  return render(<HomeScreen />);
}

/** The teaser's own pressable carries the callout's title, so it can be counted. */
const teasers = (tree: ReturnType<typeof render>) => findAllPressable(tree, OPEN.title);

describe('the callout on Home', () => {
  it('is rendered exactly once at lunchtime', () => {
    expect(teasers(renderAt(12))).toHaveLength(1);
  });

  it('is rendered exactly once outside the lunchtime window', () => {
    expect(teasers(renderAt(20))).toHaveLength(1);
  });

  /**
   * And it is in a different place. Anchored on the early-access card, which renders
   * unconditionally and sits between the two positions, rather than on a feed section
   * that is absent when the feeds are: an anchor that never renders makes both indexOf
   * calls agree on -1 and the test pass for the wrong reason. It did, before this
   * comment.
   */
  it('sits above the rest of the page at lunchtime and below it otherwise', () => {
    const order = (hour: number) => {
      const text = JSON.stringify(renderAt(hour).toJSON());
      const anchor = text.indexOf('exklusiv vorab');
      expect(anchor).toBeGreaterThan(-1);
      return text.indexOf(OPEN.title) < anchor ? 'top' : 'in-place';
    };

    expect(order(12)).toBe('top');
    expect(order(20)).toBe('in-place');
  });
});
