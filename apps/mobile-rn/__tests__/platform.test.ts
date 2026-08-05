import AsyncStorage from '@react-native-async-storage/async-storage';

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

describe('files port', () => {
  it('namespaces blobs so two feeds cannot collide', async () => {
    await hydratePlatform();
    expoPlatform.files.write('rss', 'faktencheck', 'A');
    expoPlatform.files.write('peertube', 'faktencheck', 'B');

    expect(expoPlatform.files.read('rss', 'faktencheck')).toBe('A');
    expect(expoPlatform.files.read('peertube', 'faktencheck')).toBe('B');
    await flushed();
    expect(backing.get('file:rss/faktencheck')).toBe('A');
  });

  it('returns null for an unknown blob', async () => {
    await hydratePlatform();
    expect(expoPlatform.files.read('rss', 'nope')).toBeNull();
  });
});
