const DEFAULT_TIMEOUT_MS = 8000;
const USER_AGENT = 'CorrectivAppPrototype/0.1 (NativeScript)';

/**
 * fetch with timeout and User-Agent; throws on HTTP error status.
 * Timeout via Promise.race — AbortController does not exist as a
 * global in the NativeScript runtime.
 *
 * The timer is cleared in `finally`. Without that it outlives the request it was
 * guarding by up to `timeoutMs`: Promise.race ignores the late rejection, so
 * nothing looks wrong, but the timer keeps the event loop busy. It showed up as
 * jest refusing to exit after a suite that fetched once.
 */
export async function fetchText(url: string, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<string> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const request = fetch(url, { headers: { 'User-Agent': USER_AGENT } }).then((res) => {
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
