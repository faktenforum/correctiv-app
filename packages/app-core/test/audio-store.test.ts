import { beforeEach, describe, expect, it, vi } from 'vitest';

import { resetExclusiveMedia } from '../src/media/exclusive-playback';
import {
  configurePlatform,
  createMemoryPlatform,
  type AudioBackend,
  type PlaybackStatus,
} from '../src/ports';
import { audioStore, isLive, resetAudioStore } from '../src/stores/audio';

/**
 * The audio state machine, driven through the port rather than through a real SDK.
 *
 * `apps/mobile-rn/__tests__/audio-player.test.ts` already covers this via expo-audio.
 * What that cannot cover is a backend that behaves like the NativeScript one — and
 * the difference between them cost this project a crash on a device. So the fake here
 * is deliberately the AWKWARD shape: a backend whose commands are allowed to call the
 * status listener straight back.
 */
interface Fake extends AudioBackend {
  /** Feed a tick in, as the host's timer or callback would. */
  tick(partial: Partial<PlaybackStatus>): void;
  calls: string[];
  /** Emit from inside pause(), the way the NativeScript backend used to. */
  reentrant: boolean;
}

function createFakeBackend(): Fake {
  let listener: ((status: PlaybackStatus) => void) | null = null;
  let last: PlaybackStatus = {
    playing: false,
    loaded: true,
    buffering: false,
    positionSec: 0,
    durationSec: 100,
    finished: false,
    live: false,
    error: null,
  };

  const fake: Fake = {
    calls: [],
    reentrant: false,
    tick(partial) {
      last = { ...last, ...partial };
      listener?.(last);
    },
    load(url) {
      fake.calls.push(`load:${url}`);
      return Promise.resolve();
    },
    play() {
      fake.calls.push('play');
    },
    pause() {
      fake.calls.push('pause');
      // The shape that used to recurse: a command reporting back synchronously.
      if (fake.reentrant) listener?.({ ...last, playing: false });
    },
    seekTo(seconds) {
      fake.calls.push(`seek:${seconds}`);
      return Promise.resolve();
    },
    setRate(rate) {
      fake.calls.push(`rate:${rate}`);
    },
    release() {
      fake.calls.push('release');
    },
    onStatus(next) {
      listener = next;
    },
  };
  return fake;
}

let backend: Fake;

const EPISODE = {
  title: 'Bonusfolge',
  subtitle: 'Backstage · Club',
  url: 'https://salon5.correctiv.net/x.mp3',
  episodeId: 'bonus-1',
};

beforeEach(() => {
  resetExclusiveMedia();
  resetAudioStore();
  backend = createFakeBackend();
  configurePlatform({ ...createMemoryPlatform(), audio: backend });
});

describe('starting playback', () => {
  it('loads the track and marks the radio live', async () => {
    await audioStore.getState().playRadio();
    expect(backend.calls).toEqual(['load:https://icecast.correctiv.net/salon5low', 'play']);
    expect(isLive(audioStore.getState())).toBe(true);
    expect(audioStore.getState().status).toBe('loading');
  });

  it('follows the ticks through to playing', async () => {
    await audioStore.getState().playEpisode(EPISODE);
    backend.tick({ playing: true, positionSec: 3 });
    expect(audioStore.getState()).toMatchObject({ status: 'playing', positionSec: 3 });
  });

  it('reports buffering as loading, not as paused', async () => {
    await audioStore.getState().playEpisode(EPISODE);
    backend.tick({ playing: false, buffering: true, loaded: true });
    expect(audioStore.getState().status).toBe('loading');
  });

  it('says so when the host has no audio backend at all (the web target)', async () => {
    configurePlatform(createMemoryPlatform());
    resetAudioStore();
    await audioStore.getState().playRadio();
    expect(audioStore.getState().status).toBe('error');
    expect(audioStore.getState().errorMessage).toMatch(/keine Wiedergabe/);
  });
});

describe('failures', () => {
  /**
   * The regression this fake's awkward shape exists for.
   *
   * The store calls `AudioBackend.pause()` when it gives up on a track. The
   * NativeScript backend used to emit a status tick from inside `pause()`, so the
   * store re-entered its own handler mid-decision and called `pause()` again — on a
   * device that was `RangeError: Maximum call stack size exceeded`. expo-audio does
   * not re-enter, so the Expo suite could not see it.
   *
   * Two things stop it now and this asserts both: the store sets state BEFORE
   * issuing a command, and the sticky-error guard turns the re-entrant tick around.
   */
  it('survives a backend that reports back from inside pause()', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    backend.reentrant = true;
    await audioStore.getState().playEpisode(EPISODE);

    expect(() => backend.tick({ error: 'Source unavailable' })).not.toThrow();

    // Once, not once per stack frame.
    expect(backend.calls.filter((c) => c === 'pause')).toHaveLength(1);
    expect(audioStore.getState().status).toBe('error');
    warn.mockRestore();
  });

  it('surfaces a playback error with a hint, and stops', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await audioStore.getState().playEpisode(EPISODE);
    backend.tick({ error: 'Source unavailable' });

    expect(backend.calls).toContain('pause');
    expect(audioStore.getState().status).toBe('error');
    expect(audioStore.getState().errorMessage).toMatch(/Internetverbindung/);
    warn.mockRestore();
  });

  it('keeps the error visible when the next tick looks merely unloaded', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await audioStore.getState().playRadio();
    backend.tick({ error: 'Source error' });
    expect(audioStore.getState().status).toBe('error');

    // What a player really sends after a failed source: no error field any more,
    // still not loaded. Seen on a device — the mini bar fell back to "Lädt …" and
    // sat there, which is the endless spinner the watchdog exists to prevent.
    backend.tick({ error: null, loaded: false, playing: false });

    expect(audioStore.getState().status).toBe('error');
    warn.mockRestore();
  });

  it('gives up on a stream that never loads', async () => {
    vi.useFakeTimers();
    try {
      await audioStore.getState().playRadio();
      expect(audioStore.getState().status).toBe('loading');
      vi.advanceTimersByTime(12000);
      expect(audioStore.getState().status).toBe('error');
      expect(audioStore.getState().errorMessage).toMatch(/Keine Verbindung/);
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not fire the watchdog once the source is loaded', async () => {
    vi.useFakeTimers();
    try {
      await audioStore.getState().playRadio();
      backend.tick({ playing: true, loaded: true, live: true });
      vi.advanceTimersByTime(12000);
      expect(audioStore.getState().status).toBe('playing');
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('stopping and coordinating', () => {
  it('releases the source and the state', async () => {
    await audioStore.getState().playRadio();
    audioStore.getState().stop();

    expect(backend.calls).toContain('release');
    expect(audioStore.getState()).toMatchObject({ track: null, status: 'idle', speed: 1 });
  });

  it('ignores ticks that arrive after stopping', async () => {
    await audioStore.getState().playEpisode(EPISODE);
    audioStore.getState().stop();

    backend.tick({ playing: true, positionSec: 42 });

    expect(audioStore.getState()).toMatchObject({ track: null, positionSec: 0 });
  });

  it('keeps the speed in state so the player can show it', async () => {
    await audioStore.getState().playEpisode(EPISODE);
    audioStore.getState().setSpeed(1.5);

    expect(backend.calls).toContain('rate:1.5');
    expect(audioStore.getState().speed).toBe(1.5);
  });

  it('does not seek a live stream', async () => {
    await audioStore.getState().playRadio();
    await audioStore.getState().seekTo(30);
    expect(backend.calls.some((c) => c.startsWith('seek:'))).toBe(false);
  });
});
