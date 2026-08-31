// `react-native-webview`, backed by WebKitGTK through `gi://WebKit?version=6.0`.
//
// This is the one shim that is a real engine rather than a mapping, and it is the
// reason the reader works at all: `buildReaderHtml` in the core produces a complete,
// self-contained HTML document — structure, class names, German copy, the verdict
// plaque, the token CSS and the base64-embedded fonts — and every host's job is
// simply to display it. WebKitGTK displays it, so the article looks the same here as
// it does on the phone, fonts included.
//
// `gi://WebKit?version=6.0` is the same specifier `@gjsify/iframe` uses. THE VERSION
// IS NOT OPTIONAL: this machine also has `WebKit2-4.1.typelib` installed, which is
// the GTK3 build. Importing it into a GTK4 process is two toolkits in one address
// space, and the failure is a crash rather than a diagnostic.
//
// ## Why the widget is attached imperatively rather than rendered as an element
//
// `WebKit.WebView` is not in gtk-host's builtin widget table, and it has no React
// Native counterpart to route through L2. It could be registered with
// `registerWidget`, and that would buy nothing here: the element has no children, no
// styleable class list this app uses, and three props that are all imperative calls
// underneath (`load_html`, a policy signal, a script-message handler). So the
// component renders a `View` — a real `Gtk.Box` this layer owns and lays out — and
// puts the web view inside it through the `ref`, which on this host hands back the
// author's own `Gtk.Widget` rather than a wrapper.
//
// ## Scrolling, and why it needs an injected script
//
// WebKit emits no scroll signal: the scroll position lives inside the web process.
// `onScroll` is therefore driven by a user script that posts `window.scrollY` through
// a `WebKit.UserContentManager` message handler. That is the documented channel for
// exactly this, and it costs one message per scroll event rather than a polling
// timer.
//
// It also means the reader document runs script on this host, where on the web target
// it deliberately does not (`ReaderView.web.tsx` withholds `allow-scripts` and
// listens from the parent instead, because `srcDoc` keeps the frame same-origin). The
// difference is named here because it is a real widening of what the article document
// may do: an injected script of ours, plus whatever the document itself carries.
// Narrowing it would mean a WebKit settings pass (`enable-javascript: false` plus a
// different scroll channel) and is worth doing before this is anything but a demo.

// Type-only: the values come from `gi://` at runtime, which resolves only inside a
// GTK process. `@girs/*` is the same vocabulary as data, so `tsc` can read it here.
/** What a script-message handler receives. `to_string()` is all this shim reads. */
interface GLibVariantLike {
  to_string: () => string;
}

import type Gtk from '@girs/gtk-4.0';
import type WebKit from '@girs/webkit-6.0';

import { useEffect, useRef } from 'react';
import { View } from 'react-native';

/** Matches the subset of `WebViewNavigation` the app reads. */
export interface WebViewNavigation {
  url: string;
}

export interface WebViewSource {
  html?: string;
  uri?: string;
  baseUrl?: string;
}

export interface WebViewProps {
  source: WebViewSource;
  originWhitelist?: readonly string[];
  onShouldStartLoadWithRequest?: (request: WebViewNavigation) => boolean;
  onScroll?: (event: { nativeEvent: { contentOffset: { y: number } } }) => void;
  showsVerticalScrollIndicator?: boolean;
  contentInsetAdjustmentBehavior?: string;
  className?: string;
  // VideoFrame's props, accepted so the type matches. That component is replaced
  // wholesale on this host (see src/overrides/VideoFrame.tsx), so they never arrive.
  allowsFullscreenVideo?: boolean;
  mediaPlaybackRequiresUserAction?: boolean;
  allowsInlineMediaPlayback?: boolean;
  javaScriptEnabled?: boolean;
  domStorageEnabled?: boolean;
}

/** The name the injected script posts to, and the handler this shim registers. */
const SCROLL_CHANNEL = 'correctivReaderScroll';

