import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Text } from 'react-native';
import { Provider } from 'react-redux';

import { resetPlatform } from '@correctiv/app-core';
import { clearMemoryCache } from '@correctiv/app-core/services/cache.service';
import { patch as mediaPatch } from '@correctiv/app-core/stores/media';
import { join, setPaused } from '@correctiv/app-core/stores/membership';
import { toggle as toggleInterest } from '@correctiv/app-core/stores/interests';
import { toggle as toggleSaved } from '@correctiv/app-core/stores/savedArticles';
import { resetStore } from '@correctiv/app-core/stores/store';

import {
  coreStore,
  useExtraFeeds,
  useIsMember,
  useIsSaved,
  useSelectedInterests,
  useVideoChannel,
} from '@/lib/store/core';

/**
 * Proves the React side actually binds to the core's Redux store.
 *
 * Two things could break here and both are invisible to typecheck:
 *
 *  1. The Provider and the bound actions have to reach the SAME store instance.
 *     The core exports a singleton and the binding dispatches straight into it,
 *     so a second copy — a duplicated module under Metro, say — would show up as
 *     a component that never updates.
 *  2. `useSelector` compares results by REFERENCE. A selector that builds a fresh
 *     array on every call therefore re-renders its component on every dispatch in
 *     the app, including the audio position tick twice a second. That is why the
 *     interest hooks subscribe to the raw array and derive under useMemo.
 */

beforeEach(() => {
  // Inside act(): a reset notifies subscribers, and a mounted probe from a
  // previous test would otherwise re-render outside React's batching and warn.
  act(() => {
    coreStore.dispatch(resetStore());
  });
});

/**
 * Every tree this creates is unmounted after the test.
 *
 * Leaking them is not cosmetic: a probe left mounted stays SUBSCRIBED, so the
 * reset in beforeEach re-renders it, its effect fires, and the next test starts
 * against a store some earlier component already moved. That is exactly how
 * "kicks off the load on first use" saw zero requests — the previous test's probe
 * had already done the loading.
 */
const mounted: ReactTestRenderer[] = [];

afterEach(() => {
  act(() => {
    for (const tree of mounted) tree.unmount();
  });
  mounted.length = 0;
});

/** Renders a hook under the Provider and reports how many times it rendered. */
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
    tree = create(
      <Provider store={coreStore}>
        <Probe />
      </Provider>,
    );
  });
  mounted.push(tree);
  return { tree, value: () => latest, renders: () => renders };
}

describe('useSelector over the core store', () => {
  it('reads the current value', () => {
    const { value } = renderHook(() => useIsMember());
    expect(value()).toBe(false);
  });

  it('re-renders when the store changes', () => {
    const { value } = renderHook(() => useIsMember());

    act(() => {
      coreStore.dispatch(join(10, 'monatlich', 'Test'));
    });

    expect(value()).toBe(true);
  });

  it('does not re-render for an unrelated field in the same slice', () => {
    const { renders } = renderHook(() => useIsMember());
    const before = renders();

    act(() => {
      coreStore.dispatch(setPaused(true));
    });

    // The selector narrows to isMember, so a pause must not cost a render.
    expect(renders()).toBe(before);
  });

  it('tracks a parameterised selector', () => {
    const url = 'https://correctiv.org/x/';
    const { value } = renderHook(() => useIsSaved(url));
    expect(value()).toBe(false);

    act(() => {
      coreStore.dispatch(
        toggleSaved({ url, title: 'X', kicker: null, rating: null, savedAt: 'now' }),
      );
    });

    expect(value()).toBe(true);
  });
});

describe('selectors that build new arrays', () => {
  it('useSelectedInterests renders without an infinite loop', () => {
    const { value, renders } = renderHook(() => useSelectedInterests());
    expect(value()).toEqual([]);
    expect(renders()).toBeLessThan(5);
  });

  it('useSelectedInterests updates on toggle and stays referentially stable', () => {
    const { value } = renderHook(() => useSelectedInterests());

    act(() => {
      coreStore.dispatch(toggleInterest('klima'));
    });
    const afterToggle = value();
    expect(afterToggle.map((i) => i.id)).toEqual(['klima']);

    act(() => {
      // A change in a different slice must not produce a new array here.
      coreStore.dispatch(setPaused(true));
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
    // An empty feed from an earlier test caches as `[]`, and the thunk's
    // `if (cached)` counts that as a hit — so without clearing both, the next
    // test sees a cache hit instead of a fetch and passes or fails by order.
    clearMemoryCache();
    resetPlatform();
  });

  afterAll(() => {
    global.fetch = realFetch;
  });

  /** Lets the thunk settle inside React's batching. */
  const flush = () => act(async () => undefined);

  /**
   * This hook selects `byKey[key]`, an object. That only works because the media
   * slice patches one channel at a time — Immer gives `byKey` a new identity but
   * leaves the OTHER channels' slices alone. If a refactor ever rebuilt all three
   * per update, this hook would return a fresh object on every dispatch and
   * re-render on FunFacts' loading. Hence a render count, not just a value.
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

    // One request for the channel it was asked for — the thunk's own guard plus
    // the hook's idle check must not add a second.
    expect(fetchCalls).toHaveLength(1);
    expect(fetchCalls[0]).toContain('youtube.com/feeds/videos.xml');
  });

  it('re-renders when its own channel changes', async () => {
    const { value } = renderHook(() => useVideoChannel('gespraech'));

    act(() => {
      coreStore.dispatch(
        mediaPatch('gespraech', { videos: [{ id: 'v1' } as never], status: 'ready' }),
      );
    });

    expect(value().status).toBe('ready');
    expect(value().videos).toHaveLength(1);
    await flush();
  });

  it('does not re-render when a different channel changes', async () => {
    const { renders } = renderHook(() => useVideoChannel('gespraech'));
    const before = renders();

    act(() => {
      coreStore.dispatch(
        mediaPatch('funfacts', { videos: [{ id: 'v2' } as never], status: 'ready' }),
      );
    });

    // The whole point of selecting one slice: FunFacts loading must not re-render
    // a component showing "CORRECTIV im Gespräch".
    expect(renders()).toBe(before);
    await flush();
  });
});
