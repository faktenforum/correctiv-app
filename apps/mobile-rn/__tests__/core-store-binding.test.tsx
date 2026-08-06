import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Text } from 'react-native';

import { resetPlatform } from '@correctiv/app-core';
import { clearMemoryCache } from '@correctiv/app-core/services/cache.service';

import {
  coreStores,
  useExtraFeeds,
  useIsMember,
  useIsSaved,
  useSelectedInterests,
  useVideoChannel,
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
  media: coreStores.media.getState(),
};

beforeEach(() => {
  // Inside act(): a store reset notifies subscribers, and a mounted probe from a
  // previous test would otherwise re-render outside React's batching and warn.
  act(() => {
    coreStores.membership.setState(initial.membership, true);
    coreStores.interests.setState(initial.interests, true);
    coreStores.savedArticles.setState(initial.saved, true);
    coreStores.media.setState(initial.media, true);
  });
});

/**
 * Every tree this creates is unmounted after the test.
 *
 * Leaking them is not cosmetic: a probe left mounted stays SUBSCRIBED, so the
 * store reset in beforeEach re-renders it, its effect fires, and the next test
 * starts against a store some earlier component already moved. That is exactly
 * how "kicks off the load on first use" saw zero requests — the previous test's
 * probe had already done the loading.
 */
const mounted: ReactTestRenderer[] = [];

afterEach(() => {
  act(() => {
    for (const tree of mounted) tree.unmount();
  });
  mounted.length = 0;
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
  mounted.push(tree);
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
        .toggle({ url, title: 'X', kicker: null, rating: null, savedAt: 'now' });
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

describe('useVideoChannel', () => {
  /**
   * The hook loads on first use, so mounting it reaches for the network. Stub
   * fetch with an empty-but-valid Atom feed: without this the suite makes a real
   * request to YouTube, jest reports an open handle, and the result depends on
   * whoever's Wi-Fi is running the tests.
   */
  const realFetch = global.fetch;
  let fetchCalls: string[];

  beforeEach(() => {
    fetchCalls = [];
    global.fetch = ((url: string) => {
      fetchCalls.push(url);
      // fetchText only touches .ok and .text().
      return Promise.resolve({ ok: true, text: () => Promise.resolve('<feed></feed>') });
    }) as unknown as typeof global.fetch;
    // The core's blob cache outlives a single test, on BOTH its layers: the
    // session map here and the FileStore behind the default memory platform.
    // An empty feed from an earlier test caches as `[]`, and the store's
    // `if (cached)` counts that as a hit — so without clearing both, the next
    // test sees a cache hit instead of a fetch and passes or fails by order.
    clearMemoryCache();
    resetPlatform();
  });

  afterAll(() => {
    global.fetch = realFetch;
  });

  /** Lets the store's async fetch settle inside React's batching. */
  const flush = () => act(async () => undefined);

  /**
   * This hook selects `byKey[key]`, an object. That only works because the media
   * store patches immutably — `byKey` gets a new object but the OTHER channels'
   * slices keep their identity. If a refactor ever rebuilds all three slices per
   * update, this hook starts returning a fresh object on every render and React
   * throws the getSnapshot loop error. Hence a render count, not just a value.
   */
  it('subscribes to one channel without an infinite loop', async () => {
    const { value, renders } = renderHook(() => useVideoChannel('gespraech'));
    expect(value().videos).toEqual([]);
    expect(renders()).toBeLessThan(5);
    await flush();
  });

  it('kicks off the load on first use, and only once', async () => {
    renderHook(() => useVideoChannel('gespraech'));
    await flush();

    // One request for the channel it was asked for — the store's own guard plus
    // the hook's idle check must not add a second.
    expect(fetchCalls).toHaveLength(1);
    expect(fetchCalls[0]).toContain('youtube.com/feeds/videos.xml');
  });

  it('re-renders when its own channel changes', async () => {
    const { value } = renderHook(() => useVideoChannel('gespraech'));

    act(() => {
      coreStores.media.setState((state) => ({
        byKey: {
          ...state.byKey,
          gespraech: { videos: [{ id: 'v1' } as never], status: 'ready' as const },
        },
      }));
    });

    expect(value().status).toBe('ready');
    expect(value().videos).toHaveLength(1);
    await flush();
  });

  it('does not re-render when a different channel changes', async () => {
    const { renders } = renderHook(() => useVideoChannel('gespraech'));
    const before = renders();

    act(() => {
      coreStores.media.setState((state) => ({
        byKey: {
          ...state.byKey,
          funfacts: { videos: [{ id: 'v2' } as never], status: 'ready' as const },
        },
      }));
    });

    // The whole point of selecting one slice: FunFacts loading must not re-render
    // a component showing "CORRECTIV im Gespräch".
    expect(renders()).toBe(before);
    await flush();
  });
});