const SCROLL_SCRIPT = `
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

export function WebView({
  source,
  onShouldStartLoadWithRequest,
  onScroll,
  className,
}: WebViewProps) {
  // The callbacks are read through a ref so a new closure every render does not
  // rebuild the web view — which would reload the article and lose the scroll
  // position on every parent render.
  const handlers = useRef({ onShouldStartLoadWithRequest, onScroll });
  handlers.current = { onShouldStartLoadWithRequest, onScroll };

  const box = useRef<unknown>(null);

  useEffect(() => {
    const container = box.current;
    if (container === null) return undefined;

    let disposed = false;
    let teardown: (() => void) | null = null;

    // Dynamic, because `gi://` resolves at import and this module is also reachable
    // from `tsc` and from a test, neither of which has a GTK process.
    //
    // The `.catch` is not decoration. The first version of this effect was a bare
    // `void (async () => …)()`, and when the setup threw, the rejection went nowhere:
    // no web view, no diagnostic, a blank white pane, and nothing in the log to say
    // why — the exact silent failure this whole layer exists to refuse, reintroduced
    // by the shim meant to bridge it.
    const setup = (async () => {
      // Only WebKit is needed as a VALUE; `Gtk` appears in this file as a type, which
      // `import type Gtk from '@girs/gtk-4.0'` at the top already supplies.
      const { default: WebKit } = await import('gi://WebKit?version=6.0');
      if (disposed) return;

      const manager = new WebKit.UserContentManager();
      manager.register_script_message_handler(SCROLL_CHANNEL, null);
      manager.add_script(
        new WebKit.UserScript(
          SCROLL_SCRIPT,
          WebKit.UserContentInjectedFrames.TOP_FRAME,
          WebKit.UserScriptInjectionTime.END,
          null,
          null,
        ),
      );

      const view = new WebKit.WebView({
        userContentManager: manager,
        vexpand: true,
        hexpand: true,
      });

      /**
       * Has the FIRST document committed yet?
       *
       * This flag is the difference between a working reader and a blank white pane,
       * and the bug it fixes is worth writing down because the shim looked right.
       *
       * `load_html(html, baseUrl)` makes WebKit navigate, so it raises a
       * `NAVIGATION_ACTION` policy decision — for the BASE URL,
       * `https://correctiv.org/`. Handing that to the app's `onNavigate` is the
       * faithful-looking thing to do and it is wrong: that function's job is to decide
       * what a TAP inside the article should do, and for an ordinary https URL that is
       * "not an article route, so open the system browser and return false". Returning
       * false means `decision.ignore()`, so the reader refused to load its own
       * document — silently, with no load event, no failure, and a white pane.
       *
       * `react-native-webview` does not report the initial `source={{ html }}` load
       * through `onShouldStartLoadWithRequest` either, so gating only what happens
       * AFTER the first commit is the compatible behaviour as well as the correct one.
       */
      let committed = false;

      const scrollId = manager.connect(
        `script-message-received::${SCROLL_CHANNEL}`,
        (_m: WebKit.UserContentManager, value: GLibVariantLike) => {
          const y = Number(value.to_string());
          if (!Number.isNaN(y)) {
            handlers.current.onScroll?.({ nativeEvent: { contentOffset: { y } } });
          }
        },
      );

      // The navigation gate. `onShouldStartLoadWithRequest` returning false is how
      // the app keeps an in-app link inside the router and sends an external one to
      // the system browser, so ignoring it would turn every tap in an article into a
      // full-page navigation inside the reader.
      const policyId = view.connect(
        'decide-policy',
        (_v: WebKit.WebView, decision: WebKit.PolicyDecision, type: WebKit.PolicyDecisionType) => {
          if (type !== WebKit.PolicyDecisionType.NAVIGATION_ACTION) return false;
          // Everything up to and including the first commit is OUR document arriving,
          // not the user following a link. See `committed` above.
          if (!committed) return false;
          const navigation = decision as WebKit.NavigationPolicyDecision;
          const uri = navigation.get_navigation_action()?.get_request()?.get_uri();
          if (uri === undefined || uri === null || uri === 'about:blank') return false;
          const allowed = handlers.current.onShouldStartLoadWithRequest?.({ url: uri }) ?? true;
          if (!allowed) {
            decision.ignore();
            return true;
          }
          return false;
        },
      );

      // Load reporting, because a blank web view is the single most ambiguous state
      // this host can be in: "the HTML never arrived", "WebKit refused it" and "it
      // rendered and the screenshot cannot see it" look identical. WebKit's own
      // signals separate them.
      const loadId = view.connect('load-changed', (_v: WebKit.WebView, event: WebKit.LoadEvent) => {
        if (event === WebKit.LoadEvent.COMMITTED) committed = true;
        if (event === WebKit.LoadEvent.FINISHED) {
          console.log(`[desktop] WebView: load finished (${view.get_uri() ?? 'about:blank'}).`);
        }
      });
      const failId = view.connect(
        'load-failed',
        (_v: WebKit.WebView, _event: WebKit.LoadEvent, uri: string, error: { message: string }) => {
          console.error(`[desktop] WebView: load FAILED for ${uri}:`, error.message);
          return false;
        },
      );

      (container as Gtk.Box).append(view);

      teardown = () => {
        manager.disconnect(scrollId);
        view.disconnect(policyId);
        view.disconnect(loadId);
        view.disconnect(failId);
        // Unparent before dropping the reference. A widget still parented at
        // finalize is the `still has children left` diagnostic GTK reports at exit
        // 0, which is exactly the class of failure that stays invisible otherwise.
        (container as Gtk.Box).remove(view);
      };

      if (typeof source.html === 'string') {
        console.log(`[desktop] WebView: loading ${source.html.length} bytes of HTML.`);
        view.load_html(source.html, source.baseUrl ?? null);
      } else if (typeof source.uri === 'string') {
        view.load_uri(source.uri);
      } else {
        console.error('[desktop] WebView: source carried neither `html` nor `uri`.');
      }
    })();

    setup.catch((error: unknown) => {
      console.error('[desktop] WebView: could not create the WebKitGTK view:', error);
    });

    return () => {
      disposed = true;
      teardown?.();
    };
    // The document itself is the only dependency: a new `html` is a new article.
  }, [source.html, source.uri, source.baseUrl]);

  return <View ref={box} className={className ?? 'flex-1'} />;
}

export default WebView;
