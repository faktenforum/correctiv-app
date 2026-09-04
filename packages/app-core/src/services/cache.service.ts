import { platform } from '../ports';
import { fetchText, type FetchTextOptions } from './http';

/**
 * The one cache in this codebase, in two layers: an in-memory session map on top
 * of the host's `BlobStore` port.
 *
 * There used to be two of these — the core's, behind a synchronous port, and the
 * Expo app's `cachedFetch`, straight onto AsyncStorage with its own policies and
 * headers. Same job, two TTLs, two sets of failure behaviour. This is both,
 * merged: `getCached`/`setCached` for typed objects (feeds, videos, articles) and
 * `fetchCachedText` for the raw bodies that produce them.
 *
 * Everything here is best-effort. A read that fails is a miss, a write that fails
 * is forgotten — a broken cache must never take a screen down with it.
 */

const memory = new Map<string, { data: unknown; ts: number }>();

/**
 * Exported because it is not an internal detail: the preview shell has to name the
 * very same blob to seed a feed's cache, and re-implements this from the outside
 * (`tools/preview/src/frame/seed.ts`). `tools/preview/test/seed.test.ts` holds the
 * two versions together — without it a changed hash makes every fixture silently
 * do nothing.
 */
export function fileKey(key: string): string {
  // djb2 — stable, and short enough to be a file name on every host
  let h = 5381;
  for (let i = 0; i < key.length; i++) h = ((h << 5) + h + key.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

async function readEntry<T>(ns: string, key: string): Promise<{ data: T; ts: number } | null> {
  try {
    const raw = await platform().blobs.read(ns, `${fileKey(key)}.json`);
    if (raw === null) return null;
    return JSON.parse(raw) as { data: T; ts: number };
  } catch {
    return null;
  }
}

/** A cached value, but only while it is younger than `ttlMs`. */
export async function getCached<T>(ns: string, key: string, ttlMs: number): Promise<T | null> {
  const memKey = `${ns}:${key}`;
  const now = Date.now();
  const mem = memory.get(memKey);
  if (mem) return now - mem.ts < ttlMs ? (mem.data as T) : null;

  const entry = await readEntry<T>(ns, key);
  if (!entry) return null;
  memory.set(memKey, entry);
  return now - entry.ts < ttlMs ? entry.data : null;
}

/** Also returns expired entries — for stale-while-revalidate and offline fallback. */
export async function getStale<T>(ns: string, key: string): Promise<T | null> {
  const mem = memory.get(`${ns}:${key}`);
  if (mem) return mem.data as T;
  return (await readEntry<T>(ns, key))?.data ?? null;
}

export async function setCached(ns: string, key: string, data: unknown): Promise<void> {
  const entry = { data, ts: Date.now() };
  memory.set(`${ns}:${key}`, entry);
  try {
    await platform().blobs.write(ns, `${fileKey(key)}.json`, JSON.stringify(entry));
  } catch {
    // the blob cache is a nicety, not a must
  }
}

/**
 * Which of network and cache gets asked first.
 *
 * - `network-first` — feeds. Keeps the home screen current (that is the demo's
 *   first impression) and falls back to the cache when the request fails.
 * - `cache-first` — article pages and other rarely changing resources. A fresh
 *   entry answers without touching the network at all.
 *
 * Both end at the same place: stale beats nothing. Deliberately not a query
 * library — the offline order has to be explicit and identical on both hosts.
 */
export type CachePolicy = 'network-first' | 'cache-first';

export interface FetchCachedOptions extends FetchTextOptions {
  policy?: CachePolicy;
  /** Freshness window for `cache-first` (ms). Default 10 minutes. */
  ttlMs?: number;
}

const TEXT_NS = 'http';
const DEFAULT_TTL_MS = 10 * 60 * 1000;

/** A text resource, cached under `key`. See `CachePolicy` for the two orders. */
export async function fetchCachedText(
  key: string,
  url: string,
  options: FetchCachedOptions = {},
): Promise<string> {
  const { policy = 'network-first', ttlMs = DEFAULT_TTL_MS, ...fetchOptions } = options;

  if (policy === 'cache-first') {
    const fresh = await getCached<string>(TEXT_NS, key, ttlMs);
    if (fresh !== null) return fresh;
    try {
      const body = await fetchText(url, fetchOptions);
      await setCached(TEXT_NS, key, body);
      return body;
    } catch (err) {
      const stale = await getStale<string>(TEXT_NS, key);
      if (stale !== null) return stale;
      throw err;
    }
  }

  try {
    const body = await fetchText(url, fetchOptions);
    await setCached(TEXT_NS, key, body);
    return body;
  } catch (err) {
    const stale = await getStale<string>(TEXT_NS, key);
    if (stale !== null) return stale;
    throw err;
  }
}

/** Test helper — clears the session layer (the BlobStore is owned by the host). */
export function clearMemoryCache(): void {
  memory.clear();
}
