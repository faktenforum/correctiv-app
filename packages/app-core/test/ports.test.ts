import { beforeEach, describe, expect, it, vi } from 'vitest';
import { configurePlatform, createMemoryPlatform, platform, resetPlatform } from '../src/ports';
import { clearMemoryCache, getCached, getStale, setCached } from '../src/services/cache.service';
import {
  registerExclusiveMedium,
  resetExclusiveMedia,
  stopOtherMedia,
} from '../src/media/exclusive-playback';

beforeEach(() => {
  resetPlatform();
  clearMemoryCache();
  resetExclusiveMedia();
});

describe('platform ports', () => {
  it('works unconfigured, so tests and headless tooling need no setup', () => {
    expect(platform().keyValue.getString('nothing')).toBeNull();
    expect(platform().files.read('ns', 'nothing')).toBeNull();
  });

  it('lets a host take over storage', () => {
    const host = createMemoryPlatform();
    configurePlatform(host);
    platform().keyValue.setString('k', 'v');
    expect(host.keyValue.getString('k')).toBe('v');
  });

  it('round-trips and removes key/value entries', () => {
    const kv = platform().keyValue;
    kv.setString('store.settings', '{"theme":"dark"}');
    expect(kv.getString('store.settings')).toBe('{"theme":"dark"}');
    kv.remove('store.settings');
    expect(kv.getString('store.settings')).toBeNull();
  });
});

describe('cache.service', () => {
  it('returns a fresh entry within its TTL', () => {
    setCached('feeds', 'recherchen', [{ id: '1' }]);
    expect(getCached('feeds', 'recherchen', 60_000)).toEqual([{ id: '1' }]);
  });

  it('treats an entry older than its TTL as a miss', () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-08-01T10:00:00Z'));
      setCached('feeds', 'recherchen', ['old']);
      vi.setSystemTime(new Date('2026-08-01T10:05:00Z'));
      expect(getCached('feeds', 'recherchen', 60_000)).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('still serves an expired entry as stale — the offline fallback', () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-08-01T10:00:00Z'));
      setCached('feeds', 'recherchen', ['old']);
      vi.setSystemTime(new Date('2026-08-01T11:00:00Z'));
      clearMemoryCache(); // force it through the FileStore port, not the session map
      expect(getCached('feeds', 'recherchen', 60_000)).toBeNull();
      expect(getStale('feeds', 'recherchen')).toEqual(['old']);
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps namespaces apart', () => {
    setCached('feeds', 'x', 'a');
    setCached('podcasts', 'x', 'b');
    expect(getCached('feeds', 'x', 60_000)).toBe('a');
    expect(getCached('podcasts', 'x', 60_000)).toBe('b');
  });

  it('survives a FileStore that throws — the blob cache is best-effort', () => {
    configurePlatform({
      keyValue: createMemoryPlatform().keyValue,
      files: {
        read() {
          throw new Error('disk gone');
        },
        write() {
          throw new Error('disk full');
        },
      },
    });
    expect(() => setCached('feeds', 'x', 'a')).not.toThrow();
    expect(getCached('feeds', 'x', 60_000)).toBe('a'); // session layer still answers
    clearMemoryCache();
    expect(getStale('feeds', 'x')).toBeNull();
  });

  it('ignores corrupt persisted payloads instead of throwing', () => {
    const files = createMemoryPlatform().files;
    configurePlatform({ keyValue: createMemoryPlatform().keyValue, files });
    setCached('feeds', 'x', 'a');
    clearMemoryCache();
    // overwrite the stored blob with garbage, whatever its hashed name is
    const spy = vi.spyOn(files, 'read').mockReturnValue('{ not json');
    expect(getStale('feeds', 'x')).toBeNull();
    spy.mockRestore();
  });
});

describe('exclusive playback', () => {
  it('stops every other medium but not the one starting', () => {
    const audio = vi.fn();
    const video = vi.fn();
    registerExclusiveMedium('audio', audio);
    registerExclusiveMedium('video', video);

    stopOtherMedia('video');
    expect(audio).toHaveBeenCalledTimes(1);
    expect(video).not.toHaveBeenCalled();

    stopOtherMedia('audio');
    expect(video).toHaveBeenCalledTimes(1);
    expect(audio).toHaveBeenCalledTimes(1);
  });

  it('is a no-op when nothing is registered', () => {
    expect(() => stopOtherMedia('audio')).not.toThrow();
  });

  it('does not let one failing medium block the others', () => {
    const boom = vi.fn(() => {
      throw new Error('player detached');
    });
    const other = vi.fn();
    registerExclusiveMedium('boom', boom);
    registerExclusiveMedium('other', other);

    expect(() => stopOtherMedia('starter')).not.toThrow();
    expect(other).toHaveBeenCalledTimes(1);
  });
});
