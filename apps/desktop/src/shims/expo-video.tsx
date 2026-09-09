// `expo-video`, played for real over GStreamer rather than declined.
//
// Two video paths exist in this app and they are different technologies:
// `components/media/VideoFrame` is a YouTube-nocookie embed, and this is PeerTube
// played natively over HLS. This one plays now; the YouTube stage is still an honest
// notice, and `src/overrides/VideoFrame.tsx` says why.
//
// WHAT CHANGED IS THE PREMISE, not the toolkit. The placeholder's reason was that
// `@gjsify/video` is GJS-only while the ship path puts macOS and Windows on Node. That
// is true of that library and says nothing about GStreamer, which this app already
// uses for audio — see `src/video/backend.ts` for the measurement on the real feed.
//
// The gap that is left is packaging rather than platform: the macOS and Windows
// runtime bundles ship no video plugins, so `createVideoPlayer` throws there and the
// notice below is what the screen gets. Measured against the published bundles, and
// recorded beside the code that would otherwise be blamed for it.

import { useCallback, useEffect, useRef, useState, type ReactElement } from 'react';

import { View } from 'react-native';

import { Typo } from '@/components/ui';
import { createVideoPlayer, VideoUnavailable, type VideoBackend } from '../video/backend.js';
import { installStage, openFullscreen } from '../video/stage.js';

export interface VideoPlayer {
  play: () => void;
  pause: () => void;
  replace: (source: unknown) => void;
  release: () => void;
  muted: boolean;
  loop: boolean;
  currentTime: number;
  readonly playing: boolean;
  /** This host's own: what `VideoView` renders, or null when there is no pipeline. */
  readonly paintable?: unknown;
  /** This host's own: the same object as a `Gtk.MediaStream`, for the control strip. */
  readonly stream?: unknown;
  /** This host's own: why there is no pipeline, for the notice. */
  readonly unavailable?: string;
}

const uriOf = (source: unknown): string | null =>
  typeof source === 'string' ? source : ((source as { uri?: string } | null)?.uri ?? null);

/** An inert player, so a screen that calls `play()` in its setup callback still renders. */
function unavailablePlayer(why: string): VideoPlayer {
  return {
    play: () => {},
    pause: () => {},
    replace: () => {},
    release: () => {},
    muted: false,
    loop: false,
    currentTime: 0,
    playing: false,
    paintable: null,
    stream: null,
    unavailable: why,
  };
}

/**
 * One pipeline per mounted screen, created once and released with it.
 *
 * The source is applied in an EFFECT rather than at construction, because
 * `useVideoPlayer(url, setup)` is called with an empty url on the first render of
 * every screen that fetches its video — the app's own `/video` route does exactly
 * that — and a pipeline pointed at `''` is a pipeline that has to be re-pointed
 * anyway.
 *
 * `setup` runs once, on the player the app will actually hold, which is what
 * `instance.play()` in the app's setup callback expects.
 */
export function useVideoPlayer(
  source: unknown,
  setup?: (player: VideoPlayer) => void,
): VideoPlayer {
  const [player] = useState<VideoPlayer>(() => {
    let backend: VideoBackend;
    try {
      backend = createVideoPlayer();
    } catch (error: unknown) {
      const why = error instanceof VideoUnavailable ? error.message : String(error);
      console.error('[desktop] expo-video:', why);
      return unavailablePlayer(why);
    }
    return {
      play: () => backend.play(),
      pause: () => backend.pause(),
      replace: (next: unknown) => backend.replace(uriOf(next)),
      release: () => backend.release(),
      get muted() {
        return backend.muted;
      },
      set muted(value: boolean) {
        backend.muted = value;
      },
      loop: false,
      get currentTime() {
        return backend.currentTime;
      },
      get playing() {
        return backend.playing;
      },
      get paintable() {
        return backend.paintable;
      },
      get stream() {
        return backend.stream;
      },
    };
  });

  const started = useRef(false);
  if (!started.current) {
    started.current = true;
    setup?.(player);
  }

  const uri = uriOf(source);
  useEffect(() => {
    if (uri === null || uri === '') return;
    player.replace(uri);
    player.play();
  }, [uri, player]);

  useEffect(() => () => player.release(), [player]);

  return player;
}

export interface VideoViewProps {
  player?: VideoPlayer;
  style?: Record<string, unknown>;
  contentFit?: string;
  nativeControls?: boolean;
  allowsPictureInPicture?: boolean;
  startsPictureInPictureAutomatically?: boolean;
  className?: string;
}

