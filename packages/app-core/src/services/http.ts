/**
 * The one text fetch in this codebase.
 *
 * Both apps had their own — the NativeScript side with a `Promise.race` timeout
 * and a plain user agent, the Expo side with an `AbortController` and a
 * browser-like one — and the difference was not a decision, it was two people
 * solving the same problem in two runtimes. What each needed is now a capability
 * check rather than a host: `AbortController` when the runtime has one (Expo,
 * browsers), `Promise.race` when it does not (the NativeScript runtime has no
 * such global).
 */

const DEFAULT_TIMEOUT_MS = 8000;

/**
 * WordPress and the CDN in front of it answer a plain script user agent with a
 * bot challenge, so this claims to be a mobile browser. Measured on
 * correctiv.org: with the old `CorrectivAppPrototype/0.1` agent the feed request
 * intermittently came back as an interstitial rather than XML.
 */
const DEFAULT_HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Mobile Safari/537.36',
  Accept: 'application/rss+xml, application/atom+xml, application/xml, text/html;q=0.9, */*;q=0.8',
};

export interface FetchTextOptions {
  timeoutMs?: number;
  headers?: Record<string, string>;
}

/** True when the runtime can cancel a request rather than merely stop waiting. */
function canAbort(): boolean {
  return typeof AbortController !== 'undefined';
}

/**
 * GET a text resource with a timeout. Throws on a non-2xx status, so every caller
 * can treat a resolved promise as a body.
 *
 * The timer is cleared in `finally`. Without that it outlives the request it
 * guards by up to `timeoutMs`: `Promise.race` ignores the late rejection, so
 * nothing looks wrong, but the timer keeps the event loop busy — it surfaced as
 * jest refusing to exit after a suite that fetched once.
 */
export async function fetchText(url: string, options: FetchTextOptions = {}): Promise<string> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, headers } = options;
  const merged = { ...DEFAULT_HEADERS, ...headers };

  if (canAbort()) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { headers: merged, signal: controller.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
      return await res.text();
    } finally {
      clearTimeout(timer);
    }
  }

  let timer: ReturnType<typeof setTimeout> | undefined;
  const request = fetch(url, { headers: merged }).then((res) => {
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return res.text();
  });
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Timeout after ${timeoutMs} ms: ${url}`)), timeoutMs);
  });
  try {
    return await Promise.race([request, timeout]);
  } finally {
    clearTimeout(timer);
  }
}
