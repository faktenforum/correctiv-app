import AsyncStorage from '@react-native-async-storage/async-storage';

import { CONTENT_FEEDS, FEEDS, PODCAST_CHANNELS } from '@correctiv/app-core/data/feeds.config';
import type { FeedKey } from '@correctiv/app-core/types/models';

import { OFFLINE_COVERS } from '../src/lib/articles/covers';
import { expoPlatform } from '../src/lib/platform/expo';

/**
 * Both storage ports are asynchronous by contract, so this adapter is a thin
 * passthrough over AsyncStorage and these tests pin what a passthrough can still
 * get wrong: the key namespace, and what a storage fault turns into.
 *
 * It used to be more than that. `KeyValueStore` was synchronous, which forced an
 * in-memory mirror hydrated once at startup — and the tests here existed mostly to
 * pin the two ways that bridge could fail: a read before hydration (which started
 * the app on empty state and then overwrote the real state on the first write) and
 * a write that never reached AsyncStorage. The port went async, the mirror went
 * with it, and so did the first of those failure modes.
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

beforeEach(() => {
  backing.clear();
  jest.clearAllMocks();
});

describe('keyValue port', () => {
  it('round-trips under a namespaced key', async () => {
    await expoPlatform.keyValue.setString('store.membership', '{"isMember":true}');

    // The prefix is what keeps this adapter's keys out of everybody else's.
    expect(backing.get('kv:store.membership')).toBe('{"isMember":true}');
    expect(await expoPlatform.keyValue.getString('store.membership')).toBe('{"isMember":true}');
  });

  it('does not surface keys this adapter does not own', async () => {
    backing.set('saved-articles', 'some other library');
    backing.set('kv:mine', 'mine');

    expect(await expoPlatform.keyValue.getString('mine')).toBe('mine');
    // Not prefixed, so it is somebody else's — reading it as ours would hand
    // persist() a payload it never wrote.
    expect(await expoPlatform.keyValue.getString('saved-articles')).toBeNull();
  });

  it('removes from storage', async () => {
    backing.set('kv:gone', 'x');

    await expoPlatform.keyValue.remove('gone');

    expect(backing.has('kv:gone')).toBe(false);
    expect(await expoPlatform.keyValue.getString('gone')).toBeNull();
  });

  it('treats a failed read as an absent key, and says so', async () => {
    (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(new Error('disk gone'));
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

    // A read that fails and a key that is absent mean the same thing to persist():
    // start that slice from its initial state. Never silent, though — a broken
    // backend otherwise looks exactly like state resetting on its own.
    expect(await expoPlatform.keyValue.getString('store.settings')).toBeNull();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('lets a failed write reject, so the caller can retry it', async () => {
    (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error('disk full'));

    // Deliberately not swallowed here: persist() keeps its "last written" pointer
    // unchanged when a write rejects, so the next change to that slice tries
    // again. Swallowing it at this level would make that impossible.
    await expect(expoPlatform.keyValue.setString('k', 'v')).rejects.toThrow('disk full');
  });
});

/** The blob port: the same passthrough, for the feed and page cache. */
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

  it('reads what an earlier session cached', async () => {
    backing.set('blob:rss/klima', 'cached xml');
    expect(await expoPlatform.blobs.read('rss', 'klima')).toBe('cached xml');
  });

  it('treats a storage fault as a cache miss rather than an error', async () => {
    (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(new Error('disk gone'));
    expect(await expoPlatform.blobs.read('rss', 'klima')).toBeNull();
  });
});

/**
 * The bundle is this host's offline promise: the reader has to open without a
 * network, which is the whole reason `npm run offline-articles` exists. It was more
 * than a promise on the web target until ADR 0015, when the app moved to an API that
 * a browser can reach; the snapshots are the floor there now, not the ceiling.
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
