import { WebView } from 'react-native-webview';

import type { VideoFrameProps } from './videoFrameTypes';

/**
 * Fremd-Einbettung (YouTube) im nativen WebView. Das Web-Gegenstück
 * `VideoFrame.web.tsx` rendert dasselbe als `<iframe>`, weil
 * react-native-webview keine Web-Implementierung hat — dieselbe Paarung wie beim
 * Reader, und vom Web-Target-Guard in __tests__/web-target.test.ts erzwungen.
 *
 * Ein eigener YouTube-Player (react-native-youtube-iframe) ist dafür nicht nötig:
 * die nocookie-Einbettung ist genau das, was der NativeScript-Stand benutzt hat,
 * und sie spart eine Abhängigkeit, die selbst wieder auf WebView aufsetzt.
 */
export function VideoFrame({ uri, className }: VideoFrameProps) {
  return (
    <WebView
      source={{ uri }}
      className={className}
      allowsFullscreenVideo
      mediaPlaybackRequiresUserAction={false}
      // Der Player soll in der Fläche bleiben und nicht in den iOS-Vollbildmodus springen.
      allowsInlineMediaPlayback
      javaScriptEnabled
      domStorageEnabled
    />
  );
}
