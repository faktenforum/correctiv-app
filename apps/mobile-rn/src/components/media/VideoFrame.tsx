import { WebView as UpstreamWebView } from 'react-native-webview';
import { withUniwind } from 'uniwind';

import type { VideoFrameProps } from './videoFrameTypes';

/** The origin the embed claims to be on. Any https origin will do; ours is honest. */
const EMBED_ORIGIN = 'https://correctiv.org';

function escapeAttribute(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('"', '&quot;');
}

/**
 * The embed inside a page of our own, rather than as the page itself.
 *
 * Loading `youtube-nocookie.com/embed/<id>` as the WebView's top-level document
 * sends no Referer, and YouTube answers **Error 153, "Video player configuration
 * error"** — a black rectangle where the video should be. Verified on the emulator
 * and, with the same URL, in the emulator's own Chrome: not the app's fault in the
 * sense of a typo, but the app's job to fix. Inside an `<iframe>` on a page with a
 * `baseUrl`, the request carries a referrer and the player loads.
 *
 * `VideoFrame.web.tsx` needs none of this: there the embed is already an iframe in
 * a real page. react-native-webview has no web implementation and would render
 * "React Native WebView does not support this platform." — with a green build. The
 * pairing is enforced by __tests__/web-target.test.ts.
 *
 * A dedicated YouTube player (react-native-youtube-iframe) is still not needed:
 * the nocookie embed is what the NativeScript build used, and it saves a
 * dependency that sits on WebView itself.
 */

/**
 * Wrapped, for the same reason as `components/ui/SafeAreaView`: Uniwind rewrites
 * imports of `react-native` to its own components, but not third-party ones — so a
 * `className` here would reach `RNCWebView` as an unknown native prop and be dropped
 * without a word.
 *
 * `className` is part of this component's contract (`videoFrameTypes.ts`), and the
 * web twin puts it on a real DOM `<iframe>` where it works. So without this the two
 * branches disagree in exactly the way `videoFrameTypes.ts` exists to prevent, and
 * every check stays green while they do.
 */
const WebView = withUniwind(UpstreamWebView);
export function VideoFrame({ uri, className }: VideoFrameProps) {
  const html = `<!doctype html>
<html>
  <head><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"></head>
  <body style="margin:0;background:#000;height:100%">
    <iframe
      src="${escapeAttribute(uri)}"
      style="border:0;width:100%;height:100%;position:absolute;inset:0"
      allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
      allowfullscreen
    ></iframe>
  </body>
</html>`;

  return (
    <WebView
      source={{ html, baseUrl: EMBED_ORIGIN }}
      className={className}
      allowsFullscreenVideo
      mediaPlaybackRequiresUserAction={false}
      // The player should stay in its box instead of jumping to iOS fullscreen.
      allowsInlineMediaPlayback
      javaScriptEnabled
      domStorageEnabled
    />
  );
}
