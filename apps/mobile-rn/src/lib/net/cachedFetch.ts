import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Schlanker Text-Fetch mit zweistufigem Cache (In-Memory + AsyncStorage) und
 * zwei Policies. Bewusst kein TanStack Query: die Offline-Reihenfolge soll
 * explizit und deterministisch sein, damit die Demo nie vom WLAN abhängt.
 *
 *  - 'network-first' (Feeds): Netz mit Timeout → bei Fehler stale Cache. So bleibt
 *    der Home-Feed tagesaktuell (Wow-Moment), fällt aber offline auf den Cache zurück.
 *  - 'cache-first'  (selten ändernde Ressourcen): frischer Cache (< ttl) → sonst Netz.
 */
export type CachePolicy = 'network-first' | 'cache-first';

export interface CachedFetchOptions {
  policy?: CachePolicy;
  /** Frische-Fenster für cache-first / Memory-Hits (ms). Default 10 min. */
  ttlMs?: number;
  /** Netzwerk-Timeout (ms). Default 5000. */
  timeoutMs?: number;
  headers?: Record<string, string>;
}

interface CacheEntry {
  ts: number;
  body: string;
}

const memory = new Map<string, CacheEntry>();
const DEFAULT_TTL = 10 * 60 * 1000;
const DEFAULT_TIMEOUT = 5000;

// Browser-ähnlicher User-Agent gegen Bot-Filter von WordPress/CDN.
const DEFAULT_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Mobile Safari/537.36',
  Accept: 'application/rss+xml, application/atom+xml, application/xml, text/html;q=0.9, */*;q=0.8',
};

function storageKey(key: string) {
  return `cache:${key}`;
}

async function readCache(key: string): Promise<CacheEntry | null> {
  const mem = memory.get(key);
  if (mem) return mem;
  try {
    const raw = await AsyncStorage.getItem(storageKey(key));
    if (!raw) return null;
    const entry = JSON.parse(raw) as CacheEntry;
    memory.set(key, entry);
    return entry;
  } catch {
    return null;
  }
}

async function writeCache(key: string, body: string, now: number): Promise<void> {
  const entry: CacheEntry = { ts: now, body };
  memory.set(key, entry);
  try {
    await AsyncStorage.setItem(storageKey(key), JSON.stringify(entry));
  } catch {
    // Persistenz ist best-effort; Memory-Cache reicht für die Session.
  }
}

async function fetchText(url: string, timeoutMs: number, headers: Record<string, string>): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { headers, signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status} für ${url}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

export async function cachedFetch(
  key: string,
  url: string,
  options: CachedFetchOptions = {},
): Promise<string> {
  const {
    policy = 'network-first',
    ttlMs = DEFAULT_TTL,
    timeoutMs = DEFAULT_TIMEOUT,
    headers,
  } = options;
  const mergedHeaders = { ...DEFAULT_HEADERS, ...headers };
  // Date.now() ist hier ok (Laufzeit, nicht im Workflow-Skript).
  const now = Date.now();

  if (policy === 'cache-first') {
    const cached = await readCache(key);
    if (cached && now - cached.ts < ttlMs) return cached.body;
    try {
      const body = await fetchText(url, timeoutMs, mergedHeaders);
      await writeCache(key, body, now);
      return body;
    } catch (err) {
      if (cached) return cached.body; // stale ist besser als nichts
      throw err;
    }
  }

  // network-first
  try {
    const body = await fetchText(url, timeoutMs, mergedHeaders);
    await writeCache(key, body, now);
    return body;
  } catch (err) {
    const cached = await readCache(key);
    if (cached) return cached.body;
    throw err;
  }
}
