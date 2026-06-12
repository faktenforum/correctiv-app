const DEFAULT_TIMEOUT_MS = 8000;
const USER_AGENT = 'CorrectivAppPrototype/0.1 (NativeScript)';

/**
 * fetch with timeout and User-Agent; throws on HTTP error status.
 * Timeout via Promise.race — AbortController does not exist as a
 * global in the NativeScript runtime.
 */
export async function fetchText(url: string, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<string> {
  const request = fetch(url, { headers: { 'User-Agent': USER_AGENT } }).then((res) => {
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return res.text();
  });
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(`Timeout after ${timeoutMs} ms: ${url}`)), timeoutMs);
  });
  return Promise.race([request, timeout]);
}
