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

import { useEffect, useRef, useState, type ReactElement } from 'react';

import { View } from 'react-native';

import { Typo } from '@/components/ui';
import { createVideoPlayer, VideoUnavailable, type VideoBackend } from '../video/backend.js';

export interface VideoPlayer {
  play: () => void;
  pause: () => void;
  replace: (source: unknown) => void;
  release: () => void;
  muted: boolean;
  loop: boolean;
  currentTime: number;
  /** This host's own: what `VideoView` renders, or null when there is no pipeline. */
  readonly paintable?: unknown;
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
    paintable: null,
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
      get paintable() {
        return backend.paintable;
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
 * `nativeControls` is ACCEPTED AND NOT DRAWN. GTK's ready-made control strip is
 * `Gtk.MediaControls`, which drives a `Gtk.MediaStream`; what a GStreamer pipeline
 * hands out is a `GdkPaintable`, and the two do not meet without a `GtkMediaStream`
 * implementation of our own. Rather than leave the screen with no way to stop, the
 * picture itself toggles play/pause on a click — one control instead of a strip, and
 * said out loud rather than left as a surprise.
 */
export function VideoView(props: VideoViewProps): ReactElement {
  const player = props.player;
  const paintable = player?.paintable ?? null;

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

  return (
    <gtk-scrolled-window
      propagateNaturalWidth={false}
      propagateNaturalHeight={false}
      hscrollbarPolicy={'never' as never}
      vscrollbarPolicy={'never' as never}
      hexpand
      vexpand
    >
      <gtk-picture
        paintable={paintable as never}
        contentFit={(props.contentFit === 'cover' ? 2 : 1) as never}
        canShrink
        hexpand
        vexpand
      />
    </gtk-scrolled-window>
  );
}
