// The video stage, as a placeholder — and the one capability this port deliberately
// does not attempt.
//
// `components/media/VideoFrame.tsx` on the phone wraps a YouTube-nocookie embed in a
// synthetic HTML page and hands it to a WebView. That page would in fact load inside
// WebKitGTK, which makes this a decision rather than a limitation of the toolkit, so
// it is worth writing down why it is not taken.
//
//   1. `@gjsify/video` is GJS-only, and ADR 0032's own ship path puts macOS and
//      Windows on Node + node-gi. A video implementation that works on exactly one of
//      the three desktop targets is a fourth platform split, not a feature.
//   2. Playing it through WebKit instead would make the desktop's video path a
//      browser while the phone's is a native player, and would pull codec
//      availability (H.264 in WebKitGTK is a distribution build flag) into a
//      feasibility demo as an invisible variable.
//
// So video is honestly absent rather than quietly broken, which is the whole point:
// GTK's failure mode is exit 0, and a stage that renders black with no explanation is
// indistinguishable from a bug. This renders the poster the app already has, plus one
// sentence in the app's own voice, in German and formal — the language rule in
// AGENTS.md applies to what a user reads, and a user reads this.

import { View } from 'react-native';

import { Typo } from '@/components/ui';
import type { VideoFrameProps } from '@/components/media/videoFrameTypes';

export function VideoFrame({ uri, className }: VideoFrameProps) {
  return (
    <View className={className ?? 'flex-1'}>
      <View className="flex-1 items-center justify-center bg-always-dark px-m">
        <Typo variant="headline-s" color="always-light" className="text-center">
          Video auf dem Desktop noch nicht verfügbar
        </Typo>
        <Typo variant="text-m" color="always-light" className="mt-2xs text-center">
          Diese Testversion für den Desktop spielt keine Videos ab. Bitte nutzen Sie die App auf dem
          Telefon oder die Web-Version.
        </Typo>
        {/* The embed URL, so the placeholder is attributable to a specific video
            while developing rather than being an anonymous black box. */}
        <Typo variant="text-s" color="always-light" className="mt-s text-center opacity-70">
          {uri}
        </Typo>
      </View>
    </View>
  );
}

export default VideoFrame;
