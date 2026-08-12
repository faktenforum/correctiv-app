import AsyncStorage from '@react-native-async-storage/async-storage';

import { CONTENT_FEEDS, FEEDS, PODCAST_CHANNELS } from '@correctiv/app-core/data/feeds.config';
import type { FeedKey } from '@correctiv/app-core/types/models';

import { OFFLINE_COVERS } from '../src/lib/articles/covers';
import {
  expoPlatform,
  hydratePlatform,
  isPlatformHydrated,
  resetPlatformCache,
} from '../src/lib/platform/expo';

/**
 * The core's KeyValueStore port is synchronous; AsyncStorage is not. The adapter
 * bridges that with an in-memory mirror hydrated once at startup, so these tests
 * pin the two things that bridge can get wrong:
 *
 *  - reads before hydration (would start the app with empty state and then
 *    overwrite the real state on the first write — silent data loss)
 *  - writes not reaching AsyncStorage, or reaching it under the wrong key
 */

jest.mock('@react-native-async-storage/async-storage', () => {
  const store = new Map<string, string>();
  return {
    __store: store,
    getAllKeys: jest.fn(async () => [...store.keys()]),
    multiGet: jest.fn(async (keys: string[]) => keys.map((k) => [k, store.get(k) ?? null])),
    getItem: jest.fn(async (k: string) => store.get(k) ?? null),
    setItem: jest.fn(async (k: string, v: string) => void store.set(k, v)),
    removeItem: jest.fn(async (k: string) => void store.delete(k)),
  };
});

const backing = (AsyncStorage as unknown as { __store: Map<string, string> }).__store;

/** Lets the best-effort background writes settle. */
const flushed = () => new Promise((resolve) => setImmediate(resolve));

beforeEach(() => {
  backing.clear();
  resetPlatformCache();
  jest.clearAllMocks();
});

