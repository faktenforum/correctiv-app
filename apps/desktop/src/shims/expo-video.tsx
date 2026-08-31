// `expo-video`, as the same honest placeholder the YouTube stage gets.
//
// Two video paths exist in this app and they are different technologies:
// `components/media/VideoFrame` is a YouTube-nocookie embed, and this is PeerTube
// played natively over HLS. Both are placeholders on this host, for the reason set
// out in `src/overrides/VideoFrame.tsx`: `@gjsify/video` is GJS-only while ADR 0032's
// ship path puts macOS and Windows on Node + node-gi, so real video here would work
// on one of the three desktop targets and is a track of its own.
//
// A shim rather than a route override, because the call site is a HOOK
// (`useVideoPlayer`) inside a component that also renders the loading and failure
// states — replacing the whole screen would duplicate more of it than this replaces.
//
// `VideoView` renders the placeholder; `useVideoPlayer` returns an inert object whose
// methods are named no-ops rather than missing, so the app's `instance.play()` in the
// setup callback does not throw before the placeholder can be shown.

import type { ReactElement } from 'react';

import { View } from 'react-native';

import { Typo } from '@/components/ui';

export interface VideoPlayer {
  play: () => void;
  pause: () => void;
  replace: (source: unknown) => void;
  release: () => void;
  muted: boolean;
  loop: boolean;
  currentTime: number;
}

/**
 * An inert player.
 *
 * Returned rather than thrown from, because the app calls `instance.play()` in
 * `useVideoPlayer`'s setup callback — before any of this component's own markup gets
 * a chance to render. A throw there would replace the placeholder with a crashed
 * route, which reports the gap far less clearly than the placeholder does.
 */
export function useVideoPlayer(
  _source: unknown,
  setup?: (player: VideoPlayer) => void,
): VideoPlayer {
  const player: VideoPlayer = {
    play: () => {},
    pause: () => {},
    replace: () => {},
    release: () => {},
    muted: false,
    loop: false,
    currentTime: 0,
  };
  setup?.(player);
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

export function VideoView(_props: VideoViewProps): ReactElement {
  return (
    <View className="flex-1 items-center justify-center bg-always-dark px-m">
      <Typo variant="headline-s" color="always-light" className="text-center">
        Video auf dem Desktop noch nicht verfügbar
      </Typo>
      <Typo variant="text-m" color="always-light" className="mt-2xs text-center">
        Diese Testversion für den Desktop spielt keine Videos ab. Bitte nutzen Sie die App auf dem
        Telefon oder die Web-Version.
      </Typo>
    </View>
  );
}
