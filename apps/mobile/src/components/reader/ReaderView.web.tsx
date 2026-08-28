import { useCallback, useEffect, useRef } from 'react';

import { READER_BASE_URL, type ReaderViewProps } from './types';

/**
 * Article renderer for the web demo.
 *
 * react-native-webview has no web implementation, so on web it renders the words
 * "React Native WebView does not support this platform." in red — the route
 * static-renders and exports without error, which makes the failure easy to miss.
 * An iframe is the honest equivalent here: the reader HTML is built locally by
 * buildReaderHtml(), so it goes in via `srcDoc` and no remote framing is
 * involved. (Embedding remote correctiv.org pages would be a different matter —
 * X-Frame-Options and CSP would block it, while a native WebView is unaffected.)
 *
 * A srcDoc iframe stays same-origin with its parent, so link clicks inside it
 * can be intercepted and routed through the same onNavigate the native WebView
 * uses. That is what keeps the two platforms behaving identically.
 */
export function ReaderView({ html, onNavigate, onScroll }: ReaderViewProps) {
  const frameRef = useRef<HTMLIFrameElement | null>(null);

  const handleClick = useCallback(
    (event: MouseEvent) => {
      const target = event.target as Element | null;
      const anchor = target?.closest?.('a');
      const href = anchor?.getAttribute('href');
      if (!href) return;

      // Resolve relative hrefs the same way the native WebView's baseUrl does,
      // so onNavigate sees an absolute URL on both platforms.
      let absolute: string;
      try {
        absolute = new URL(href, READER_BASE_URL).toString();
      } catch {
        return; // Not a URL we can reason about — let the iframe deal with it.
      }

      if (!onNavigate(absolute)) event.preventDefault();
    },
    [onNavigate],
  );

  // Kept in a ref so the effect below does not re-attach on every scroll.
  const scrollRef = useRef(onScroll);
  scrollRef.current = onScroll;

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;

    let detach: (() => void) | undefined;

    const attach = () => {
      const doc = frame.contentDocument;
      const win = frame.contentWindow;
      if (!doc || !win) return;
      const handleScroll = () => scrollRef.current(win.scrollY);
      doc.addEventListener('click', handleClick);
      win.addEventListener('scroll', handleScroll);
      detach = () => {
        doc.removeEventListener('click', handleClick);
        win.removeEventListener('scroll', handleScroll);
      };
    };

    // srcDoc may already have finished parsing before this effect runs, so try
    // immediately as well as on load — otherwise the listener is never attached
    // for cached content and every link falls through to the iframe.
    frame.addEventListener('load', attach);
    attach();

    return () => {
      frame.removeEventListener('load', attach);
      detach?.();
    };
  }, [handleClick, html]);

  return (
    <iframe
      ref={frameRef}
      srcDoc={html}
      title="Artikel"
      /*
       * allow-same-origin and NOTHING else, deliberately:
       *
       * - The document body comes from a remote page. extract.ts drops <script>,
       *   <style>, <iframe> and <form> and allows only href/src/alt, and
       *   buildReaderHtml adds no script of its own — so the reader needs no JS
       *   at all. Omitting allow-scripts therefore costs nothing and means a hole
       *   in the sanitiser cannot turn into script execution on the demo origin.
       * - allow-same-origin is required: the click interception above reads
       *   frame.contentDocument, which a fully sandboxed frame would deny.
       * - Never add allow-scripts alongside allow-same-origin — together they let
       *   the frame remove its own sandbox, which defeats the point.
       * - No allow-top-navigation is wanted either: every real link is routed by
       *   onNavigate, so the article must not be able to navigate the app away.
       */
      sandbox="allow-same-origin"
      // The native WebView fills its parent; match that so the overlay header
      // sits in the same place on both platforms.
      style={{ flex: 1, width: '100%', height: '100%', border: 'none' }}
    />
  );
}
