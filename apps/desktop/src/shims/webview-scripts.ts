// The two scripts injected into the reader document, and the channels they post on.
//
// A MODULE OF ITS OWN, because these are DATA rather than part of the component, and
// the separation buys the only test that can hold them. `react-native-webview.tsx`
// imports `react-native`, which under the build is redirected to this host's shim but
// under vitest is the real package — whose Flow syntax the test runner cannot parse.
// A test importing the component therefore cannot run at all, and the two failure
// modes these scripts have are both invisible at runtime (see
// `test/webview-gate.test.ts`). Keeping the strings here makes them reachable from a
// test without a bundler in the way.

/**
 * The name the injected script posts to, and the handler this shim registers.
 *
 * `test/webview-gate.test.ts` holds the two properties of these scripts that fail
 * SILENTLY: the script's own `catch` swallows a channel no handler answers, and a base
 * URL that breaks the script's syntax kills BOTH scripts at parse time with nothing
 * logged — they share one `UserContentManager`.
 */
export const SCROLL_CHANNEL = 'correctivReaderScroll';

/** The second channel: a link click, resolved to an absolute URL. */
export const NAVIGATE_CHANNEL = 'correctivReaderNavigate';

/**
 * Base for resolving a relative href when the caller passed no `baseUrl`.
 *
 * The reader always passes one (`READER_BASE_URL`), so this is only reached by a caller
 * that renders raw HTML. `about:blank` is the right answer there rather than a guessed
 * origin: `new URL(href, 'about:blank')` throws for a relative href, the script's own
 * `catch` returns, and the click falls through to the engine — which is what "we cannot
 * reason about this URL" should do. Inventing an origin would silently attribute the
 * document to a site it did not come from.
 */
export const READER_FALLBACK_BASE = 'about:blank';

export const SCROLL_SCRIPT = `
(function () {
  var post = function () {
    try {
      window.webkit.messageHandlers.${SCROLL_CHANNEL}.postMessage(String(window.scrollY));
    } catch (error) { /* the handler is gone: the view is being torn down */ }
  };
  window.addEventListener('scroll', post, { passive: true });
  post();
})();
`;

/**
 * The navigation gate, as an injected script rather than a WebKit signal.
 *
 * `decide-policy` below is the stronger mechanism and stays where it exists — but it
 * exists only on WebKitGTK. On macOS `gi://WebKit` is `@gjsify/webkit-native`, Apple's
 * WKWebView behind a GObject shim; on Windows it is `@gjsify/webview2-native`,
 * Microsoft's WebView2 behind the same name. Neither implements this signal, and both
 * were MEASURED saying so: `no signal 'decide-policy' on GjsifyWebKitWebView` and
 * `... on GjsifyWebView2WebView`. A gate that only Linux has is a gate the reader loses
 * on both other hosts, and it loses it SILENTLY: every link would become a full-page
 * navigation inside the reader.
 *
 * So the portable mechanism is the one the WEB target already relies on for exactly the
 * same reason — `ReaderView.web.tsx` intercepts clicks in its `srcDoc` iframe because a
 * web page has no policy signal either. The logic here mirrors that file deliberately,
 * down to resolving relative hrefs against the base URL, so the three non-GTK hosts
 * behave identically and there is one behaviour to reason about instead of two.
 *
 * WHY THIS DOES NOT DOUBLE-FIRE with `decide-policy`. The handler calls
 * `preventDefault()` on every anchor it recognises, so no navigation is ever attempted
 * for those clicks and no policy decision is raised. The two are disjoint by
 * construction: this sees clicks, the signal sees everything else (redirects,
 * script-driven navigation), and neither sees what the other did.
 *
 * WHY THE ASYNCHRONOUS ROUND TRIP IS HARMLESS, though it looks like it should not be.
 * `onShouldStartLoadWithRequest` is synchronous and returns a boolean, while a message
 * handler is not. It does not matter, because of what the app's decision actually is:
 * every real link returns FALSE (an internal URL goes to the router, an external one to
 * the system browser). `true` is reserved for `about:blank`, `data:` and `file:` — the
 * initial document arriving, which is never a click. The rare allow is honoured by the
 * host navigating explicitly, which is the same outcome one frame later.
 */
export const NAVIGATE_SCRIPT = (baseUrl: string) => `
(function () {
  document.addEventListener('click', function (event) {
    var anchor = event.target && event.target.closest ? event.target.closest('a') : null;
    var href = anchor && anchor.getAttribute('href');
    if (!href) return;
    var absolute;
    try {
      absolute = new URL(href, ${JSON.stringify(baseUrl)}).toString();
    } catch (error) {
      return; // Not a URL we can reason about — leave it to the engine.
    }
    event.preventDefault();
    try {
      window.webkit.messageHandlers.${NAVIGATE_CHANNEL}.postMessage(absolute);
    } catch (error) { /* the handler is gone: the view is being torn down */ }
  });
})();
`;
