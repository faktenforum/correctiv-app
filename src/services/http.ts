const DEFAULT_TIMEOUT_MS = 8000;
const USER_AGENT = 'CorrectivAppPrototype/0.1 (NativeScript)';

/**
 * fetch mit Timeout und User-Agent; wirft bei HTTP-Fehlerstatus.
 * Timeout via Promise.race — AbortController existiert in der
 * NativeScript-Runtime nicht als Global.
 */
export async function fetchText(url: string, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<string> {
  const request = fetch(url, { headers: { 'User-Agent': USER_AGENT } }).then((res) => {
    if (!res.ok) throw new Error(`HTTP ${res.status} für ${url}`);
    return res.text();
  });
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(`Timeout nach ${timeoutMs} ms: ${url}`)), timeoutMs);
  });
  return Promise.race([request, timeout]);
}
