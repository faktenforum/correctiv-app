import type { VideoFrameProps } from './videoFrameTypes';

/**
 * Web-Fassung: dieselbe Einbettung als echtes `<iframe>`. react-native-webview
 * hat keine Web-Implementierung und würde hier „React Native WebView does not
 * support this platform." rendern — bei grünem Build.
 *
 * `react-native-web` gibt unbekannte Elemente nicht durch, deshalb steht hier
 * bewusst DOM-JSX. Diese Datei wird von Metro nur auf Web aufgelöst.
 */
export function VideoFrame({ uri, className }: VideoFrameProps) {
  return (
    <iframe
      src={uri}
      className={className}
      title="Video"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
      allowFullScreen
      // Der Player braucht Skripte, seinen eigenen Origin (Cross-Origin, also
      // bleibt es youtube-nocookie.com — nicht unserer) und Presentation für den
      // Vollbildmodus. Ohne Sandbox dürfte die Einbettung auch die oberste Seite
      // navigieren; das ist der Teil, der hier wegfällt.
      sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
      style={{ width: '100%', height: '100%', border: 0 }}
    />
  );
}
