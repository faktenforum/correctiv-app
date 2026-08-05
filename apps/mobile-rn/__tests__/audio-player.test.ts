import type { AudioStatus } from 'expo-audio';

import {
  registerExclusiveMedium,
  resetExclusiveMedia,
} from '@correctiv/app-core/media/exclusive-playback';

/**
 * The audio singleton's policy, not expo-audio's plumbing.
 *
 * Three things here are product rules that no typecheck can protect: the club
 * preview stops at 60 seconds, only one medium plays at a time, and a stream that
 * never loads has to say so instead of spinning. The NativeScript version got the
 * first one subtly wrong — its limit fired once, so a second tap on play released
 * the whole club episode — which is exactly why it is pinned here.
 */

/**
 * Records what the real AudioPlayer would have been told, and lets tests emit
 * status updates. The `mock` prefix is required: jest hoists `jest.mock` above the
 * imports, and its babel plugin only lets a factory reach out-of-scope variables
 * whose name starts with it.
 */
const mockPlayer = {
  play: jest.fn(),
  pause: jest.fn(),
  replace: jest.fn(),
  seekTo: jest.fn(() => Promise.resolve()),
  setPlaybackRate: jest.fn(),
  setActiveForLockScreen: jest.fn(),
  clearLockScreenControls: jest.fn(),
  remove: jest.fn(),
  addListener: jest.fn((_event: string, listener: (status: AudioStatus) => void) => {
    emit = listener;
    return { remove: jest.fn() };
  }),
};
let emit: ((status: AudioStatus) => void) | null = null;

jest.mock('expo-audio', () => ({
  createAudioPlayer: jest.fn(() => mockPlayer),
  setAudioModeAsync: jest.fn(() => Promise.resolve()),
}));

import {
  acknowledgePreviewEnd,
  audioStore,
  isLive,
  playEpisode,
  playPreview,
  playRadio,
  PREVIEW_LIMIT_SEC,
  resetAudioForTests,
  setSpeed,
  stop,
  togglePlay,
} from '@/lib/audio/player';

/** A status update with only the fields under test spelled out. */
function status(partial: Partial<AudioStatus>): AudioStatus {
  return {
    id: 'p1',
    currentTime: 0,
    playbackState: '',
    timeControlStatus: '',
    reasonForWaitingToPlay: '',
    mute: false,
    duration: 0,
    playing: false,
    loop: false,
    didJustFinish: false,
    isBuffering: false,
    isLoaded: true,
    playbackRate: 1,
    shouldCorrectPitch: true,
    isLive: false,
    currentOffsetFromLive: null,
    error: null,
    ...partial,
  } as AudioStatus;
}

const EPISODE = {
  title: 'Bonusfolge',
  subtitle: 'Backstage · Club',
  url: 'https://salon5.correctiv.net/x.mp3',
  episodeId: 'bonus-1',
};

beforeEach(() => {
  jest.clearAllMocks();
  resetExclusiveMedia();
  resetAudioForTests();
  emit = null;
});

afterEach(() => {
  jest.useRealTimers();
});

describe('starting playback', () => {
  it('loads the Icecast stream and marks it live', async () => {
    await playRadio();

    expect(mockPlayer.replace).toHaveBeenCalledWith({
      uri: 'https://icecast.correctiv.net/salon5low',
    });
    expect(mockPlayer.play).toHaveBeenCalled();
    expect(isLive(audioStore.getState())).toBe(true);
    expect(audioStore.getState().status).toBe('loading');
  });

  it('claims the lock screen with the track metadata', async () => {
    await playRadio();

    // Without this the OS shows no controls at all — and it only works because
    // ensureAudioMode sets interruptionMode 'doNotMix'.
    expect(mockPlayer.setActiveForLockScreen).toHaveBeenCalledWith(
      true,
      expect.objectContaining({ title: 'Salon5 Radio' }),
    );
  });

  it('follows the player status through to playing', async () => {
    await playRadio();
    emit?.(status({ playing: true, currentTime: 3, isLive: true, duration: 0 }));

    expect(audioStore.getState()).toMatchObject({ status: 'playing', positionSec: 3 });
  });

  it('reports buffering as loading, not as paused', async () => {
    await playEpisode(EPISODE);
    emit?.(status({ playing: false, isBuffering: true, isLoaded: true }));

    expect(audioStore.getState().status).toBe('loading');
  });

  it('resolves the bundled sample episode instead of treating it as a URL', async () => {
    // The core's sample data carries a NativeScript-relative path.
    await playEpisode({ ...EPISODE, url: 'assets/audio/sample-episode.mp3' });

    const source = mockPlayer.replace.mock.calls.at(-1)?.[0];
    expect(typeof source).toBe('number'); // a Metro asset id, not { uri }
    expect(audioStore.getState().status).toBe('loading');
  });
});

