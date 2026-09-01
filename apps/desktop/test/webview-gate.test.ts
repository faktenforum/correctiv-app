/**
 * The two ways the reader's injected scripts fail SILENTLY.
 *
 * Both scripts talk to the host over `WebKit.UserContentManager` message channels, and
 * both are wrapped in their own `try/catch` so that a torn-down view does not throw
 * into the page. That catch is right, and it is also what makes these two failures
 * invisible: nothing is logged, nothing throws, the reader simply stops responding.
 *
 *   1. A CHANNEL NAME DRIFTS. The script posts to `messageHandlers.<name>`; the shim
 *      registers `<name>` and connects `script-message-received::<name>`. Change one
 *      spelling and the post lands on an undefined handler, the script's own catch
 *      swallows the TypeError, and scrolling or every link in the article stops
 *      working with no diagnostic anywhere.
 *
 *   2. THE BASE URL BREAKS THE SCRIPT'S SYNTAX. `NAVIGATE_SCRIPT` interpolates a
 *      caller-supplied string. An unescaped quote or backslash makes the whole
 *      injected source unparseable — and because `UserContentManager.add_script` takes
 *      source text rather than a compiled unit, WebKit discovers that inside the web
 *      process, where this host sees nothing. Worse, the scripts share one manager, so
 *      a bad base URL takes SCROLLING down with navigation.
 *
 * Neither is caught by the route sweep: it opens a route and reads the log, and both
 * failures are defined by producing no log. Neither is caught by `tsc`: both are
 * strings. So they are held here, where the assertion is cheap and the alternative is
 * a reader that looks fine in a screenshot.
 */

import { describe, expect, it } from 'vitest';

import {
  NAVIGATE_CHANNEL,
  NAVIGATE_SCRIPT,
  SCROLL_CHANNEL,
  SCROLL_SCRIPT,
} from '../src/shims/webview-scripts.js';

/** A base URL the reader actually passes. */
const READER_BASE = 'https://correctiv.org/';

/**
 * Compile without running.
 *
 * `new Function(source)` parses and throws a SyntaxError on bad input, which is the
 * property under test, and it never executes the body — so the scripts' references to
 * `document` and `window` are irrelevant here. Running them would need a DOM and would
 * be testing WebKit rather than this file.
 */
function parses(source: string): boolean {
  try {
    new Function(source);
    return true;
  } catch {
    return false;
  }
}

describe('the injected scripts post to the channels the shim registers', () => {
  it('scroll: the script names the channel the handler is registered under', () => {
    expect(SCROLL_SCRIPT).toContain(`messageHandlers.${SCROLL_CHANNEL}.postMessage`);
  });

  it('navigate: the script names the channel the handler is registered under', () => {
    expect(NAVIGATE_SCRIPT(READER_BASE)).toContain(
      `messageHandlers.${NAVIGATE_CHANNEL}.postMessage`,
    );
  });

  it('the two channels are distinct, so one handler cannot answer for both', () => {
    expect(SCROLL_CHANNEL).not.toBe(NAVIGATE_CHANNEL);
  });
});

describe('a base URL cannot break the injected source', () => {
  it('parses with the base the reader actually passes', () => {
    expect(parses(NAVIGATE_SCRIPT(READER_BASE))).toBe(true);
  });

  // Each of these ends the string, the statement or the script if the value were
  // pasted in raw. They are not hypothetical shapes: a `baseUrl` reaches this from an
  // article's own metadata, so it is caller data, not a literal in this repo.
  it.each([
    ['a single quote', "https://example.org/it's"],
    ['a double quote', 'https://example.org/"x"'],
    ['a backslash', 'https://example.org/a\\b'],
    ['a newline', 'https://example.org/\n'],
    ['a script terminator', 'https://example.org/</script>'],
    ['a template placeholder', 'https://example.org/${x}'],
  ])('parses when the base URL contains %s', (_name, base) => {
    expect(parses(NAVIGATE_SCRIPT(base))).toBe(true);
  });

  it('carries the base through rather than dropping it', () => {
    // The escaping must not be achieved by discarding the value: a script that parses
    // because the base vanished would pass every assertion above and resolve every
    // relative href against the wrong origin.
    expect(NAVIGATE_SCRIPT(READER_BASE)).toContain(JSON.stringify(READER_BASE));
  });
});

describe('the navigation script suppresses the click it reports', () => {
  // The gate's whole contract: the host decides, and the app returns false for every
  // real link (an internal URL goes to the router, an external one to the system
  // browser). If the script stopped calling preventDefault, the engine would navigate
  // the reader away BEFORE the host's answer arrived, and the decision would be moot.
  it('calls preventDefault before posting', () => {
    const source = NAVIGATE_SCRIPT(READER_BASE);
    const prevented = source.indexOf('preventDefault');
    const posted = source.indexOf('postMessage');
    expect(prevented).toBeGreaterThan(-1);
    expect(posted).toBeGreaterThan(prevented);
  });
});
