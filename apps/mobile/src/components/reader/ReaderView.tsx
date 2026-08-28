import { WebView, type WebViewNavigation } from 'react-native-webview';

import { READER_BASE_URL, type ReaderViewProps } from './types';

/**
 * Article renderer for iOS and Android: a full-bleed WebView fed the prepared
 * article document. Metro picks this file on native and ReaderView.web.tsx on
 * web, because react-native-webview has no web implementation — it renders the
 * text "React Native WebView does not support this platform." instead.
 */
export function ReaderView({ html, onNavigate }: ReaderViewProps) {
  return (
    <WebView
      originWhitelist={['*']}
      source={{ html, baseUrl: READER_BASE_URL }}
      onShouldStartLoadWithRequest={(request: WebViewNavigation) => onNavigate(request.url)}
      showsVerticalScrollIndicator={false}
      // Let the content start underneath the transparent overlay header.
      contentInsetAdjustmentBehavior="never"
    />
  );
}
