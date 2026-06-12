const DEFAULT_TIMEOUT_MS = 8000;
const USER_AGENT = 'CorrectivAppPrototype/0.1 (NativeScript)';

/** fetch mit Timeout und User-Agent; wirft bei HTTP-Fehlerstatus. */
export async function fetchText(url: string, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': USER_AGENT },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} für ${url}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}