describe('hydration', () => {
  it('is not hydrated until hydratePlatform resolves', async () => {
    expect(isPlatformHydrated()).toBe(false);
    await hydratePlatform();
    expect(isPlatformHydrated()).toBe(true);
  });

  it('loads persisted values into synchronous reads', async () => {
    backing.set('kv:store.settings', JSON.stringify({ theme: 'dark' }));
    await hydratePlatform();
    expect(expoPlatform.keyValue.getString('store.settings')).toBe('{"theme":"dark"}');
  });

  it('ignores keys this adapter does not own', async () => {
    backing.set('saved-articles', 'some other library');
    backing.set('kv:mine', 'mine');
    await hydratePlatform();
    expect(expoPlatform.keyValue.getString('mine')).toBe('mine');
    // Not prefixed, so it is somebody else's — must not surface as ours.
    expect(expoPlatform.keyValue.getString('saved-articles')).toBeNull();
  });

  it('still starts when storage throws', async () => {
    (AsyncStorage.getAllKeys as jest.Mock).mockRejectedValueOnce(new Error('boom'));
    // The adapter warns on purpose; silence it here so a real warning during
    // another test still stands out in the output.
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

    await expect(hydratePlatform()).resolves.toBeUndefined();
    expect(isPlatformHydrated()).toBe(true);
    expect(expoPlatform.keyValue.getString('anything')).toBeNull();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe('keyValue port', () => {
  it('reads back synchronously in the same tick as the write', async () => {
    await hydratePlatform();
    expoPlatform.keyValue.setString('k', 'v');
    // Synchronous visibility is the whole reason for the mirror.
    expect(expoPlatform.keyValue.getString('k')).toBe('v');
  });

  it('flushes writes to AsyncStorage under a namespaced key', async () => {
    await hydratePlatform();
    expoPlatform.keyValue.setString('store.membership', '{"isMember":true}');
    await flushed();
    expect(backing.get('kv:store.membership')).toBe('{"isMember":true}');
  });

  it('remove clears both the mirror and the backing store', async () => {
    backing.set('kv:gone', 'x');
    await hydratePlatform();
    expoPlatform.keyValue.remove('gone');
    expect(expoPlatform.keyValue.getString('gone')).toBeNull();
    await flushed();
    expect(backing.has('kv:gone')).toBe(false);
  });

  it('survives a failed write without throwing at the call site', async () => {
    await hydratePlatform();
    (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error('disk full'));
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

    expect(() => expoPlatform.keyValue.setString('k', 'v')).not.toThrow();
    await flushed();
    // Best-effort, but never silent.
    expect(warn).toHaveBeenCalled();
    // The in-memory value stands, so the session keeps working.
    expect(expoPlatform.keyValue.getString('k')).toBe('v');
    warn.mockRestore();
  });
});

/**
 * The blob port is asynchronous by contract and therefore NOT mirrored in memory:
 * it holds cached feeds, and pulling a megabyte of them in before the first frame
 * is what the sync version of this port used to force.
 */
describe('blobs port', () => {
  it('namespaces blobs so two feeds cannot collide', async () => {
    await expoPlatform.blobs.write('rss', 'faktencheck', 'A');
    await expoPlatform.blobs.write('peertube', 'faktencheck', 'B');

    expect(await expoPlatform.blobs.read('rss', 'faktencheck')).toBe('A');
    expect(await expoPlatform.blobs.read('peertube', 'faktencheck')).toBe('B');
    expect(backing.get('blob:rss/faktencheck')).toBe('A');
  });

  it('returns null for an unknown blob', async () => {
    expect(await expoPlatform.blobs.read('rss', 'nope')).toBeNull();
  });

  it('needs no hydration — a cold read goes straight to storage', async () => {
    backing.set('blob:rss/klima', 'cached xml');
    expect(isPlatformHydrated()).toBe(false);
    expect(await expoPlatform.blobs.read('rss', 'klima')).toBe('cached xml');
  });

  it('treats a storage fault as a cache miss rather than an error', async () => {
    (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(new Error('disk gone'));
    expect(await expoPlatform.blobs.read('rss', 'klima')).toBeNull();
  });
});

/**
 * The bundle is this host's offline promise: the reader has to open without a
 * network, which is the whole reason `npm run offline-articles` exists. On the web
 * target it is more than a promise — correctiv.org sends no CORS header, so the
 * snapshots are the only articles a browser will ever see.
 */
describe('content bundle', () => {
  it('serves a bundled article by its url, and null for anything else', () => {
    const [url] = Object.keys(
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('../src/lib/articles/offlineBundle.generated').OFFLINE_ARTICLES,
    );
    expect(expoPlatform.content.article(url)?.bodyHtml.length).toBeGreaterThan(200);
    expect(expoPlatform.content.article('https://correctiv.org/nope/')).toBeNull();
  });

  it('serves a bundled snapshot for every content feed', () => {
    for (const key of CONTENT_FEEDS) {
      expect(expoPlatform.content.feed(key)?.length ?? 0).toBeGreaterThan(0);
    }
  });

  it('answers null for a feed it holds no snapshot of', () => {
    // A feed the catalogue marks `empty` is never snapshotted, so it is the honest
    // case for "the host has nothing" — the port's null, not an empty array.
    const notSnapshotted = (Object.keys(FEEDS) as FeedKey[]).find(
      (key) => !CONTENT_FEEDS.includes(key),
    );
    expect(notSnapshotted).toBeDefined();
    expect(expoPlatform.content.feed(notSnapshotted!)).toBeNull();
  });

  it('serves a bundled snapshot for every curated podcast show', () => {
    // The Mediathek's cascade falls through to the four-show sample seed in the
    // core when a show is missing here, and nothing on screen says which one you
    // are looking at beyond a single line. A gap in this bundle is therefore a
    // demo that quietly shows made-up episodes.
    for (const handle of PODCAST_CHANNELS) {
      expect(expoPlatform.content.podcastSeries(handle)?.episodes.length ?? 0).toBeGreaterThan(0);
    }
    expect(expoPlatform.content.podcastSeries('gibt-es-nicht')).toBeNull();
  });

  it('serves bundled covers as data URIs, not as the remote URL', () => {
    // Echoing the remote URL back is what this port used to do, and it made
    // `adoptBundledImages` in the core a no-op: offline, the URL it replaced was
    // just as unreachable as the one it replaced it with.
    const covers = Object.values(OFFLINE_COVERS);
    expect(covers.length).toBeGreaterThan(0);
    for (const cover of covers) expect(cover.startsWith('data:image/')).toBe(true);

    const [withCover] = Object.keys(OFFLINE_COVERS);
    expect(expoPlatform.content.image(withCover)).toBe(OFFLINE_COVERS[withCover]);
    expect(expoPlatform.content.image('https://correctiv.org/nope/')).toBeNull();
  });
});
