import type { VideoFrameProps } from './videoFrameTypes';

/**
 * The web branch: the same embed as a real `<iframe>`. react-native-webview has no
 * web implementation and would render "React Native WebView does not support this
 * platform." here — on a green build.
 *
 * `react-native-web` does not pass unknown elements through, so this file uses DOM
 * JSX on purpose. Metro resolves it on web only.
 */
export function VideoFrame({ uri, className }: VideoFrameProps) {
  return (
    <iframe
      src={uri}
      className={className}
      title="Video"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
      allowFullScreen
      // The player needs scripts, its own origin (cross-origin, so that stays
      // youtube-nocookie.com — not ours) and presentation for full screen. Without
      // a sandbox the embed could also navigate the top-level page; that is the
      // capability being withheld here.
      sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
      style={{ width: '100%', height: '100%', border: 0 }}
    />
  );
}