describe('the 60-second club preview', () => {
  it('pauses exactly at the limit and asks for the invitation', async () => {
    await playPreview(EPISODE);
    emit?.(status({ playing: true, currentTime: PREVIEW_LIMIT_SEC, duration: 1380 }));

    expect(mockPlayer.pause).toHaveBeenCalled();
    expect(audioStore.getState()).toMatchObject({
      status: 'paused',
      positionSec: PREVIEW_LIMIT_SEC,
      previewEnded: true,
    });
  });

  it('does not resume past the limit on a second tap', async () => {
    await playPreview(EPISODE);
    emit?.(status({ playing: true, currentTime: PREVIEW_LIMIT_SEC }));
    mockPlayer.play.mockClear();
    acknowledgePreviewEnd();

    togglePlay();

    // The NativeScript hole: its limit fired once, and the next tap played the
    // club episode to the end.
    expect(mockPlayer.play).not.toHaveBeenCalled();
    expect(audioStore.getState().previewEnded).toBe(true);
  });

  it('leaves a full episode alone at the same position', async () => {
    await playEpisode(EPISODE);
    emit?.(status({ playing: true, currentTime: PREVIEW_LIMIT_SEC + 5, duration: 1380 }));

    expect(mockPlayer.pause).not.toHaveBeenCalled();
    expect(audioStore.getState()).toMatchObject({ status: 'playing', previewEnded: false });
  });
});

describe('failures', () => {
  it('surfaces a playback error with a hint, and stops', async () => {
    await playEpisode(EPISODE);
    emit?.(status({ error: 'Source unavailable' }));

    expect(mockPlayer.pause).toHaveBeenCalled();
    expect(audioStore.getState().status).toBe('error');
    expect(audioStore.getState().errorMessage).toMatch(/Internetverbindung/);
  });

  it('gives up on a stream that never loads', async () => {
    jest.useFakeTimers();
    await playRadio();
    expect(audioStore.getState().status).toBe('loading');

    jest.advanceTimersByTime(12000);

    // expo-audio does report errors, but the lesson from the NativeScript build
    // was that network errors sometimes never arrive at all.
    expect(audioStore.getState().status).toBe('error');
    expect(audioStore.getState().errorMessage).toMatch(/Keine Verbindung/);
  });

  it('does not fire the watchdog once the source is loaded', async () => {
    jest.useFakeTimers();
    await playRadio();
    emit?.(status({ playing: true, isLoaded: true, isLive: true }));

    jest.advanceTimersByTime(12000);

    expect(audioStore.getState().status).toBe('playing');
  });
});

describe('stopping and coordinating', () => {
  it('releases the source, the lock screen and the state', async () => {
    await playRadio();
    stop();

    // A paused live stream keeps buffering — releasing the source is the point.
    expect(mockPlayer.replace).toHaveBeenLastCalledWith(null);
    expect(mockPlayer.clearLockScreenControls).toHaveBeenCalled();
    expect(audioStore.getState()).toMatchObject({ track: null, status: 'idle', speed: 1 });
  });

  it('ignores status updates that arrive after stopping', async () => {
    await playEpisode(EPISODE);
    stop();

    emit?.(status({ playing: true, currentTime: 42 }));

    expect(audioStore.getState()).toMatchObject({ track: null, positionSec: 0 });
  });

  it('stops the video when audio starts', async () => {
    const stopVideo = jest.fn();
    registerExclusiveMedium('video', stopVideo);

    await playRadio();

    expect(stopVideo).toHaveBeenCalledTimes(1);
  });

  it('does not stop itself', async () => {
    const stopAudio = jest.fn();
    registerExclusiveMedium('audio', stopAudio);

    await playRadio();

    expect(stopAudio).not.toHaveBeenCalled();
  });

  it('keeps the speed in state so the player can show it', async () => {
    await playEpisode(EPISODE);
    setSpeed(1.5);

    expect(mockPlayer.setPlaybackRate).toHaveBeenCalledWith(1.5);
    expect(audioStore.getState().speed).toBe(1.5);
  });
});