/**
 * The picture the pipeline paints into.
 *
 * WRAPPED THE SAME WAY EVERY IMAGE IS, and for the same measured reason: a
 * `Gtk.Picture` takes its natural size from the paintable, and this paintable reports
 * the rendition's own — 2560x1440 four seconds into a stream that started at 640x360.
 * Unwrapped, one video would decide how wide the window wants to be, and would keep
 * changing its mind. `shims/expo-image.tsx` carries the measurement.
 *
 * `nativeControls` IS DRAWN NOW, and by the toolkit rather than by this file:
 * `Gtk.MediaControls` over the picture, carrying play/pause, a seek bar, the elapsed
 * and total time and a volume slider. ~~Accepted and not drawn~~ was the state until
 * `video/stream.ts` gave the pipeline GTK's own media interface — and what stood here
 * before promised something else again, that "the picture itself toggles play/pause on
 * a click". IT DID NOT: there was no gesture in this file at all, so the screen had no
 * way to pause. A docblock is not a feature, which is the useful half of that mistake.
 *
 * The strip sits in a `Gtk.Overlay` above the picture, at `valign: end`, which is
 * where `Gtk.Video` puts its own — and `video/stage.ts` gives it the behaviour the
 * strip alone does not have: a click that pauses, a double click and a button for full
 * screen, Escape to leave it, and a strip that goes away once the pointer is still.
 * Not while PAUSED, where a strip that vanished would leave no way back.
 */
export function VideoView(props: VideoViewProps): ReactElement {
  const player = props.player;
  const paintable = player?.paintable ?? null;
  const overlayRef = useRef<unknown>(null);
  const controlsRef = useRef<unknown>(null);
  const surfaceRef = useRef<unknown>(null);
  /** The full-screen window's closer while one is open, so the button can toggle. */
  const closeFullRef = useRef<(() => void) | null>(null);
  const [fullscreen, setFullscreen] = useState(false);

  const controlled = props.nativeControls === true && (player?.stream ?? null) !== null;

  const togglePlay = useCallback((): void => {
    if (player === undefined) return;
    if (player.playing) player.pause();
    else player.play();
  }, [player]);

  const toggleFullscreen = useCallback((): void => {
    const open = closeFullRef.current;
    if (open !== null) {
      open();
      return;
    }
    if (player === undefined) return;
    closeFullRef.current = openFullscreen({
      paintable: player.paintable,
      stream: player.stream,
      anchor: overlayRef.current,
      onClosed: () => {
        closeFullRef.current = null;
        setFullscreen(false);
      },
    });
    setFullscreen(true);
  }, [player]);

  useEffect(() => {
    const overlay = overlayRef.current;
    const controls = controlsRef.current;
    const surface = surfaceRef.current;
    if (!controlled || overlay === null || controls === null || surface === null) return;
    return installStage({
      overlay,
      controls,
      surface,
      isPlaying: () => player?.playing === true,
      togglePlay,
      requestFullscreen: toggleFullscreen,
    });
  }, [controlled, player, togglePlay, toggleFullscreen]);

  // A screen left while the video is full screen would leave the window behind with
  // nothing driving it.
  useEffect(() => () => closeFullRef.current?.(), []);

  if (paintable === null) {
    return (
      <View className="flex-1 items-center justify-center bg-always-dark px-m">
        <Typo variant="headline-s" color="always-light" className="text-center">
          Video auf diesem System nicht verfügbar
        </Typo>
        <Typo variant="text-m" color="always-light" className="mt-2xs text-center">
          Dieser Rechner bringt keine GStreamer-Plugins für Video mit. Bitte nutzen Sie die App auf
          dem Telefon oder die Web-Version.
        </Typo>
      </View>
    );
  }

  const stage = (
    <gtk-scrolled-window
      propagateNaturalWidth={false}
      propagateNaturalHeight={false}
      hscrollbarPolicy={'never' as never}
      vscrollbarPolicy={'never' as never}
      hexpand
      vexpand
    >
      <gtk-picture
        ref={surfaceRef as never}
        paintable={paintable as never}
        contentFit={(props.contentFit === 'cover' ? 2 : 1) as never}
        canShrink
        hexpand
        vexpand
      />
    </gtk-scrolled-window>
  );

  if (!controlled) return stage;

  return (
    <gtk-overlay ref={overlayRef as never} hexpand vexpand>
      {stage}
      <gtk-media-controls
        slot="overlay"
        ref={controlsRef as never}
        mediaStream={player?.stream as never}
        valign={'end' as never}
        hexpand
      />
      <gtk-button
        slot="overlay"
        iconName={fullscreen ? 'view-restore-symbolic' : 'view-fullscreen-symbolic'}
        cssClasses={['osd', 'circular']}
        valign={'start' as never}
        halign={'end' as never}
        marginTop={8}
        marginEnd={8}
        onClicked={toggleFullscreen}
      />
    </gtk-overlay>
  );
}
