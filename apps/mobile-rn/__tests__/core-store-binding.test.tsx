import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Text } from 'react-native';

import {
  coreStores,
  useExtraFeeds,
  useIsMember,
  useIsSaved,
  useSelectedInterests,
} from '@/lib/store/core';

/**
 * Proves the React side actually binds to the core's own store implementation.
 *
 * Two things could break here and both are invisible to typecheck:
 *
 *  1. The core no longer uses zustand — it has its own createStore (ADR 0004).
 *     zustand's `useStore` only needs subscribe/getState/getInitialState, so the
 *     interop should hold, but "should" is not evidence.
 *  2. zustand v5 hands the selector straight to React's useSyncExternalStore with
 *     NO equality function. A selector that builds a new array each call therefore
 *     makes React throw "The result of getSnapshot should be cached to avoid an
 *     infinite loop" — which is why the interest hooks derive under useMemo.
 */

const initial = {
  membership: coreStores.membership.getState(),
  interests: coreStores.interests.getState(),
  saved: coreStores.savedArticles.getState(),
};

beforeEach(() => {
  // Inside act(): a store reset notifies subscribers, and a mounted probe from a
  // previous test would otherwise re-render outside React's batching and warn.
  act(() => {
    coreStores.membership.setState(initial.membership, true);
    coreStores.interests.setState(initial.interests, true);
    coreStores.savedArticles.setState(initial.saved, true);
  });
});

/** Renders a hook and reports how many times it rendered. */
function renderHook<T>(hook: () => T): {
  tree: ReactTestRenderer;
  value: () => T;
  renders: () => number;
} {
  let latest!: T;
  let renders = 0;

  function Probe() {
    latest = hook();
    renders += 1;
    return <Text>{String(latest)}</Text>;
  }

  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(<Probe />);
  });
  return { tree, value: () => latest, renders: () => renders };
}

describe('zustand useStore over the core store', () => {
  it('reads the current value', () => {
    const { value } = renderHook(() => useIsMember());
    expect(value()).toBe(false);
  });

  it('re-renders when the core store changes', () => {
    const { value } = renderHook(() => useIsMember());

    act(() => {
      coreStores.membership.getState().join(10, 'monatlich', 'Test');
    });

    expect(value()).toBe(true);
  });

  it('does not re-render for an unrelated field in the same store', () => {
    const { renders } = renderHook(() => useIsMember());
    const before = renders();

    act(() => {
      coreStores.membership.setState({ amountEur: 99 });
    });

    // The selector narrows to isMember, so an amount change must not cost a render.
    expect(renders()).toBe(before);
  });

  it('tracks a parameterised selector', () => {
    const url = 'https://correctiv.org/x/';
    const { value } = renderHook(() => useIsSaved(url));
    expect(value()).toBe(false);

    act(() => {
      coreStores.savedArticles
        .getState()
        .toggle({ url, title: 'X', topline: null, rating: null, savedAt: 'now' });
    });

    expect(value()).toBe(true);
  });
});

describe('selectors that build new arrays', () => {
  it('useSelectedInterests renders without an infinite loop', () => {
    // Without the useMemo in core.ts this throws:
    // "The result of getSnapshot should be cached to avoid an infinite loop".
    const { value, renders } = renderHook(() => useSelectedInterests());
    expect(value()).toEqual([]);
    expect(renders()).toBeLessThan(5);
  });

  it('useSelectedInterests updates on toggle and stays referentially stable', () => {
    const { value } = renderHook(() => useSelectedInterests());

    act(() => {
      coreStores.interests.getState().toggle('klima');
    });
    const afterToggle = value();
    expect(afterToggle.map((i) => i.id)).toEqual(['klima']);

    act(() => {
      // A change in a different store must not produce a new array here.
      coreStores.membership.setState({ amountEur: 42 });
    });
    expect(value()).toBe(afterToggle);
  });

  it('useExtraFeeds renders without an infinite loop', () => {
    const { renders } = renderHook(() => useExtraFeeds());
    expect(renders()).toBeLessThan(5);
  });
});
